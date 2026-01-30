import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loginForm: FormGroup;
  errorMessage = signal<string>('');
  isLoading = this.authService.isLoading;

  constructor() {
    this.loginForm = this.fb.group({
      pinCode: ['', [Validators.required, Validators.pattern(/^\d{4,6}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onPinInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, ''); // Only allow digits
    input.value = value;
    this.loginForm.patchValue({ pinCode: value });
  }

  onForgotPassword(): void {
    // TODO: Implement forgot password navigation
    console.log('Forgot password clicked');
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
}
