-- 07_audit_integrity.sql : tamper-evident, hash-chained audit log (blockchain-style integrity)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE audit_log (
    audit_id   BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(40) NOT NULL,
    action     VARCHAR(10) NOT NULL,
    row_data   JSONB NOT NULL,
    logged_at  TIMESTAMP NOT NULL,
    prev_hash  TEXT,
    row_hash   TEXT NOT NULL
);

CREATE OR REPLACE FUNCTION fn_audit() RETURNS trigger AS $$
DECLARE
    prev TEXT;
    ts   TIMESTAMP := clock_timestamp();
    data JSONB := to_jsonb(NEW);
BEGIN
    LOCK TABLE audit_log IN SHARE ROW EXCLUSIVE MODE;  -- keep the chain strictly ordered
    SELECT row_hash INTO prev FROM audit_log ORDER BY audit_id DESC LIMIT 1;
    INSERT INTO audit_log (table_name, action, row_data, logged_at, prev_hash, row_hash)
    VALUES (TG_TABLE_NAME, TG_OP, data, ts, prev,
            encode(digest(coalesce(prev,'') || TG_TABLE_NAME || TG_OP || data::text || ts::text,
                          'sha256'), 'hex'));
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_prescriptions AFTER INSERT OR UPDATE ON prescriptions
    FOR EACH ROW EXECUTE FUNCTION fn_audit();
CREATE TRIGGER trg_audit_treatments    AFTER INSERT OR UPDATE ON treatments
    FOR EACH ROW EXECUTE FUNCTION fn_audit();
CREATE TRIGGER trg_audit_feed          AFTER INSERT OR UPDATE ON feed_medication
    FOR EACH ROW EXECUTE FUNCTION fn_audit();
CREATE TRIGGER trg_audit_sales         AFTER INSERT OR UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION fn_audit();

-- Block edits/deletes of the log itself
CREATE OR REPLACE FUNCTION fn_audit_immutable() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'audit_log is append-only'; END $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_audit_lock BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION fn_audit_immutable();

-- Integrity check: any row returned means the chain has been tampered with
CREATE VIEW v_audit_chain_check AS
SELECT audit_id, table_name,
       prev_hash IS DISTINCT FROM LAG(row_hash) OVER (ORDER BY audit_id) AS link_broken,
       row_hash <> encode(digest(coalesce(prev_hash,'') || table_name || action ||
                                 row_data::text || logged_at::text, 'sha256'), 'hex') AS hash_mismatch
FROM audit_log;
-- SELECT * FROM v_audit_chain_check WHERE link_broken OR hash_mismatch;
