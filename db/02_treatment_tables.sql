-- 02_treatment_tables.sql : drugs, prescriptions, treatments, feed medication, sales
CREATE TABLE drugs (
    drug_id                  VARCHAR(10) PRIMARY KEY,      -- matches DRUG-01.. in server.js
    drug_name                VARCHAR(60) NOT NULL UNIQUE,
    category                 VARCHAR(40) NOT NULL,
    standard_withdrawal_days INT NOT NULL CHECK (standard_withdrawal_days >= 0),
    mrl_ppb                  NUMERIC(8,2) NOT NULL CHECK (mrl_ppb > 0)
);

-- Withdrawal period / MRL per drug, species and product (milk, meat, eggs)
CREATE TABLE withdrawal_periods (
    drug_id         VARCHAR(10) NOT NULL REFERENCES drugs(drug_id),
    species_id      INT NOT NULL REFERENCES species(species_id),
    product_type    VARCHAR(10) NOT NULL CHECK (product_type IN ('milk', 'meat', 'eggs')),
    withdrawal_days INT NOT NULL CHECK (withdrawal_days >= 0),
    PRIMARY KEY (drug_id, species_id, product_type)
);

CREATE TABLE prescriptions (
    prescription_id SERIAL PRIMARY KEY,
    vet_id          INT NOT NULL REFERENCES users(user_id),
    group_id        INT NOT NULL REFERENCES animal_groups(group_id),
    drug_id         VARCHAR(10) NOT NULL REFERENCES drugs(drug_id),
    diagnosis       VARCHAR(200) NOT NULL,
    issued_on       DATE NOT NULL,
    dose_mg_per_kg  NUMERIC(8,2) NOT NULL CHECK (dose_mg_per_kg > 0),
    duration_days   INT NOT NULL CHECK (duration_days > 0)
);

-- Individual treatment events (injection / oral). prescription_id NULL = unprescribed use
CREATE TABLE treatments (
    treatment_id      SERIAL PRIMARY KEY,
    group_id          INT NOT NULL REFERENCES animal_groups(group_id),
    drug_id           VARCHAR(10) NOT NULL REFERENCES drugs(drug_id),
    prescription_id   INT REFERENCES prescriptions(prescription_id),
    administered_by   INT NOT NULL REFERENCES users(user_id),
    route             VARCHAR(15) NOT NULL CHECK (route IN ('injection', 'oral', 'intramammary')),
    dose_mg_per_kg    NUMERIC(8,2) NOT NULL CHECK (dose_mg_per_kg > 0),
    frequency_per_day INT NOT NULL CHECK (frequency_per_day > 0),
    start_date        DATE NOT NULL,
    end_date          DATE NOT NULL,
    reason            VARCHAR(200) NOT NULL,
    CHECK (end_date >= start_date)
);

-- Antimicrobials given through feed
CREATE TABLE feed_medication (
    feed_id                 SERIAL PRIMARY KEY,
    group_id                INT NOT NULL REFERENCES animal_groups(group_id),
    drug_id                 VARCHAR(10) NOT NULL REFERENCES drugs(drug_id),
    prescription_id         INT REFERENCES prescriptions(prescription_id),
    inclusion_g_per_tonne   NUMERIC(8,2) NOT NULL CHECK (inclusion_g_per_tonne > 0),
    start_date              DATE NOT NULL,
    end_date                DATE NOT NULL,
    reason                  VARCHAR(200) NOT NULL,
    CHECK (end_date >= start_date)
);

CREATE TABLE sales (
    sale_id       SERIAL PRIMARY KEY,
    group_id      INT NOT NULL REFERENCES animal_groups(group_id),
    product_type  VARCHAR(10) NOT NULL CHECK (product_type IN ('milk', 'meat', 'eggs')),
    sale_date     DATE NOT NULL,
    quantity      NUMERIC(10,2) NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_treat_group ON treatments(group_id, end_date);
CREATE INDEX idx_feed_group  ON feed_medication(group_id, end_date);
CREATE INDEX idx_sales_group ON sales(group_id, sale_date);
