export interface User {
  id: string;
  email: string;
  username: string | null;
  is_admin: boolean;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
  lua_api_access: boolean;
  current_hwid: string | null;
  hwid_reset_count: number;
  last_login_ip: string | null;
  last_login_at: string | null;
  browser_fingerprint: string | null;
  user_agent: string | null;
  screen_resolution: string | null;
  timezone: string | null;
  language: string | null;
  platform: string | null;
  last_fingerprint_data: Record<string, unknown> | null;
  show_email: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  payment_url: string;
  is_lifetime: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  is_maintenance: boolean;
  maintenance_started_at: string | null;
  week_price: number | null;
  month_price: number | null;
  lifetime_price: number | null;
  week_payment_url: string | null;
  month_payment_url: string | null;
  lifetime_payment_url: string | null;
  build_version: string | null;
  download_url: string | null;
  driver_download: string | null;
  global_compensation_hours: number;
  is_manual_payment_only: boolean;
  discord_required_message: string | null;
  created_at: string;
  updated_at: string;
  payment_methods?: ProductPaymentMethod[];
  pricing_plans?: PricingPlan[];
}

export interface ProductPaymentMethod {
  id: string;
  product_id: string;
  method_name: string;
  redirect_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  product_id: string;
  subscription_type: 'week' | 'month' | 'lifetime';
  starts_at: string;
  expires_at: string | null;
  is_lifetime: boolean;
  is_paused: boolean;
  paused_at: string | null;
  pause_duration_seconds: number;
  compensation_hours: number;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  subscription_type: 'week' | 'month' | 'lifetime';
  plan_id?: string;
  created_at: string;
  product?: Product;
}

export interface DebugLog {
  id: string;
  ip_address: string | null;
  hwid_list: string[] | null;
  matched_user_id: string | null;
  matched_hwid: string | null;
  log_type: string;
  details: Record<string, unknown> | null;
  is_banned: boolean;
  created_at: string;
  matched_user?: User;
}

export interface HwidHistory {
  id: string;
  user_id: string;
  hwid: string;
  recorded_at: string;
}

export interface SignupLink {
  id: string;
  token: string;
  created_by: string;
  used_by: string | null;
  is_used: boolean;
  expires_at: string;
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  name: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface BannedHwid {
  id: string;
  hwid: string;
  reason: string | null;
  banned_by: string | null;
  created_at: string;
}

export interface BannedIp {
  id: string;
  ip_address: string;
  reason: string | null;
  banned_by: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  session_token: string;
  ip_address: string | null;
  expires_at: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action_type: string;
  action_category: string;
  user_id: string | null;
  admin_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: User;
  admin?: User;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: User;
}

export interface SiteSetting {
  id: string;
  key: string;
  value: string | null;
  updated_by: string | null;
  updated_at: string;
}
