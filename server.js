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
    const result = await pool.query(`
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

    const drugs = result.rows.map((drug) => {
      const targetProducts = drug.targetProducts.map((product) => {
        return product[0].toUpperCase() + product.slice(1);
      });

      return {
        drugId: drug.drugId,
        name: drug.name,
        category: drug.category,
        standardWithdrawalDays: drug.standardWithdrawalDays,
        mrlLimit: `${Number(drug.mrlPpb)} ppb`,
        targetProducts,
        demoOnly: true
      };
    });

    response.json(drugs);
  } catch (error) {
    console.error("Failed to fetch drugs from the database:", error);
    response.status(500).json({ error: "Failed to fetch drugs." });
  }
});

app.get("/api/animal-groups", async (request, response) => {
  if (!process.env.DATABASE_URL) {
    return response.status(503).json({
      error: "Database is not configured. Set DATABASE_URL in your .env file."
    });
  }

  try {
    const result = await pool.query(`
      SELECT g.group_id AS "groupId",
             g.group_label AS "groupLabel",
             sp.name AS species,
             f.farm_name AS "farmName",
             g.head_count AS "headCount"
      FROM animal_groups g
      JOIN species sp ON sp.species_id = g.species_id
      JOIN farms f ON f.farm_id = g.farm_id
      ORDER BY f.farm_name, g.group_label
    `);

    response.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch animal groups from the database:", error);
    response.status(500).json({ error: "Failed to fetch animal groups." });
  }
});

app.get("/api/treatment-users", async (request, response) => {
  if (!process.env.DATABASE_URL) {
    return response.status(503).json({
      error: "Database is not configured. Set DATABASE_URL in your .env file."
    });
  }

  try {
    const result = await pool.query(`
      SELECT user_id AS "userId",
             full_name AS "fullName",
             role
      FROM users
      WHERE role IN ('farmer', 'vet')
      ORDER BY full_name
    `);

    response.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch treatment users from the database:", error);
    response.status(500).json({ error: "Failed to fetch treatment users." });
  }
});

app.get("/api/stats", async (request, response) => {
  if (!process.env.DATABASE_URL) {
    return response.status(503).json({
      error: "Database is not configured. Set DATABASE_URL in your .env file."
    });
  }

  try {
    const result = await pool.query(`
      WITH product_status AS (
        SELECT in_withdrawal
        FROM v_group_safe_dates
      ),
      counts AS (
        SELECT COUNT(*) FILTER (WHERE in_withdrawal) AS "activeQuarantine",
               COUNT(*) FILTER (WHERE NOT in_withdrawal) AS "totalCleared",
               COUNT(*) AS "totalProducts"
        FROM product_status
      )
      SELECT
        (SELECT COALESCE(SUM(head_count), 0)::int FROM animal_groups) AS "totalAnimals",
        "activeQuarantine",
        "totalCleared",
        CASE
          WHEN "totalProducts" = 0 THEN 0
          ELSE ROUND(100.0 * "totalCleared" / "totalProducts", 1)
        END AS "complianceRate"
      FROM counts
    `);

    const stats = result.rows[0];
    response.json({
      totalAnimals: Number(stats.totalAnimals),
      activeQuarantine: Number(stats.activeQuarantine),
      totalCleared: Number(stats.totalCleared),
      complianceRate: Number(stats.complianceRate)
    });
  } catch (error) {
    console.error("Failed to fetch stats from the database:", error);
    response.status(500).json({ error: "Failed to fetch stats." });
  }
});

app.get("/api/sales/violations", async (request, response) => {
  if (!process.env.DATABASE_URL) {
    return response.status(503).json({
      error: "Database is not configured. Set DATABASE_URL in your .env file."
    });
  }

  try {
    const result = await pool.query(`
      SELECT sale_id AS "saleId",
             group_id AS "groupId",
             group_label AS "groupLabel",
             farm_name AS "farmName",
             district,
             product_type AS "productType",
             to_char(sale_date, 'YYYY-MM-DD') AS "saleDate",
             to_char(safe_to_sell_from, 'YYYY-MM-DD') AS "safeToSellFrom",
             days_early AS "daysEarly"
      FROM v_sale_violations
      ORDER BY sale_date DESC, sale_id
    `);

    response.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch sale violations from the database:", error);
    response.status(500).json({ error: "Failed to fetch sale violations." });
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
    const result = await pool.query(`
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

    response.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch treatments from the database:", error);
    response.status(500).json({ error: "Failed to fetch treatments." });
  }
});

app.post("/api/treatments", async (request, response) => {
  const {
    groupId,
    drugId,
    prescriptionId = null,
    administeredBy,
    route,
    doseMgPerKg,
    frequencyPerDay,
    startDate,
    endDate,
    reason
  } = request.body ?? {};

  const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

  const isValidDate = (value) => {
    if (typeof value !== "string") return false;

    const date = new Date(value);
    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  };

  const validIds =
    isPositiveInteger(groupId) &&
    typeof drugId === "string" &&
    drugId.trim() !== "" &&
    (prescriptionId === null || isPositiveInteger(prescriptionId)) &&
    isPositiveInteger(administeredBy);

  const validTreatmentDetails =
    ["injection", "oral", "intramammary"].includes(route) &&
    typeof doseMgPerKg === "number" &&
    Number.isFinite(doseMgPerKg) &&
    doseMgPerKg > 0 &&
    isPositiveInteger(frequencyPerDay);

  const validDates =
    isValidDate(startDate) &&
    isValidDate(endDate) &&
    endDate >= startDate;

  const validReason =
    typeof reason === "string" &&
    reason.trim() !== "" &&
    reason.length <= 200;

  if (
    !validIds ||
    !validTreatmentDetails ||
    !validDates ||
    !validReason
  ) {
    return response.status(400).json({
      error: "Provide valid groupId, drugId, administeredBy, route, doseMgPerKg, frequencyPerDay, startDate, endDate, and reason. prescriptionId is optional."
    });
  }

  if (!process.env.DATABASE_URL) {
    return response.status(503).json({
      error: "Database is not configured. Set DATABASE_URL in your .env file."
    });
  }

  try {
    const result = await pool.query(`
      INSERT INTO treatments (
        group_id, drug_id, prescription_id, administered_by, route,
        dose_mg_per_kg, frequency_per_day, start_date, end_date, reason
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING treatment_id AS "treatmentId",
                group_id AS "groupId",
                drug_id AS "drugId",
                prescription_id AS "prescriptionId",
                administered_by AS "administeredBy",
                route,
                dose_mg_per_kg AS "doseMgPerKg",
                frequency_per_day AS "frequencyPerDay",
                to_char(start_date, 'YYYY-MM-DD') AS "startDate",
                to_char(end_date, 'YYYY-MM-DD') AS "endDate",
                reason
    `, [
      groupId,
      drugId.trim(),
      prescriptionId,
      administeredBy,
      route,
      doseMgPerKg,
      frequencyPerDay,
      startDate,
      endDate,
      reason.trim()
    ]);

    response.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23503") {
      return response.status(400).json({
        error: "groupId, drugId, administeredBy, and prescriptionId must reference existing records."
      });
    }

    console.error("Failed to create treatment:", error);
    response.status(500).json({ error: "Failed to create treatment." });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
