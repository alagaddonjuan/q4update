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
  // All admin endpoints will go through the /api proxy
  // private readonly baseUrl = 'https://coms.q4globalltd.com/api/admin';

  // If apiUrl is empty, add /api prefix
  private readonly baseUrl = environment.apiUrl === 'api/admin'
    ? environment.apiUrl
    : (environment.apiUrl || '') + '/api/admin';

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.baseUrl}/stats`);
  }

  getClients(): Observable<ClientsResponse[]> {
    return this.http.get<ClientsResponse[]>(`${this.baseUrl}/clients`);
  }

  getLogs(): Observable<LogsResponse> {
    return this.http.get<LogsResponse>(`${this.baseUrl}/logs`);
  }

  manualTopup(data: ManualTopupRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/topup`, data);
  }

  manualTransaction(data: ManualTransaction) {
    return this.http.post(`${this.baseUrl}/transactions/manual`, data);
  }

  updateClientStatus(clientId: number, status: 'active' | 'suspended') {
    return this.http.put(`${this.baseUrl}/clients/${clientId}/status`, { status });
  }

  updateClientDetails(clientId: number, data: UpdateClientDetails) {
    return this.http.put(`${this.baseUrl}/clients/${clientId}`, data);
  }

  assignTierToClient(clientId: number, tierId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/clients/${clientId}/assign-tier`, { tierId });
  }

  getPricingTiers(): Observable<PricingTiersResponse[]> {
    return this.http.get<PricingTiersResponse[]>(`${this.baseUrl}/pricing-tiers`);
  }

  createPricingTier(data: { tier_name: string }) {
    return this.http.post(`${this.baseUrl}/pricing-tiers`, data);
  }

  getTierPrices(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/pricing-tiers/${id}/prices`);
  }

  updateTierPrices(id: number, data: PricingTierPrices) {
    return this.http.put(`${this.baseUrl}/pricing-tiers/${id}/prices`, data);
  }


  sendAnnouncement(data: SendAnnouncementRequest) {
    return this.http.post(`${this.baseUrl}/announcements`, data);
  }

}
