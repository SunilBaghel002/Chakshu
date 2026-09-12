-- 003_audit_triggers.sql
-- Append-only integrity triggers for decision and audit_log tables

CREATE OR REPLACE FUNCTION reject_update_or_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Chakshu audit invariant violation: UPDATE and DELETE operations are forbidden on append-only audit tables (%).', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- Apply to decision table
DROP TRIGGER IF EXISTS trg_decision_append_only ON decision;
CREATE TRIGGER trg_decision_append_only
BEFORE UPDATE OR DELETE ON decision
FOR EACH ROW
EXECUTE FUNCTION reject_update_or_delete();

-- Apply to audit_log table
DROP TRIGGER IF EXISTS trg_audit_log_append_only ON audit_log;
CREATE TRIGGER trg_audit_log_append_only
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW
EXECUTE FUNCTION reject_update_or_delete();
