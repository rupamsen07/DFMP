-- 04_sample_data.sql : demo users, farms, groups, prescriptions, treatments, sales
INSERT INTO users (full_name, role, phone) VALUES
 ('Ramesh Meena',  'farmer',    '9000000001'),
 ('Sunita Devi',   'farmer',    '9000000002'),
 ('Dr. A. Sharma', 'vet',       '9000000003'),
 ('Inspector R. Singh', 'authority', '9000000004');

INSERT INTO farms (owner_id, farm_name, district, state) VALUES
 (1, 'Meena Dairy',   'Jaipur', 'Rajasthan'),
 (2, 'Devi Poultry',  'Ajmer',  'Rajasthan');

INSERT INTO animal_groups (farm_id, species_id, group_label, head_count) VALUES
 (1, 1, 'Dairy herd A',   25),
 (1, 1, 'Heifers B',      12),
 (2, 2, 'Broiler batch 7', 500);

INSERT INTO prescriptions (vet_id, group_id, drug_id, diagnosis, issued_on, dose_mg_per_kg, duration_days) VALUES
 (3, 1, 'DRUG-01', 'Respiratory infection', CURRENT_DATE - 10, 10, 3),
 (3, 3, 'DRUG-03', 'Colibacillosis',        CURRENT_DATE - 5,  10, 5);

INSERT INTO treatments (group_id, drug_id, prescription_id, administered_by, route, dose_mg_per_kg,
                        frequency_per_day, start_date, end_date, reason) VALUES
 (1, 'DRUG-01', 1,    3, 'injection', 10, 1, CURRENT_DATE - 10, CURRENT_DATE - 8, 'Respiratory infection'),
 (2, 'DRUG-02', NULL, 1, 'injection', 8,  2, CURRENT_DATE - 2,  CURRENT_DATE - 1, 'Mastitis (self-treated)');

INSERT INTO feed_medication (group_id, drug_id, prescription_id, inclusion_g_per_tonne, start_date, end_date, reason) VALUES
 (3, 'DRUG-03', 2, 150, CURRENT_DATE - 5, CURRENT_DATE - 1, 'Colibacillosis control');

INSERT INTO sales (group_id, product_type, sale_date, quantity) VALUES
 (1, 'milk', CURRENT_DATE,     200),   -- ends day -8, +7 days => cleared
 (3, 'meat', CURRENT_DATE,     300),   -- ends day -1, +14 days => VIOLATION
 (2, 'milk', CURRENT_DATE,      80);   -- unprescribed, still in withdrawal => VIOLATION
