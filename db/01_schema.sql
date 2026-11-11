-- 01_schema.sql : core entities for the Digital Farm Management Portal (PostgreSQL)
CREATE TABLE users (
    user_id     SERIAL PRIMARY KEY,
    full_name   VARCHAR(100) NOT NULL,
    role        VARCHAR(15)  NOT NULL CHECK (role IN ('farmer', 'vet', 'authority')),
    phone       VARCHAR(15),
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE farms (
    farm_id     SERIAL PRIMARY KEY,
    owner_id    INT NOT NULL REFERENCES users(user_id),
    farm_name   VARCHAR(100) NOT NULL,
    district    VARCHAR(60)  NOT NULL,
    state       VARCHAR(60)  NOT NULL
);

CREATE TABLE species (
    species_id  SERIAL PRIMARY KEY,
    name        VARCHAR(40) NOT NULL UNIQUE
);

-- A herd/flock/batch of animals treated and sold together
CREATE TABLE animal_groups (
    group_id    SERIAL PRIMARY KEY,
    farm_id     INT NOT NULL REFERENCES farms(farm_id),
    species_id  INT NOT NULL REFERENCES species(species_id),
    group_label VARCHAR(60) NOT NULL,
    head_count  INT NOT NULL CHECK (head_count > 0),
    UNIQUE (farm_id, group_label)
);

CREATE INDEX idx_farms_district ON farms(district);
CREATE INDEX idx_groups_farm    ON animal_groups(farm_id);
