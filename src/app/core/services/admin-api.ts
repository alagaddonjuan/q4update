import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminStats, ClientsResponse, LogsResponse, ManualTopupRequest, ManualTransaction, PricingTierPrices, PricingTiersResponse, SendAnnouncementRequest, UpdateClientDetails } from '../models/api.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminApi {

  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.apiUrl;

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.baseUrl}/api/admin/stats`);
  }

  getClients(): Observable<ClientsResponse[]> {
    return this.http.get<ClientsResponse[]>(`${this.baseUrl}/api/admin/clients`);
  }

  getLogs(): Observable<LogsResponse> {
    return this.http.get<LogsResponse>(`${this.baseUrl}/api/admin/logs`);
  }

  manualTopup(data: ManualTopupRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/admin/topup`, data);
  }

  manualTransaction(data: ManualTransaction) {
    return this.http.post(`${this.baseUrl}/api/admin/transactions/manual`, data);
  }

  updateClientStatus(clientId: number, status: 'active' | 'suspended') {
    return this.http.put(`${this.baseUrl}/api/admin/clients/${clientId}/status`, { status });
  }

  updateClientDetails(clientId: number, data: UpdateClientDetails) {
    return this.http.put(`${this.baseUrl}/api/admin/clients/${clientId}`, data);
  }

  assignTierToClient(clientId: number, tierId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/admin/clients/${clientId}/assign-tier`, { tierId });
  }

  getPricingTiers(): Observable<PricingTiersResponse[]> {
    return this.http.get<PricingTiersResponse[]>(`${this.baseUrl}/api/admin/pricing-tiers`);
  }

  createPricingTier(data: { tier_name: string }) {
    return this.http.post(`${this.baseUrl}/api/admin/pricing-tiers`, data);
  }

  getTierPrices(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/admin/pricing-tiers/${id}/prices`);
  }

  updateTierPrices(id: number, data: PricingTierPrices) {
    return this.http.put(`${this.baseUrl}/api/admin/pricing-tiers/${id}/prices`, data);
  }


  sendAnnouncement(data: SendAnnouncementRequest) {
    return this.http.post(`${this.baseUrl}/api/admin/announcements`, data);
  }

}
