-- 03_seed_reference.sql : reference data (DEMO VALUES ONLY - not official MRL/withdrawal figures)
INSERT INTO species (name) VALUES ('Cattle'), ('Poultry'), ('Goat');

INSERT INTO drugs (drug_id, drug_name, category, standard_withdrawal_days, mrl_ppb) VALUES
 ('DRUG-01', 'Oxytetracycline', 'Tetracycline',    7, 100),
 ('DRUG-02', 'Amoxicillin',     'Beta-lactam',     3,   4),
 ('DRUG-03', 'Enrofloxacin',    'Fluoroquinolone', 14, 100),
 ('DRUG-04', 'Gentamicin',      'Aminoglycoside',  40, 100);

INSERT INTO withdrawal_periods (drug_id, species_id, product_type, withdrawal_days)
SELECT 'DRUG-01', species_id, 'milk', 7  FROM species WHERE name = 'Cattle' UNION ALL
SELECT 'DRUG-01', species_id, 'meat', 28 FROM species WHERE name = 'Cattle' UNION ALL
SELECT 'DRUG-02', species_id, 'milk', 3  FROM species WHERE name = 'Cattle' UNION ALL
SELECT 'DRUG-02', species_id, 'milk', 3  FROM species WHERE name = 'Goat'   UNION ALL
SELECT 'DRUG-03', species_id, 'meat', 14 FROM species WHERE name = 'Poultry' UNION ALL
SELECT 'DRUG-03', species_id, 'eggs', 14 FROM species WHERE name = 'Poultry' UNION ALL
SELECT 'DRUG-04', species_id, 'meat', 40 FROM species WHERE name = 'Cattle';
