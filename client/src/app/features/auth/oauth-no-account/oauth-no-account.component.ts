import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, CurrencyService } from '../../../core/services';
import {
  CurrencyOption,
  OauthRegistrationPreview,
  OauthRegisterRequest,
} from '../../../core/models';

@Component({
  selector: 'app-oauth-no-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './oauth-no-account.component.html',
  styleUrls: ['./oauth-no-account.component.scss']
})
export class OauthNoAccountComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly currencyService = inject(CurrencyService);

  private readonly reason = signal<string>('user-not-found');
  private readonly registrationToken = signal<string | null>(null);
  readonly preview = signal<OauthRegistrationPreview | null>(null);
  readonly currencies = signal<CurrencyOption[]>([]);

  readonly supportEmail = 'support@bank.com';
  readonly isSubmitting = signal<boolean>(false);
  readonly isLoadingCurrencies = signal<boolean>(false);
  readonly submissionError = signal<string>('');
  readonly statusMessage = signal<string>('');

  readonly headline = computed(() =>
    this.hasRegistrationToken()
      ? 'Finish connecting your Google account'
      : this.reason() === 'user-not-found'
        ? 'We couldn\'t match your Google account'
        : 'We couldn\'t complete Google sign in'
  );

  readonly description = computed(() =>
    this.hasRegistrationToken()
      ? 'Create a password and pick a primary currency to finish provisioning your banking workspace.'
      : this.reason() === 'user-not-found'
        ? 'Your Google email is not linked to a banking profile yet. Ask an administrator to invite you or use a different account.'
        : 'Something interrupted the Google sign-in flow. Head back to the login page and try again.'
  );

  readonly hasRegistrationToken = computed(() => this.registrationToken() !== null);

  readonly registrationForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    currency: ['', Validators.required],
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const reasonParam = params.get('reason');
      const tokenParam = params.get('token');

      if (reasonParam) {
        this.reason.set(reasonParam);
      }

      if (tokenParam) {
        this.registrationToken.set(tokenParam);
        this.bootstrapRegistrationPreview(tokenParam);
      }
    });
  }

  bootstrapRegistrationPreview(token: string): void {
    const preview = this.decodeToken(token);

    if (!preview) {
      this.submissionError.set('We could not validate the Google response. Please start over.');
      return;
    }

    this.preview.set(preview);
    this.registrationForm.patchValue({
      firstName: preview.firstName ?? '',
      lastName: preview.lastName ?? '',
    });

    this.loadCurrencies();
  }

  loadCurrencies(): void {
    this.isLoadingCurrencies.set(true);
    this.currencyService.getAvailableCurrencies().subscribe({
      next: (options) => {
        this.currencies.set(options);
        this.isLoadingCurrencies.set(false);
      },
      error: (error) => {
        console.error('Currency load error', error);
        this.submissionError.set('Unable to fetch currencies. Please refresh and try again.');
        this.isLoadingCurrencies.set(false);
      },
    });
  }

  completeRegistration(): void {
    if (!this.hasRegistrationToken() || this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submissionError.set('');
    this.statusMessage.set('Linking your Google account...');

    const payload = this.registrationForm.getRawValue();
    const request: OauthRegisterRequest = {
      token: this.registrationToken()!,
      password: payload.password!,
      currency: payload.currency!,
      firstName: payload.firstName ?? undefined,
      lastName: payload.lastName ?? undefined,
    };

    this.authService
      .registerWithOauth(request)
      .subscribe({
        next: () => {
          this.statusMessage.set('Account connected! Redirecting you now...');
          setTimeout(() => this.router.navigate(['/dashboard']), 1200);
        },
        error: (error) => {
          console.error('OAuth registration error', error);
          this.submissionError.set(
            error.error?.message || 'We could not finalize your registration. Please try again.',
          );
          this.statusMessage.set('');
          this.isSubmitting.set(false);
        },
      });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  requestAccess(): void {
    window.location.href = `mailto:${this.supportEmail}?subject=Bank%20access%20request`;
  }

  private decodeToken(token: string): OauthRegistrationPreview | null {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) {
        return null;
      }

      const normalized = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(normalized));
      return decoded as OauthRegistrationPreview;
    } catch (error) {
      console.error('Failed to decode OAuth token', error);
      return null;
    }
  }
}
