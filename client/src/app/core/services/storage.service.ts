import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { User } from '../models';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly TOKEN_KEY = 'bank_access_token';
  private readonly USER_KEY = 'bank_user';
  private readonly LEGACY_TOKEN_KEYS = ['accessToken', 'access_token', 'token'];

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  setToken(token: string): void {
    if (this.isBrowser) {
      if (!token || token === 'undefined' || token === 'null') {
        this.removeToken();
        return;
      }

      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  getToken(): string | null {
    if (this.isBrowser) {
      const directToken = localStorage.getItem(this.TOKEN_KEY);
      if (directToken && directToken !== 'undefined' && directToken !== 'null') {
        return directToken;
      }

      const migrated = this.getAndMigrateLegacyToken();
      if (migrated) {
        return migrated;
      }

      const sessionToken = this.getTokenFromSessionStorage();
      if (sessionToken) {
        this.setToken(sessionToken);
        return sessionToken;
      }
    }
    return null;
  }

  removeToken(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  setUser(user: User): void {
    if (this.isBrowser) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  getUser(): User | null {
    if (this.isBrowser) {
      const user = localStorage.getItem(this.USER_KEY);
      return user ? JSON.parse(user) : null;
    }
    return null;
  }

  removeUser(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.USER_KEY);
    }
  }

  clear(): void {
    this.removeToken();
    this.removeUser();
  }

  private getAndMigrateLegacyToken(): string | null {
    for (const key of this.LEGACY_TOKEN_KEYS) {
      const token = localStorage.getItem(key);
      if (token && token !== 'undefined' && token !== 'null') {
        localStorage.removeItem(key);
        this.setToken(token);
        return token;
      }
    }

    return null;
  }

  private getTokenFromSessionStorage(): string | null {
    if (!this.isBrowser || typeof sessionStorage === 'undefined') {
      return null;
    }

    const directToken = sessionStorage.getItem(this.TOKEN_KEY);
    if (directToken && directToken !== 'undefined' && directToken !== 'null') {
      return directToken;
    }

    for (const key of this.LEGACY_TOKEN_KEYS) {
      const token = sessionStorage.getItem(key);
      if (token && token !== 'undefined' && token !== 'null') {
        sessionStorage.removeItem(key);
        return token;
      }
    }

    return null;
  }
}
