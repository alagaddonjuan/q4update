export interface LoginRequest {
  email: string;
  password: string;
  token?: string;
}

export interface LoginResponse {
  message: string;
  token?: string;
  user?: User;
  requires_2fa?: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role_id: number;
  is_admin: number;
  is_2fa_enabled: number;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

// export interface DashboardData {
//   client: any;
//   stats: any;
//   sms_logs: any[];
//   airtime_logs: any[];
//   ussd_logs: any[];
//   transactions: any[];
//   api_keys: any[];
// }

export interface DashboardData {
  client: any;
  role: string;
  api_key: string;
  is_2fa_enabled: number;
  transactions?: any[];
  stats: stats;

}

export interface stats {
  users: number;
  sms: number;
  revenue: string;
}

export interface DashboardDataResponse {
  role: string;
  client: Client;
  stats: Stats;
  chartLabels: string[];
  ussdChartValues: number[];
  smsChartValues: number[];
}

export interface Client {
  id: number;
  name: string;
  email: string;
  balance: number;
  token_balance: number;
  ussd_code: string;
  api_key: string;
  sms_rate: number;
  is_2fa_enabled: number;
}

export interface Stats {
  totalSmsSent: number;
  sms: number;
}

export interface SendSmsRequest {
  to: string;
  message: string;
}

export interface SendAirtimeRequest {
  phoneNumber: string;
  amount: string;
  network?: string;
}

export interface PaymentInitRequest {
  amount: string;
}

export interface ApiKeyRequest {
  key_name: string;
}

export interface CreateMenuRequest {
  menu_name: string;
  ussd_code: string;
}

export interface MenuItemRequest {
  option_number?: string;
  option_trigger: string;
  option_text?: string;
  response_text: string;
  action_type?: string;
  response_type: string;
  parent_item_id?: number | null;
}

export interface TeamInviteRequest {
  email: string;
  role_id: number;
}

export interface RolesResponse {
  id: number;
  name: string;
}

export interface TeamMemberResponse {
  id?: string;
  name: string;
  email: string;
  role_id: number;
  status: string;
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
  stats: Stats;
  recentTransactions: RecentTransaction[];
}

export interface RecentTransaction {
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

export interface BillingHistory {
  id: number;
  client_id: number;
  type: string;
  reference: string;
  amount: string;
  tokens_purchased: number;
  status: string;
  gateway: string;
  notes: null | string;
  created_at: Date;
}

export interface Stats {
  users: number;
  sms: number;
  revenue: string;
  tokensPurchased: string;
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

export interface ClientsResponseee {
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

export interface ClientsResponseWrapper {
  success: boolean;
  data: ClientsResponse[];
}

export interface ClientsResponse {
  id: number;
  name: string;
  email: string;
  token_balance: number;
  ussd_code: null | string;
  status: string;
  is_admin: number;
  created_at: Date;
  sender_id?: null | string;
  pricing_tier_id: number | null;
  tier_name: null | string;
}

export interface UpdateClientDetails {
  name: string;
  ussd_code?: string;
  sender_id?: string;
}
export interface LogsResponse {
  sms: Sms[];
  ussd: Ussd[];
  airtime: Airtime[];
}

export interface Airtime {
  id: number;
  client_id: number;
  phone_number: string;
  network: string;
  amount: string;
  status: string;
  created_at: Date;
  client_name: string;
}

export interface Sms {
  id: number;
  client_id: number;
  sender_id: string;
  phone_number: string;
  message: string;
  cost: string;
  status: string;
  created_at: Date;
  client_name: string;
  email: string;
}

export interface Ussd {
  id: number;
  client_id: number;
  phone_number: string;
  session_id: string;
  service_code: string;
  session_data: string;
  cost: string;
  status: string;
  created_at: Date;
  logged_at: Date;
  client_price: string;
  final_user_string: null;
  client_name: string;
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

export interface Enable2FARequest {
  secret: string;
  qrcode: string;
}

export interface Generate2FAResponse {
  qrCode: string;
  secret: string;
}

export interface Activate2FARequest {
  token: string;
  secret: string;
}

export interface Disable2FARequest {
  token: string;
}

// Pagination Models
export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationState;
}

export interface PaginationConfig {
  pageSize?: number;
  initialPage?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
