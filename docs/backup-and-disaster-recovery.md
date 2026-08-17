# Backup and Disaster Recovery

Production setup must enable Supabase-managed backups and, where supported, point-in-time recovery. The database owner must define approved RPO/RTO after plan and workload review; no unverified target is promised here.

Quarterly procedure: declare incident; stop unsafe writers/automation; preserve logs; select recovery point; restore to an isolated project; apply and verify migration history; run RLS/security and reconciliation checks; rotate exposed credentials; obtain incident-owner approval; cut traffic; monitor; document outcome. Never test restore by overwriting the only production database.

Database migrations use forward repairs; destructive rollback requires an authored, reviewed migration and backup. Deployment rollback uses a known-good immutable Netlify artifact/config. Storage objects need inventory, versioning/backup decisions and tenant reconciliation. Exercise database restore, application rollback and incident escalation before launch.
