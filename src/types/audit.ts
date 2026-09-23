export interface AuditLog {
  id: string;
  organization_id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  entity: string;
  entity_id: string;
  previous_data?: Record<string, any>;
  new_data?: Record<string, any>;
  reason?: string;
  ip_address?: string;
  created_at: string;
}
