ALTER TABLE club.faculty
  ADD COLUMN IF NOT EXISTS college text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source_retrieved text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS placeholder boolean NOT NULL DEFAULT false;

ALTER TABLE club.student_team
  ADD COLUMN IF NOT EXISTS college text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source_retrieved text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS placeholder boolean NOT NULL DEFAULT false;
