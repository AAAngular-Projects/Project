import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  resetForm!: FormGroup;
  token = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  ngOnInit(): void {
    // Get token from URL query parameter
    this.route.queryParams.subscribe(params => {
      const tokenParam = params['token'];
      if (tokenParam) {
        this.token.set(tokenParam);
      } else {
        this.errorMessage.set('Invalid or missing reset token');
      }
    });

    this.initializeForm();
  }

  private initializeForm(): void {
    this.resetForm = this.fb.group({
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      ]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(value => !value);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update(value => !value);
  }

  onSubmit(): void {
    if (this.resetForm.invalid || !this.token() || this.isLoading()) {
      console.log('Form submission prevented:', {
        invalid: this.resetForm.invalid,
        noToken: !this.token(),
        loading: this.isLoading()
      });
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const password = this.resetForm.get('password')?.value;
    const token = this.token()!;

    console.log('Submitting reset password:', { 
      passwordLength: password?.length, 
      tokenLength: token?.length,
      hasPassword: !!password,
      hasToken: !!token
    });

    this.authService.resetPassword(token, password).subscribe({
      next: () => {
        console.log('Password reset successful');
        this.isLoading.set(false);
        this.successMessage.set('Password reset successfully! Redirecting to login...');
        
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error) => {
        console.error('Reset password error:', error);
        this.isLoading.set(false);
        this.errorMessage.set(error?.error?.message || 'Failed to reset password. Please try again.');
      }
    });
  }

  get password() {
    return this.resetForm.get('password');
  }

  get confirmPassword() {
    return this.resetForm.get('confirmPassword');
  }

  get passwordMismatch() {
    return this.resetForm.hasError('passwordMismatch') && 
           this.resetForm.get('confirmPassword')?.touched;
  }
}
