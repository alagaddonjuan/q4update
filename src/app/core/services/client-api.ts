import { Injectable,inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardData, SendSmsRequest,SendAirtimeRequest,TeamInviteRequest,MenuItemRequest ,PaymentInitRequest,ApiKeyRequest } from '../models/api.model';


@Injectable({
  providedIn: 'root',
})
export class ClientApiService {
  private readonly http = inject(HttpClient);

  // If apiUrl is empty, add /api prefix
  private readonly baseUrl = environment.apiUrl === 'api' 
    ? environment.apiUrl 
    : (environment.apiUrl || '') + '/api';
  

   // Dashboard & Core
  getDashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.baseUrl}/api/dashboard`);
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
    return this.http.get<any[]>(`${this.baseUrl}/api/ussd/menus`);
  }

  setActiveMenu(menuId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/ussd/menus/set-active`, { menuId });
  }

  getMenuDetails(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/ussd/menus/${id}`);
  }

  addMenuItem(menuId: number, data: MenuItemRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/ussd/menus/${menuId}/items`, data);
  }

  updateMenuItem(itemId: number, data: Partial<MenuItemRequest>): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/ussd/menus/items/${itemId}`, data);
  }

  deleteMenuItem(itemId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/ussd/menus/items/${itemId}`);
  }

  // Team Management
  getRoles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/team/roles`);
  }

  getTeamMembers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/team/members`);
  }

  inviteTeamMember(data: TeamInviteRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/team/invite`, data);
  }
}
