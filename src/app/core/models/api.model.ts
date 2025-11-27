export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  isAdmin: boolean;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface DashboardData {
  client: any;
  stats: any;
  sms_logs: any[];
  airtime_logs: any[];
  ussd_logs: any[];
  transactions: any[];
  api_keys: any[];
}

export interface SendSmsRequest {
  to: string;
  message: string;
}

export interface SendAirtimeRequest {
  phoneNumber: string;
  amount: string;
}

export interface PaymentInitRequest {
  amount: string;
}

export interface ApiKeyRequest {
  key_name: string;
}

export interface MenuItemRequest {
  parent_item_id: number | null;
  option_trigger: string;
  response_type: string;
  response_text: string;
}

export interface TeamInviteRequest {
  email: string;
  role_id: number;
}

export interface ManualTopupRequest {
  clientId: number;
  amount: number;
}

export interface ManualTransaction {
  clientId: number;
  type: string;
  amount: number;
  reason: string;
}
export interface SendAnnouncementRequest {
  subject: string;
  message: string;
}

export interface AdminStats {
  clientCount: number;
  tokensPurchased: string;
  smsSentCount: number;
}

export interface PricingTiersResponse {
  id: number;
  tier_name: string;
  sms_price: number;
  ussd_multiplier: number;
}

export interface PricingTierPrices {
  sms_price: string;
  ussd_multiplier: string;
}

export interface ClientsResponse {
  id: number;
  name: string;
  email: string;
  status: string;
  is_admin: number;
  created_at: Date;
  token_balance: number;
  sender_id: null | string;
  ussd_code: null | string;
  pricing_tier_id: number | null;
  pricing_tier_name: null | string;
}

export interface UpdateClientDetails {
  name: string;
  ussd_code?: string;
  sender_id?: string;
}

export interface LogsResponse {
  smsLogs: any[];
  airtimeLogs: any[];
  ussdLogs: UssdLog[];
  transactions: Transaction[];
}

export interface Transaction {
  id: number;
  client_id: number;
  reference: string;
  amount: string;
  tokens_purchased: number;
  status: string;
  gateway: string;
  notes: null | string;
  created_at: Date;
  client_name: string;
}

export interface UssdLog {
  id: number;
  client_id: number;
  session_id: string;
  phone_number: string;
  network_code: string;
  final_user_string: null | string;
  duration_seconds: number | null;
  session_cost: string | null;
  client_price: null | string;
  status: string;
  logged_at: Date;
  client_name: string;
}
