-- Code Sastra is the single paid entry for its programme, including Bug Bounty.
BEGIN;
UPDATE club.events
SET status='CLOSED',presentation=COALESCE(presentation,'{}'::jsonb)||'{"registration_parent_slug":"code-sastra-2026","registration_pending":false}'::jsonb
WHERE slug='code-sastra-bug-bounty-2026';

WITH duplicates AS (
 UPDATE club.registrations r SET status='CANCELLED'
 FROM club.events child
 WHERE child.id=r.event_id AND child.slug='code-sastra-bug-bounty-2026'
   AND r.status IN ('PENDING','PENDING_PAYMENT','PAYMENT_REJECTED')
   AND EXISTS (
    SELECT 1 FROM club.registrations parent JOIN club.events event ON event.id=parent.event_id
    WHERE event.slug='code-sastra-2026' AND parent.user_id=r.user_id AND parent.status<>'CANCELLED'
   )
   AND NOT EXISTS (SELECT 1 FROM club.payments p WHERE p.registration_id=r.id AND p.status='PAID')
   AND NOT EXISTS (SELECT 1 FROM club.manual_payment_submissions p WHERE p.registration_id=r.id)
   AND NOT EXISTS (SELECT 1 FROM club.team_members member WHERE member.registration_id=r.id)
 RETURNING r.id
)
INSERT INTO club.audit_logs(actor_id,action,target_id,details)
SELECT NULL,'OPERATOR_CONSOLIDATED_PAYMENT_EVENT',id,
 '{"reason":"Use the existing Code Sastra registration for its programme; do not charge twice","payment_history_preserved":true}'::jsonb
FROM duplicates;
COMMIT;
