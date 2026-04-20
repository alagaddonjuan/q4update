
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../src/environments/environment.development';
import { Router } from '@angular/router';
import { LoginRequest, LoginResponse, RegisterRequest, User } from '../models/api.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = environment.apiUrl;

  // Signals for reactive state
  private readonly isAdminSignal = signal<boolean>(this.checkAdminStatus());
  readonly isAdmin = this.isAdminSignal.asReadonly();

  private readonly tokenSignal = signal<string | null>(localStorage.getItem('token'));
  readonly token = this.tokenSignal.asReadonly();

  private readonly currentUserSignal = signal<User | null>(this.getStoredUser());
  readonly currentUser = this.currentUserSignal.asReadonly();

  readonly isAuthenticated = computed(() => !!this.tokenSignal());

  register(data: RegisterRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/register`, data);
  }

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/api/auth/login`, data).pipe(
      tap(response => {
        // Only store authentication data if 2FA is not required or if the 2FA token
        // has already been provided in this request. This prevents a user from being
        // considered "logged in" during the 2FA verification step.
        const is2FAPending = (response.requires_2fa || response.user?.is_2fa_enabled === 1) && !data.token;

        if (response.token && response.user && !is2FAPending) {
          this.setAuthData(response.token, response.user.is_admin === 1, response.user);
        }
      })
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/reset-password`, { token, password });
  }

  verify2FA(token: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/2fa/verify`, { token });
  }

  logout(): void {
    this.clearAuthData();
    this.router.navigate(['/auth/login']);
  }

  private setAuthData(token: string, isAdmin: boolean, user: User): void {
    localStorage.setItem('token', token);
    localStorage.setItem('isAdmin', String(isAdmin));
    localStorage.setItem('user', JSON.stringify(user));
    this.tokenSignal.set(token);
    this.isAdminSignal.set(isAdmin);
    this.currentUserSignal.set(user);
  }

  clearAuthData(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('pageTitle');
    localStorage.removeItem('user');
    this.tokenSignal.set(null);
    this.isAdminSignal.set(false);
    this.currentUserSignal.set(null);
  }

  private checkAdminStatus(): boolean {
    return localStorage.getItem('isAdmin') === 'true';
  }

  private getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}
