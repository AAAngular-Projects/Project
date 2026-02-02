import { 
  Component, 
  inject, 
  signal, 
  computed, 
  OnInit, 
  DestroyRef,
  ChangeDetectionStrategy 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  ReactiveFormsModule, 
  FormBuilder, 
  FormGroup, 
  Validators,
  AbstractControl,
  AsyncValidatorFn,
  ValidationErrors
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap, catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AuthService } from '@core/services/auth.service';
import { UserSettingsService } from '@core/services/user-settings.service';
import { 
  PasswordStrength, 
  ThemeSettings, 
  UserPreferences 
} from '@core/models/settings.model';
import { User } from '@core/models';

/**
 * Settings Component
 * Provides comprehensive user profile management including:
 * - Profile information editing (name, email)
 * - Password change with strength meter
 * - Theme customization (light/dark/auto)
 * - User preferences (notifications, auto-logout, etc.)
 * - Currency preferences
 * 
 * Uses Angular Signals for reactive state management
 * Uses Reactive Forms with async validation
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(UserSettingsService);
  private readonly destroyRef = inject(DestroyRef);

  // Current user from auth service
  readonly currentUser = this.authService.currentUser;
  readonly preferences = this.settingsService.preferences;
  readonly theme = this.settingsService.theme;

  // UI State signals
  readonly activeTab = signal<'profile' | 'security' | 'preferences' | 'theme'>('profile');
  readonly isSaving = signal<boolean>(false);
  readonly saveMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  readonly passwordStrength = signal<PasswordStrength>({ score: 0, label: 'Weak', color: '#ef4444' });
  readonly showCurrentPassword = signal<boolean>(false);
  readonly showNewPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);

  // Currency options from API
  readonly currencies = signal<{ uuid: string; name: string }[]>([]);
  readonly loadingCurrencies = signal<boolean>(false);

  // Forms
  profileForm!: FormGroup;
  securityForm!: FormGroup;
  preferencesForm!: FormGroup;
  themeForm!: FormGroup;

  // Computed: Check if profile form has changes
  readonly hasProfileChanges = computed(() => {
    if (!this.profileForm) return false;
    return this.profileForm.dirty && this.profileForm.valid;
  });

  // Computed: Check if any security changes
  readonly hasSecurityChanges = computed(() => {
    if (!this.securityForm) return false;
    return this.securityForm.dirty && this.securityForm.valid;
  });

  ngOnInit(): void {
    this.initializeForms();
    this.loadCurrencies();
    this.setupPasswordStrengthWatcher();
  }

  /**
   * Initialize all reactive forms
   */
  private initializeForms(): void {
    const user = this.currentUser();

    // Profile form with async email validation
    this.profileForm = this.fb.group({
      firstName: [user?.firstName || '', [Validators.required, Validators.minLength(2)]],
      lastName: [user?.lastName || '', [Validators.required, Validators.minLength(2)]],
      email: [
        user?.email || '', 
        [Validators.required, Validators.email],
        [this.emailValidator()]
      ]
    });

    // Security form with password matching validation
    this.securityForm = this.fb.group({
      currentPassword: [''],
      newPassword: ['', [Validators.minLength(6)]],
      confirmPassword: ['']
    }, { validators: this.passwordMatchValidator });

    // Preferences form
    const prefs = this.preferences();
    this.preferencesForm = this.fb.group({
      lowBalanceThreshold: [prefs.lowBalanceThreshold, [Validators.min(0)]],
      monthlySpendingLimit: [prefs.monthlySpendingLimit, [Validators.min(0)]],
      enableNotifications: [prefs.enableNotifications],
      preferredTransactionView: [prefs.preferredTransactionView],
      autoLogoutMinutes: [prefs.autoLogoutMinutes, [Validators.min(5), Validators.max(120)]],
      enableTwoFactorAuth: [prefs.enableTwoFactorAuth]
    });

    // Theme form
    const themeSettings = this.theme();
    this.themeForm = this.fb.group({
      colorScheme: [themeSettings.colorScheme],
      compactMode: [themeSettings.compactMode],
      showAccountIcons: [themeSettings.showAccountIcons],
      dashboardLayout: [themeSettings.dashboardLayout]
    });

    // Auto-save theme changes
    this.themeForm.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
      debounceTime(300)
    ).subscribe(value => {
      this.settingsService.updateTheme(value as ThemeSettings);
      this.showTemporaryMessage('success', 'Theme updated');
    });

    // Auto-save preference changes
    this.preferencesForm.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
      debounceTime(500)
    ).subscribe(value => {
      this.settingsService.updatePreferences(value as UserPreferences);
      this.showTemporaryMessage('success', 'Preferences saved');
    });
  }

  /**
   * Async validator for email uniqueness
   */
  private emailValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const email = control.value;
      const currentEmail = this.currentUser()?.email;

      // Skip validation if empty or unchanged
      if (!email || email === currentEmail) {
        return of(null);
      }

      return timer(400).pipe(
        switchMap(() => this.settingsService.checkEmailAvailability(email)),
        map(response => response.exist ? { emailTaken: true } : null),
        catchError(() => of(null))
      );
    };
  }

  /**
   * Cross-field validator for password matching
   */
  private passwordMatchValidator(group: FormGroup): ValidationErrors | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  /**
   * Setup watcher for password strength calculation
   */
  private setupPasswordStrengthWatcher(): void {
    this.securityForm.get('newPassword')?.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
      distinctUntilChanged()
    ).subscribe(password => {
      this.calculatePasswordStrength(password || '');
    });
  }

  /**
   * Calculate password strength based on various criteria
   */
  private calculatePasswordStrength(password: string): void {
    if (!password) {
      this.passwordStrength.set({ score: 0, label: 'Weak', color: '#ef4444' });
      return;
    }

    let score = 0;

    // Length checks
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (password.length >= 14) score++;

    // Character variety checks
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    // Determine label and color
    const levels: { min: number; label: PasswordStrength['label']; color: string }[] = [
      { min: 0, label: 'Weak', color: '#ef4444' },
      { min: 2, label: 'Fair', color: '#f97316' },
      { min: 4, label: 'Medium', color: '#eab308' },
      { min: 5, label: 'Strong', color: '#22c55e' }
    ];

    const level = [...levels].reverse().find(l => score >= l.min) || levels[0];
    this.passwordStrength.set({ score, label: level.label, color: level.color });
  }

  /**
   * Load available currencies from API
   */
  private loadCurrencies(): void {
    this.loadingCurrencies.set(true);
    this.settingsService.getCurrencies().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (currencies) => {
        this.currencies.set(currencies);
        this.loadingCurrencies.set(false);
      },
      error: () => {
        this.loadingCurrencies.set(false);
      }
    });
  }

  /**
   * Switch active tab
   */
  setActiveTab(tab: 'profile' | 'security' | 'preferences' | 'theme'): void {
    this.activeTab.set(tab);
    this.saveMessage.set(null);
  }

  /**
   * Save profile changes
   */
  saveProfile(): void {
    if (!this.profileForm.valid) return;

    this.isSaving.set(true);
    this.saveMessage.set(null);

    const updates: any = {};
    
    if (this.profileForm.get('firstName')?.dirty) {
      updates.firstName = this.profileForm.value.firstName;
    }
    if (this.profileForm.get('lastName')?.dirty) {
      updates.lastName = this.profileForm.value.lastName;
    }
    if (this.profileForm.get('email')?.dirty) {
      updates.email = this.profileForm.value.email;
    }

    if (Object.keys(updates).length === 0) {
      this.isSaving.set(false);
      this.saveMessage.set({ type: 'error', text: 'No changes to save' });
      return;
    }

    this.settingsService.updateProfile(updates).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (updatedUser) => {
        this.isSaving.set(false);
        this.saveMessage.set({ type: 'success', text: 'Profile updated successfully!' });
        this.profileForm.markAsPristine();
        
        // Update auth service with new user data
        this.authService.loadUserFromStorage();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.saveMessage.set({ 
          type: 'error', 
          text: err.error?.message || 'Failed to update profile' 
        });
      }
    });
  }

  /**
   * Save password changes
   */
  savePassword(): void {
    if (!this.securityForm.valid) return;

    const newPassword = this.securityForm.get('newPassword')?.value;
    if (!newPassword) {
      this.saveMessage.set({ type: 'error', text: 'Please enter a new password' });
      return;
    }

    this.isSaving.set(true);
    this.saveMessage.set(null);

    this.settingsService.changePassword({ newPassword }).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saveMessage.set({ type: 'success', text: 'Password changed successfully!' });
        this.securityForm.reset();
        this.passwordStrength.set({ score: 0, label: 'Weak', color: '#ef4444' });
      },
      error: (err) => {
        this.isSaving.set(false);
        this.saveMessage.set({ 
          type: 'error', 
          text: err.error?.message || 'Failed to change password' 
        });
      }
    });
  }

  /**
   * Reset settings to defaults
   */
  resetToDefaults(): void {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      this.settingsService.resetToDefaults();
      this.initializeForms();
      this.saveMessage.set({ type: 'success', text: 'Settings reset to defaults' });
    }
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(field: 'current' | 'new' | 'confirm'): void {
    switch (field) {
      case 'current':
        this.showCurrentPassword.update(v => !v);
        break;
      case 'new':
        this.showNewPassword.update(v => !v);
        break;
      case 'confirm':
        this.showConfirmPassword.update(v => !v);
        break;
    }
  }

  /**
   * Show temporary message that auto-hides
   */
  private showTemporaryMessage(type: 'success' | 'error', text: string): void {
    this.saveMessage.set({ type, text });
    setTimeout(() => {
      if (this.saveMessage()?.text === text) {
        this.saveMessage.set(null);
      }
    }, 3000);
  }

  /**
   * Get error message for form control
   */
  getErrorMessage(controlName: string, form: FormGroup): string {
    const control = form.get(controlName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'This field is required';
    if (control.errors['email']) return 'Please enter a valid email';
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters`;
    if (control.errors['emailTaken']) return 'This email is already in use';
    if (control.errors['min']) return `Minimum value is ${control.errors['min'].min}`;
    if (control.errors['max']) return `Maximum value is ${control.errors['max'].max}`;

    return 'Invalid value';
  }
}
