export const membershipSelect = 'id,tenant_id,user_id,role,status,member_profile:profiles!tenant_memberships_user_id_fkey(display_name)'

export const auditEventSelect = 'id,tenant_id,event_type,entity_type,entity_id,occurred_at,actor_profile:profiles!audit_events_actor_user_id_fkey(display_name)'
