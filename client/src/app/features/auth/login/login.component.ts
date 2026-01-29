import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services';
import { HeaderComponent } from '../../../shared/components/header/header.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeaderComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loginForm: FormGroup;
  forgotPasswordForm: FormGroup;
  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  isLoading = this.authService.isLoading;
  showForgotPassword = signal<boolean>(false);

  constructor() {
    this.loginForm = this.fb.group({
      pinCode: ['', [Validators.required, Validators.pattern(/^\d{4,6}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.forgotPasswordForm = this.fb.group({
      emailAddress: ['', [Validators.required, Validators.email]],
      locale: ['en', [Validators.required]]
    });
  }

  onPinInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, ''); // Only allow digits
    input.value = value;
    this.loginForm.patchValue({ pinCode: value });
  }

  onForgotPassword(): void {
    this.showForgotPassword.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  onCloseForgotPassword(): void {
    this.showForgotPassword.set(false);
    this.forgotPasswordForm.reset({ locale: 'en' });
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  onSubmitForgotPassword(): void {
    if (this.forgotPasswordForm.valid) {
      this.errorMessage.set('');
      this.successMessage.set('');
      
      this.authService.forgotPassword(this.forgotPasswordForm.value).subscribe({
        next: () => {
          this.successMessage.set('Password reset link has been sent to your email.');
          setTimeout(() => {
            this.onCloseForgotPassword();
          }, 3000);
        },
        error: (error) => {
          console.error('Forgot password error:', error);
          this.errorMessage.set(
            error.error?.message || 'Unable to process your request. Please try again.'
          );
        }
      });
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.errorMessage.set('');
      const { pinCode, password } = this.loginForm.value;
      
      this.authService.login({ 
        pinCode: parseInt(pinCode), // Convert to number
        password: password
      }).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.error('Login error:', error);
          this.errorMessage.set(
            error.error?.message || 'Invalid credentials. Please try again.'
          );
        }
      });
    }
  }

  loginWithGoogle(): void {
    this.authService.startOAuthLogin('google');
  }
}
