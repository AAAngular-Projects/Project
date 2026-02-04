import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError } from 'rxjs';
import { 
  UserSettings, 
  UserPreferences, 
  ThemeSettings, 
  UpdateProfileRequest,
  ChangePasswordRequest 
} from '@core/models/settings.model';
import { User } from '@core/models';
import { StorageService } from './storage.service';
import { environment } from '../../../environments/environment';

/**
 * User Settings Service
 * Manages user profile updates, preferences, theme settings, and account configurations
 * Uses Angular Signals for reactive state management
 */
@Injectable({
  providedIn: 'root'
})
export class UserSettingsService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly API_URL = environment.apiUrl;

  // Default settings
  private readonly defaultPreferences: UserPreferences = {
    lowBalanceThreshold: 100,
    monthlySpendingLimit: 2000,
    autoLogoutMinutes: 15
  };

  private readonly defaultTheme: ThemeSettings = {
    colorScheme: 'light'
  };

  // Reactive state with signals
  private readonly preferencesSignal = signal<UserPreferences>(this.defaultPreferences);
  private readonly themeSignal = signal<ThemeSettings>(this.defaultTheme);
  private readonly isLoadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly isSavingSignal = signal<boolean>(false);

  // Public readonly signals
  readonly preferences = this.preferencesSignal.asReadonly();
  readonly theme = this.themeSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly isSaving = this.isSavingSignal.asReadonly();

  // Computed signals for convenience
  readonly isDarkMode = computed(() => {
    const scheme = this.themeSignal().colorScheme;
    if (scheme === 'auto') {
      return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return scheme === 'dark';
  });

  readonly currentSettings = computed<UserSettings>(() => ({
    preferences: this.preferencesSignal(),
    theme: this.themeSignal()
  }));

  constructor() {
    this.loadSettingsFromStorage();
    
    // Apply theme when it changes - use allowSignalWrites for DOM manipulation
    effect(() => {
      this.applyTheme(this.themeSignal());
    }, { allowSignalWrites: true });
  }

  /**
   * Load settings from local storage on initialization
   */
  private loadSettingsFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    const savedPreferences = localStorage.getItem('user_preferences');
    const savedTheme = localStorage.getItem('user_theme');

    if (savedPreferences) {
      try {
        this.preferencesSignal.set({ ...this.defaultPreferences, ...JSON.parse(savedPreferences) });
      } catch (e) {
        console.error('Failed to parse saved preferences:', e);
      }
    }

    if (savedTheme) {
      try {
        this.themeSignal.set({ ...this.defaultTheme, ...JSON.parse(savedTheme) });
      } catch (e) {
        console.error('Failed to parse saved theme:', e);
      }
    }
  }

  /**
   * Apply theme settings to the document
   */
  private applyTheme(theme: ThemeSettings): void {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    // Apply color scheme
    if (theme.colorScheme === 'dark' || 
        (theme.colorScheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    }
  }

  /**
   * Check if email is already taken
   */
  checkEmailAvailability(email: string): Observable<{ exist: boolean }> {
    return this.http.get<{ exist: boolean }>(`${this.API_URL}/Users/${email}/checkEmail`).pipe(
      catchError(() => of({ exist: false }))
    );
  }

  /**
   * Update user profile information
   */
  updateProfile(data: UpdateProfileRequest): Observable<User> {
    this.isSavingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<User>(`${this.API_URL}/Users`, data).pipe(
      tap((updatedUser) => {
        // Update stored user data
        this.storage.setUser(updatedUser);
        this.isSavingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error.error?.message || 'Failed to update profile');
        this.isSavingSignal.set(false);
        throw error;
      })
    );
  }

  /**
   * Change user password
   */
  changePassword(data: ChangePasswordRequest): Observable<User> {
    this.isSavingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<User>(`${this.API_URL}/Users`, { password: data.newPassword }).pipe(
      tap(() => {
        this.isSavingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error.error?.message || 'Failed to change password');
        this.isSavingSignal.set(false);
        throw error;
      })
    );
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences: Partial<UserPreferences>): void {
    const updated = { ...this.preferencesSignal(), ...preferences };
    this.preferencesSignal.set(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_preferences', JSON.stringify(updated));
    }
  }

  /**
   * Update theme settings
   */
  updateTheme(theme: Partial<ThemeSettings>): void {
    const updated = { ...this.themeSignal(), ...theme };
    this.themeSignal.set(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_theme', JSON.stringify(updated));
    }
  }

  /**
   * Reset all settings to defaults
   */
  resetToDefaults(): void {
    this.preferencesSignal.set(this.defaultPreferences);
    this.themeSignal.set(this.defaultTheme);
    localStorage.removeItem('user_preferences');
    localStorage.removeItem('user_theme');
  }

  /**
   * Get available currencies from API
   */
  getCurrencies(): Observable<{ uuid: string; name: string }[]> {
    return this.http.get<{ uuid: string; name: string }[]>(`${this.API_URL}/Currencies`);
  }

  /**
   * Update user's preferred currency
   */
  updateCurrency(currencyUuid: string): Observable<User> {
    this.isSavingSignal.set(true);
    return this.http.patch<User>(`${this.API_URL}/Users`, { currencyUuid }).pipe(
      tap(() => this.isSavingSignal.set(false)),
      catchError((error) => {
        this.errorSignal.set('Failed to update currency');
        this.isSavingSignal.set(false);
        throw error;
      })
    );
  }
}
