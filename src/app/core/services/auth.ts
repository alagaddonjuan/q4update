
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../src/environments/environment.development';
import { Router } from '@angular/router';
import { LoginRequest, LoginResponse, RegisterRequest } from '../models/api.model';

@Injectable({
  providedIn: 'root',
})
export class authService {
private readonly http = inject(HttpClient);
private readonly router = inject(Router);
private readonly baseUrl:string;

constructor() {
    // Debug: Log the environment configuration
    console.log('Environment config:', environment);
    console.log('API URL:', environment.apiUrl);
    
    // Build the auth base URL
    // If apiUrl is set, append /auth to it
    // If using proxy with empty apiUrl, use /auth directly
    this.baseUrl = environment.apiUrl 
      ? `${environment.apiUrl}/auth` 
      : '/auth';
    
    console.log('Auth Base URL:', this.baseUrl);
}

// Signals for reactive state
  private readonly isAdminSignal = signal<boolean>(this.checkAdminStatus());
  readonly isAdmin = this.isAdminSignal.asReadonly();
  
  private readonly tokenSignal = signal<string | null>(localStorage.getItem('token'));
  readonly token = this.tokenSignal.asReadonly();
  
  readonly isAuthenticated = computed(() => !!this.tokenSignal());

  register(data: RegisterRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, data);
  }

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, data).pipe(
      tap(response => {
        this.setAuthData(response.token, response.isAdmin);
      })
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/reset-password`, { token, password });
  }

  verify2FA(token: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/2fa/verify-login`, { token });
  }

  logout(): void {
    this.clearAuthData();
    this.router.navigate(['/auth/login']);
  }

  private setAuthData(token: string, isAdmin: boolean): void {
    localStorage.setItem('token', token);
    localStorage.setItem('isAdmin', String(isAdmin));
    this.tokenSignal.set(token);
    this.isAdminSignal.set(isAdmin);
  }

  private clearAuthData(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    this.tokenSignal.set(null);
    this.isAdminSignal.set(false);
  }

  private checkAdminStatus(): boolean {
    return localStorage.getItem('isAdmin') === 'true';
  }
}
