-- Additive migration: safe to apply to the existing Coding Club project.
CREATE TABLE IF NOT EXISTS club.leader_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), leader_id uuid NOT NULL REFERENCES club.event_leaders(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leader_sessions_live_idx ON club.leader_sessions(leader_id,expires_at) WHERE revoked_at IS NULL;
CREATE TABLE IF NOT EXISTS club.notification_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL, recipient text NOT NULL,
 subject text NOT NULL, payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SENDING','SENT','FAILED')),
 attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
 claimed_at timestamptz, sent_at timestamptz, last_error text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_due_idx ON club.notification_outbox(next_attempt_at) WHERE status IN ('PENDING','FAILED');
CREATE TABLE IF NOT EXISTS club.payment_refunds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid NOT NULL REFERENCES club.payments(id),
 gateway_refund_id text UNIQUE, amount integer NOT NULL CHECK(amount>0),
 status text NOT NULL DEFAULT 'PROCESSING' CHECK(status IN ('PROCESSING','PROCESSED','FAILED')),
 created_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_refunds_one_processing ON club.payment_refunds(payment_id) WHERE status='PROCESSING';
CREATE INDEX IF NOT EXISTS registration_status_event_idx ON club.registrations(event_id,status);
CREATE INDEX IF NOT EXISTS payments_registration_idx ON club.payments(registration_id,status);
CREATE INDEX IF NOT EXISTS registrations_owner_idx ON club.registrations(user_id,created_at);
DO $$ DECLARE t record; BEGIN FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='club' LOOP EXECUTE format('ALTER TABLE club.%I ENABLE ROW LEVEL SECURITY',t.tablename); END LOOP; END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA club FROM PUBLIC, anon, authenticated;
