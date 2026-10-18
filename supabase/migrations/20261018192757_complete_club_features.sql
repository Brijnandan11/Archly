-- Additive extension of the private Express-managed schema.
ALTER TABLE club.events
 ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Other',
 ADD COLUMN IF NOT EXISTS tagline text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS tone text NOT NULL DEFAULT 'lime',
 ADD COLUMN IF NOT EXISTS eligibility text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS prizes text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS contact text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS participants integer NOT NULL DEFAULT 0 CHECK(participants>=0),
 ADD COLUMN IF NOT EXISTS rules jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(rules)='array'),
 ADD COLUMN IF NOT EXISTS guidelines jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(guidelines)='array'),
 ADD COLUMN IF NOT EXISTS objectives jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(objectives)='array'),
 ADD COLUMN IF NOT EXISTS highlights jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(highlights)='array'),
 ADD COLUMN IF NOT EXISTS schedule jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(schedule)='array'),
 ADD COLUMN IF NOT EXISTS faqs jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(faqs)='array'),
 ADD COLUMN IF NOT EXISTS winners jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(winners)='array'),
 ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(photos)='array' AND jsonb_array_length(photos)<=50);
ALTER TABLE club.event_leaders ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE club.participant_profiles
 ADD COLUMN IF NOT EXISTS roll_number text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS branch text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS github text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS linkedin text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS portfolio text NOT NULL DEFAULT '';
ALTER TABLE club.faculty
 ADD COLUMN IF NOT EXISTS year text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS qualification text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS interests text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS cv text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS source_url text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS portfolio text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS github text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS linkedin text NOT NULL DEFAULT '';
ALTER TABLE club.student_team
 ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS year text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS qualification text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS interests text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS cv text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS source_url text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS portfolio text NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS club.club_settings(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 settings jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(settings)='object'),
 updated_at timestamptz NOT NULL DEFAULT now(),updated_by uuid REFERENCES club.users(id) ON DELETE SET NULL
);
INSERT INTO club.club_settings(singleton) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS club.password_reset_tokens(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES club.users(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE,expires_at timestamptz NOT NULL,used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_reset_user_idx ON club.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS password_reset_expiry_idx ON club.password_reset_tokens(expires_at) WHERE used_at IS NULL;
ALTER TABLE club.club_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE club.password_reset_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON club.club_settings,club.password_reset_tokens FROM PUBLIC,anon,authenticated;
