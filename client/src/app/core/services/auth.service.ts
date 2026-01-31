import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import {
  User,
  LoginPayload,
  LoginRequest,
  ForgotPasswordRequest,
  RegisterRequest,
  OauthRegisterRequest,
  RoleType,
} from '../models';
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
  private userRoleSignal = signal<RoleType | null>(null);

  // Computed signals
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly role = this.userRoleSignal.asReadonly();
  readonly isAdminOrRoot = computed(
    () => {
      const role = this.userRoleSignal();
      return role === RoleType.ADMIN || role === RoleType.ROOT;
    }
  );
  readonly isLoading = this.isLoadingSignal.asReadonly();

  constructor() {
    this.loadUserFromStorage();
  }

  loadUserFromStorage(): void {
    const token = this.storage.getToken();
    const user = this.storage.getUser();

    if (token && user) {
      this.setAuthenticatedUser(user);
    }
  }

  private setAuthenticatedUser(user: User): void {
    const role = this.resolveRole(user);
    const enrichedUser = role ? { ...user, role } : user;

    console.log('Setting authenticated user:', enrichedUser);
    console.log('User UUID:', enrichedUser.uuid);
    console.log('User Auth:', enrichedUser.userAuth);

    this.storage.setUser(enrichedUser);
    this.currentUserSignal.set(enrichedUser);
    this.userRoleSignal.set(role);
  }

  private resolveRole(user: User): RoleType | null {
    const tokenRole = this.decodeRoleFromToken();
    if (tokenRole) {
      return tokenRole;
    }

    if (user.role) {
      return user.role;
    }

    return user.userAuth?.role ?? null;
  }

  private decodeRoleFromToken(token: string | null = null): RoleType | null {
    const accessToken = token ?? this.storage.getToken();

    if (!accessToken) {
      return null;
    }

    const [, payload] = accessToken.split('.');

    if (!payload) {
      return null;
    }

    try {
      const normalized = this.normalizeBase64(payload);
      const decoded = this.base64Decode(normalized);
      const parsed = JSON.parse(decoded);
      return (parsed.role as RoleType) ?? null;
    } catch (error) {
      console.error('Failed to decode JWT role', error);
      return null;
    }
  }

  private normalizeBase64(value: string): string {
    let normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4;
    if (padding) {
      normalized += '='.repeat(4 - padding);
    }
    return normalized;
  }

  private base64Decode(value: string): string {
    if (typeof atob === 'function') {
      return atob(value);
    }

    const bufferCtor = (globalThis as any)?.Buffer;
    if (bufferCtor) {
      return bufferCtor.from(value, 'base64').toString('utf-8');
    }

    throw new Error('No base64 decoder available in this environment');
  }

  login(credentials: LoginRequest): Observable<LoginPayload> {
    this.isLoadingSignal.set(true);
    
    return this.http.post<LoginPayload>(`${this.API_URL}/auth/login`, credentials).pipe(
      tap({
        next: (response) => {
          this.storage.setToken(response.token.accessToken);
          this.setAuthenticatedUser(response.user);
          this.isLoadingSignal.set(false);
        },
        error: () => {
          this.isLoadingSignal.set(false);
        }
      })
    );
  }

  register(payload: RegisterRequest): Observable<User> {
    return this.http.post<User>(`${this.API_URL}/Auth/register`, payload);
  }

  logout(): Observable<void> {
    return this.http.patch<void>(`${this.API_URL}/auth/logout`, {}).pipe(
      tap(() => {
        this.storage.clear();
        this.currentUserSignal.set(null);
        this.userRoleSignal.set(null);
        this.router.navigate(['/login']);
      })
    );
  }

  logoutLocal(): void {
    this.storage.clear();
    this.currentUserSignal.set(null);
    this.userRoleSignal.set(null);
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

  startOAuthLogin(provider: string = 'google'): void {
    window.location.href = `${this.API_URL}/Auth/oauth/${provider}`;
  }

  completeOAuthLogin(payload: LoginPayload): void {
    if (!payload?.token?.accessToken || !payload?.user) {
      return;
    }

    this.storage.setToken(payload.token.accessToken);
    this.storage.setUser(payload.user);
    this.currentUserSignal.set(payload.user);
  }

  registerWithOauth(payload: OauthRegisterRequest): Observable<LoginPayload> {
    return this.http
      .post<LoginPayload>(`${this.API_URL}/Auth/oauth/google/register`, payload)
      .pipe(
        tap((response) => {
          this.completeOAuthLogin(response);
        }),
      );
  }
}
