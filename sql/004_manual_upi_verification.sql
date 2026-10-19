-- Manual UPI evidence is kept separately from legacy payment history.
ALTER TABLE club.registrations ADD COLUMN IF NOT EXISTS registration_ref text UNIQUE;
ALTER TABLE club.registrations DROP CONSTRAINT IF EXISTS registrations_status_check;
ALTER TABLE club.registrations ADD CONSTRAINT registrations_status_check CHECK(status IN ('PENDING','PENDING_PAYMENT','PENDING_VERIFICATION','CONFIRMED','PAYMENT_REJECTED','CANCELLED'));
-- Carry forward unpaid legacy registrations into the QR payment flow. Keep any
-- registration with a verified legacy gateway payment untouched for history.
UPDATE club.registrations r
SET status='PENDING_PAYMENT', registration_code=NULL,
    registration_ref=COALESCE(r.registration_ref,'UPI-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)))
FROM club.events e
WHERE e.id=r.event_id AND e.registration_fee>0 AND r.status='PENDING'
  AND NOT EXISTS (SELECT 1 FROM club.payments p WHERE p.registration_id=r.id AND p.status='PAID');
CREATE SEQUENCE IF NOT EXISTS club.cc_payment_registration_seq;
CREATE TABLE IF NOT EXISTS club.manual_payment_submissions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), registration_id uuid NOT NULL REFERENCES club.registrations(id),
 expected_amount integer NOT NULL CHECK(expected_amount>0), currency text NOT NULL DEFAULT 'INR', claimed_amount integer,
 utr text NOT NULL, ocr_raw_text text NOT NULL DEFAULT '', ocr_confidence numeric(5,4), ocr_candidates jsonb NOT NULL DEFAULT '[]'::jsonb, ocr_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
 screenshot_storage_path text NOT NULL, screenshot_sha256 text NOT NULL,
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','UNDER_REVIEW','APPROVED','REJECTED')),
 submitted_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz, reviewed_by uuid REFERENCES club.users(id),
 review_notes text NOT NULL DEFAULT '', rejection_reason text NOT NULL DEFAULT '', verified_bank_reference text,
 claimed_paid_at timestamptz, duplicate_screenshot boolean NOT NULL DEFAULT false, duplicate_utr boolean NOT NULL DEFAULT false,
 amount_mismatch boolean NOT NULL DEFAULT false, unreadable_screenshot boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS manual_payments_status_time_idx ON club.manual_payment_submissions(status,submitted_at DESC);
CREATE INDEX IF NOT EXISTS manual_payments_registration_idx ON club.manual_payment_submissions(registration_id,created_at DESC);
CREATE INDEX IF NOT EXISTS manual_payments_sha_idx ON club.manual_payment_submissions(screenshot_sha256);
CREATE UNIQUE INDEX IF NOT EXISTS manual_payments_verified_utr_unique ON club.manual_payment_submissions(upper(regexp_replace(verified_bank_reference,'[^A-Za-z0-9]','','g'))) WHERE status='APPROVED';
ALTER TABLE club.manual_payment_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON club.manual_payment_submissions FROM PUBLIC,anon,authenticated;

ALTER TABLE club.notification_outbox ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE UNIQUE INDEX IF NOT EXISTS notification_outbox_dedupe_unique ON club.notification_outbox(dedupe_key) WHERE dedupe_key IS NOT NULL;

-- Store only displayable payment settings. The QR URL must point to the private bucket and is served through an authorized endpoint.
INSERT INTO club.club_settings(singleton,settings) VALUES(true,'{"upi_payment":{"instructions":"Pay the exact amount shown, then upload your payment confirmation screenshot. Your registration is not confirmed until the team verifies the credit in its bank transaction history."}}'::jsonb)
ON CONFLICT(singleton) DO UPDATE SET settings=CASE WHEN club.club_settings.settings ? 'upi_payment' THEN club.club_settings.settings ELSE club.club_settings.settings||EXCLUDED.settings END;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('private-payment-evidence','private-payment-evidence',false,5242880,ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=5242880,allowed_mime_types=ARRAY['image/png','image/jpeg','image/webp'];
