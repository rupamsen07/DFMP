-- 06_analytics_queries.sql : AMU trend queries and dashboard views

-- Monthly AMU events by species
CREATE VIEW v_amu_by_species_month AS
SELECT sp.name AS species, date_trunc('month', e.start_date)::date AS month,
       COUNT(*) AS treatment_events
FROM v_drug_exposures e
JOIN animal_groups g ON g.group_id = e.group_id
JOIN species sp      ON sp.species_id = g.species_id
GROUP BY sp.name, date_trunc('month', e.start_date);

-- AMU by region (district) and drug category
CREATE VIEW v_amu_by_region_category AS
SELECT f.state, f.district, d.category, COUNT(*) AS treatment_events
FROM v_drug_exposures e
JOIN animal_groups g ON g.group_id = e.group_id
JOIN farms f         ON f.farm_id = g.farm_id
JOIN drugs d         ON d.drug_id = e.drug_id
GROUP BY f.state, f.district, d.category;

-- Prescription compliance rate per farm
CREATE VIEW v_farm_prescription_compliance AS
SELECT f.farm_id, f.farm_name,
       COUNT(*) AS total_uses,
       COUNT(e.prescription_id) AS prescribed_uses,
       ROUND(100.0 * COUNT(e.prescription_id) / COUNT(*), 1) AS prescribed_pct
FROM v_drug_exposures e
JOIN animal_groups g ON g.group_id = e.group_id
JOIN farms f         ON f.farm_id = g.farm_id
GROUP BY f.farm_id, f.farm_name;

-- Most-used drugs, with critically important classes highlighted for stewardship
SELECT d.drug_name, d.category, COUNT(*) AS uses
FROM v_drug_exposures e JOIN drugs d ON d.drug_id = e.drug_id
GROUP BY d.drug_name, d.category
ORDER BY uses DESC;
