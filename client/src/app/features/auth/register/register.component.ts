import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, CurrencyService } from '../../../core/services';
import { CurrencyOption, RegisterRequest } from '../../../core/models';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { AuthCardComponent } from '../../../shared/components/auth-card/auth-card.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeaderComponent, AuthCardComponent, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly currencyService = inject(CurrencyService);
  private readonly router = inject(Router);

  readonly currencies = signal<CurrencyOption[]>([]);
  readonly isLoadingCurrencies = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly successMessage = signal<string>('');
  readonly currentStep = signal<number>(1);
  readonly totalSteps = 3;

  readonly registerForm = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    currency: ['', [Validators.required]],
  });

  ngOnInit(): void {
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
        console.error('Unable to load currencies', error);
        this.errorMessage.set('Unable to load currencies. Please try again later.');
        this.isLoadingCurrencies.set(false);
      },
    });
  }

  submit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.isSubmitting.set(true);

    const payload = this.registerForm.getRawValue() as RegisterRequest;

    this.authService.register(payload).subscribe({
      next: () => {
        this.successMessage.set('Account created! Your PIN code has been sent to your email.');
        this.isSubmitting.set(false);
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (error) => {
        console.error('Register error:', error);
        this.errorMessage.set(
          error.error?.message || 'Registration failed. Please verify your inputs.',
        );
        this.isSubmitting.set(false);
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  loginWithGoogle(): void {
    this.authService.startOAuthLogin('google');
  }

  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      if (this.isStepValid(this.currentStep())) {
        this.currentStep.set(this.currentStep() + 1);
        this.errorMessage.set('');
      } else {
        this.markStepAsTouched(this.currentStep());
      }
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
      this.errorMessage.set('');
    }
  }

  isStepValid(step: number): boolean {
    switch (step) {
      case 1:
        return !!(this.registerForm.get('firstName')?.valid && this.registerForm.get('lastName')?.valid);
      case 2:
        return !!(this.registerForm.get('email')?.valid && this.registerForm.get('password')?.valid);
      case 3:
        return !!this.registerForm.get('currency')?.valid;
      default:
        return false;
    }
  }

  markStepAsTouched(step: number): void {
    switch (step) {
      case 1:
        this.registerForm.get('firstName')?.markAsTouched();
        this.registerForm.get('lastName')?.markAsTouched();
        break;
      case 2:
        this.registerForm.get('email')?.markAsTouched();
        this.registerForm.get('password')?.markAsTouched();
        break;
      case 3:
        this.registerForm.get('currency')?.markAsTouched();
        break;
    }
  }
}
