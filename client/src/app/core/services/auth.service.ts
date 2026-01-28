import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { User, LoginPayload, LoginRequest, ForgotPasswordRequest } from '../models';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);
  private readonly API_URL = 'http://localhost:4000/bank';

  // Signals for reactive state management
  private currentUserSignal = signal<User | null>(null);
  private isLoadingSignal = signal<boolean>(false);

  // Computed signals
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly isLoading = this.isLoadingSignal.asReadonly();

  constructor() {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const token = this.storage.getToken();
    const user = this.storage.getUser();
    
    if (token && user) {
      this.currentUserSignal.set(user);
    }
  }

  login(credentials: LoginRequest): Observable<LoginPayload> {
    this.isLoadingSignal.set(true);
    
    return this.http.post<LoginPayload>(`${this.API_URL}/Auth/login`, credentials).pipe(
      tap({
        next: (response) => {
          this.storage.setToken(response.token.accessToken);
          this.storage.setUser(response.user);
          this.currentUserSignal.set(response.user);
          this.isLoadingSignal.set(false);
        },
        error: () => {
          this.isLoadingSignal.set(false);
        }
      })
    );
  }

  logout(): Observable<void> {
    return this.http.patch<void>(`${this.API_URL}/Auth/logout`, {}).pipe(
      tap(() => {
        this.storage.clear();
        this.currentUserSignal.set(null);
        this.router.navigate(['/login']);
      })
    );
  }

  logoutLocal(): void {
    this.storage.clear();
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/Auth/password/forget`, request);
  }

  resetPassword(token: string, password: string): Observable<void> {
    return this.http.patch<void>(
      `${this.API_URL}/Auth/password/reset`,
      { password },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
  }
}
