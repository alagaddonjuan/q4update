import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/admin`;

  getStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/stats`);
  }

  getClients(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/clients`);
  }

  getLogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/logs`);
  }

  // manualTopup(data: ManualTopupRequest): Observable<any> {
  //   return this.http.post(`${this.baseUrl}/topup`, data);
  // }

  manualTransaction(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/transactions/manual`, data);
  }

  updateClientStatus(clientId: number, status: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/clients/${clientId}/status`, { status });
  }

  updateClientDetails(clientId: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/clients/${clientId}`, data);
  }

  getPricingTiers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/pricing-tiers`);
  }

  createPricingTier(data: { tier_name: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/pricing-tiers`, data);
  }

  getTierPrices(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/pricing-tiers/${id}/prices`);
  }

  updateTierPrices(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/pricing-tiers/${id}/prices`, data);
  }

  assignTierToClient(clientId: number, tierId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/clients/${clientId}/assign-tier`, { tierId });
  }

  sendAnnouncement(data: { subject: string; message: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/announcements`, data);
  }
}