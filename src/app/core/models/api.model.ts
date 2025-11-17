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
