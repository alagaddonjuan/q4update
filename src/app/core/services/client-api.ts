import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DashboardData,
  SendSmsRequest,
  SendAirtimeRequest,
  TeamInviteRequest,
  MenuItemRequest,
  PaymentInitRequest,
  ApiKeyRequest,
  RolesResponse,
  TeamMemberResponse,
  DashboardDataResponse,
  Generate2FAResponse,
  Activate2FARequest,
  Disable2FARequest
} from '../models/api.model';


@Injectable({
  providedIn: 'root',
})
export class ClientApiService {
  private readonly baseUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);

  // Dashboard & Core
  getDashboard(): Observable<DashboardDataResponse> {
    return this.http.get<DashboardDataResponse>(`${this.baseUrl}/api/client/dashboard`);
  }

  getChartData(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/charts`);
  }

  updateProfile(data: { name?: string; password?: string }): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/profile`, data);
  }

  // Services
  sendSms(data: SendSmsRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/sendsms`, data);
  }

  sendAirtime(data: SendAirtimeRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/sendairtime`, data);
  }

  // Billing
  initializePaystackPayment(data: PaymentInitRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/billing/initialize`, data);
  }

  initializeSquadPayment(data: PaymentInitRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/billing/squad/initialize`, data);
  }

  // Exporting
  exportSmsLogs(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/api/export/sms`, { responseType: 'blob' });
  }

  exportAirtimeLogs(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/api/export/airtime`, { responseType: 'blob' });
  }

  exportUssdLogs(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/api/export/ussd`, { responseType: 'blob' });
  }

  // API Key Management
  getApiKeys(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/keys`);
  }

  createApiKey(data: ApiKeyRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/keys`, data);
  }

  deleteApiKey(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/keys/${id}`);
  }

  updateIpWhitelist(id: number, ips: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/keys/${id}/ips`, { whitelisted_ips: ips });
  }

  // USSD Menu Builder
  getUssdMenus(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/client/ussd/menus`);
  }

  createUssdMenu(data: { menu_name: string; ussd_code: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/client/ussd-menus`, data);
  }

  setActiveMenu(menuId: number, isActive: boolean): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/client/ussd/menus/set-active`, { menuId, isActive });
  }

  getMenuDetails(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/client/ussd/menus/${id}`);
  }

  addMenuItem(menuId: number, data: MenuItemRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/client/ussd/menus/${menuId}/items`, data);
  }

  updateMenuItem(itemId: number, data: Partial<MenuItemRequest>): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/client/ussd/menus/items/${itemId}`, data);
  }

  deleteMenuItem(itemId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/client/ussd/menus/items/${itemId}`);
  }

  // Team Management
  getRoles(): Observable<RolesResponse[]> {
    return this.http.get<RolesResponse[]>(`${this.baseUrl}/api/client/team/roles`);
  }

  getTeamMembers(): Observable<TeamMemberResponse[]> {
    return this.http.get<TeamMemberResponse[]>(`${this.baseUrl}/api/client/team/members`);
  }

  inviteTeamMember(data: TeamInviteRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/team/invite`, data);
  }

  getTransactionHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/client/billing/history`);
  }

  // Two-Factor Authentication
  generate2FA(): Observable<Generate2FAResponse> {
    return this.http.post<Generate2FAResponse>(`${this.baseUrl}/api/client/2fa/generate`, {});
  }

  activate2FA(data: Activate2FARequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/client/2fa/enable`, data);
  }

  disable2FA(token: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/client/2fa/disable`, { token });
  }
}
