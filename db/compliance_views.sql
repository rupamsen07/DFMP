-- 05_compliance_views.sql : withdrawal-period alerts and MRL compliance checks

-- Every drug exposure (treatment or feed) with the date each product becomes safe
CREATE VIEW v_drug_exposures AS
SELECT 'treatment' AS source, t.treatment_id AS source_id, t.group_id, t.drug_id,
       t.prescription_id, t.start_date, t.end_date
FROM treatments t
UNION ALL
SELECT 'feed', f.feed_id, f.group_id, f.drug_id, f.prescription_id, f.start_date, f.end_date
FROM feed_medication f;

CREATE VIEW v_withdrawal_clearance AS
SELECT e.source, e.source_id, e.group_id, g.group_label, g.farm_id,
       e.drug_id, wp.product_type, wp.withdrawal_days, e.end_date,
       (e.end_date + wp.withdrawal_days) AS safe_to_sell_from
FROM v_drug_exposures e
JOIN animal_groups g       ON g.group_id = e.group_id
JOIN withdrawal_periods wp ON wp.drug_id = e.drug_id AND wp.species_id = g.species_id;

-- Latest safe date per group and product (what the farmer's alert screen reads)
CREATE VIEW v_group_safe_dates AS
SELECT group_id, group_label, farm_id, product_type,
       MAX(safe_to_sell_from) AS safe_to_sell_from,
       MAX(safe_to_sell_from) > CURRENT_DATE AS in_withdrawal,
       GREATEST(MAX(safe_to_sell_from) - CURRENT_DATE, 0) AS days_remaining
FROM v_withdrawal_clearance
GROUP BY group_id, group_label, farm_id, product_type;

-- Sales made before the withdrawal period ended (MRL non-compliance)
CREATE VIEW v_sale_violations AS
SELECT s.sale_id, s.group_id, g.group_label, f.farm_name, f.district,
       s.product_type, s.sale_date, sd.safe_to_sell_from,
       (sd.safe_to_sell_from - s.sale_date) AS days_early
FROM sales s
JOIN animal_groups g     ON g.group_id = s.group_id
JOIN farms f             ON f.farm_id = g.farm_id
JOIN v_group_safe_dates sd ON sd.group_id = s.group_id AND sd.product_type = s.product_type
WHERE s.sale_date < sd.safe_to_sell_from;

-- Antimicrobial use with no veterinary prescription
CREATE VIEW v_unprescribed_use AS
SELECT e.source, e.source_id, e.group_id, g.group_label, f.farm_name, f.district,
       e.drug_id, d.drug_name, e.start_date, e.end_date
FROM v_drug_exposures e
JOIN animal_groups g ON g.group_id = e.group_id
JOIN farms f         ON f.farm_id = g.farm_id
JOIN drugs d         ON d.drug_id = e.drug_id
WHERE e.prescription_id IS NULL;
