require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const port = 3000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.get("/api/health", (request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/drugs", async (request, response) => {
  if (!process.env.DATABASE_URL) {
    return response.status(503).json({
      error: "Database is not configured. Set DATABASE_URL in your .env file."
    });
  }

  try {
    const { rows } = await pool.query(`
      SELECT d.drug_id AS "drugId",
             d.drug_name AS name,
             d.category,
             d.standard_withdrawal_days AS "standardWithdrawalDays",
             d.mrl_ppb AS "mrlPpb",
             COALESCE(
               array_agg(DISTINCT wp.product_type::text)
                 FILTER (WHERE wp.product_type IS NOT NULL),
               ARRAY[]::text[]
             ) AS "targetProducts"
      FROM drugs d
      LEFT JOIN withdrawal_periods wp ON wp.drug_id = d.drug_id
      GROUP BY d.drug_id, d.drug_name, d.category,
               d.standard_withdrawal_days, d.mrl_ppb
      ORDER BY d.drug_id
    `);

    response.json(rows.map((drug) => ({
      drugId: drug.drugId,
      name: drug.name,
      category: drug.category,
      standardWithdrawalDays: drug.standardWithdrawalDays,
      mrlLimit: `${Number(drug.mrlPpb)} ppb`,
      targetProducts: drug.targetProducts.map(
        (product) => product[0].toUpperCase() + product.slice(1)
      ),
      demoOnly: true
    })));
  } catch (error) {
    console.error("Failed to fetch drugs from the database:", error);
    response.status(500).json({ error: "Failed to fetch drugs." });
  }
});

app.get("/api/treatments", async (request, response) => {
  const { status } = request.query;
  const allowedStatuses = ["QUARANTINED", "COMPLIANT"];

  if (status !== undefined && (typeof status !== "string" || !allowedStatuses.includes(status))) {
    return response.status(400).json({
      error: "Status must be QUARANTINED or COMPLIANT."
    });
  }

  if (!process.env.DATABASE_URL) {
    return response.status(503).json({
      error: "Database is not configured. Set DATABASE_URL in your .env file."
    });
  }

  try {
    const { rows } = await pool.query(`
      SELECT t.treatment_id AS "treatmentId",
             t.group_id AS "groupId",
             c.group_label AS "groupLabel",
             d.drug_id AS "drugId",
             d.drug_name AS "drugName",
             c.product_type AS "productType",
             t.route,
             t.dose_mg_per_kg AS "doseMgPerKg",
             t.frequency_per_day AS "frequencyPerDay",
             to_char(t.start_date, 'YYYY-MM-DD') AS "startDate",
             to_char(t.end_date, 'YYYY-MM-DD') AS "endDate",
             to_char(c.safe_to_sell_from, 'YYYY-MM-DD') AS "safeToSellFrom",
             CASE
               WHEN c.safe_to_sell_from > CURRENT_DATE THEN 'QUARANTINED'
               ELSE 'COMPLIANT'
             END AS status,
             GREATEST(c.safe_to_sell_from - CURRENT_DATE, 0) AS "daysRemaining"
      FROM v_withdrawal_clearance c
      JOIN treatments t ON t.treatment_id = c.source_id
      JOIN drugs d ON d.drug_id = c.drug_id
      WHERE c.source = 'treatment'
        AND ($1::text IS NULL OR
             CASE
               WHEN c.safe_to_sell_from > CURRENT_DATE THEN 'QUARANTINED'
               ELSE 'COMPLIANT'
             END = $1)
      ORDER BY t.treatment_id, c.product_type
    `, [status ?? null]);

    response.json(rows);
  } catch (error) {
    console.error("Failed to fetch treatments from the database:", error);
    response.status(500).json({ error: "Failed to fetch treatments." });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
