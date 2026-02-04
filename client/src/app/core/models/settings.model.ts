/**
 * Settings and User Preferences Models
 * Contains interfaces for user settings, preferences, and theme configuration
 */

export interface UserPreferences {
  lowBalanceThreshold: number;
  monthlySpendingLimit: number;
  autoLogoutMinutes: number;
}

export interface ThemeSettings {
  colorScheme: 'light' | 'dark' | 'auto';
}

export interface UserSettings {
  preferences: UserPreferences;
  theme: ThemeSettings;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  dateOfBirth?: string;
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword: string;
}

export interface PasswordStrength {
  score: number;
  label: 'Weak' | 'Fair' | 'Medium' | 'Strong';
  color: string;
}

export interface StatementRequest {
  accountId: string;
  dateFrom: string;
  dateTo: string;
  format: 'pdf' | 'csv' | 'excel';
  includeCharts: boolean;
  template: 'detailed' | 'summary' | 'tax';
}
