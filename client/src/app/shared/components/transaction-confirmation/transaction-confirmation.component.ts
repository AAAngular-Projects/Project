import { Component, inject, signal, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TransactionService } from '@core/services/transaction.service';

export interface TransactionSummary {
  uuid: string;
  amountMoney: number;
  currencyName: string;
  recipientName: string;
  transferTitle: string;
}

@Component({
  selector: 'app-transaction-confirmation',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './transaction-confirmation.component.html',
  styleUrls: ['./transaction-confirmation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionConfirmationComponent {
  private readonly transactionService = inject(TransactionService);
  private readonly fb = inject(FormBuilder);

  // Inputs
  readonly transaction = input.required<TransactionSummary>();
  readonly showSkipOption = input(false);

  // Outputs
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
  readonly skipped = output<void>();

  // State
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  // Form
  readonly confirmForm = this.fb.group({
    authorizationKey: ['', [Validators.required, Validators.minLength(1)]]
  });

  submitConfirmation(): void {
    if (this.confirmForm.invalid || this.loading()) {
      this.confirmForm.markAllAsTouched();
      return;
    }

    const authorizationKey = this.confirmForm.get('authorizationKey')?.value;
    if (!authorizationKey) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.transactionService.confirmTransaction(authorizationKey.trim()).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        setTimeout(() => {
          this.confirmed.emit();
        }, 1500);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Invalid authorization key. Please check and try again.');
      }
    });
  }

  onCancel(): void {
    if (!this.loading()) {
      this.cancelled.emit();
    }
  }

  onSkip(): void {
    if (!this.loading()) {
      this.skipped.emit();
    }
  }
}
