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

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
