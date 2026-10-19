-- Public poster details can be announced before registration logistics are final.
ALTER TABLE club.events ADD COLUMN IF NOT EXISTS presentation jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE club.events DROP CONSTRAINT IF EXISTS events_presentation_object;
ALTER TABLE club.events ADD CONSTRAINT events_presentation_object CHECK(jsonb_typeof(presentation)='object');
