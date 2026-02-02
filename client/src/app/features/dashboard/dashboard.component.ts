import { Component, inject, signal, effect, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DashboardService, AuthService, AccountsService, TransactionService } from '../../core/services';
import { Account, SearchBillResult, TransferLocale } from '../../core/models';
import { Chart, registerables } from 'chart.js';
import { ExchangeRateChartComponent } from './exchange-rate-chart/exchange-rate-chart.component';
import { TransactionConfirmationComponent, TransactionSummary } from '@shared/components/transaction-confirmation/transaction-confirmation.component';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError } from 'rxjs/operators';

type TransferStep = 'form' | 'confirm' | 'success';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, CurrencyPipe, DatePipe, ExchangeRateChartComponent, ReactiveFormsModule, TransactionConfirmationComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly accountsService = inject(AccountsService);
  private readonly transactionService = inject(TransactionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  @ViewChild('balanceChart', { static: false }) balanceChartRef!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

  // Resources from service (using Angular Resource API)
  accountBalance = this.dashboardService.accountBalance;
  availableFunds = this.dashboardService.availableFunds;
  bills = this.dashboardService.bills;
  balanceHistory = this.dashboardService.balanceHistory;
  recentTransactions = this.dashboardService.recentTransactions;

  // Current user from auth service
  currentUser = this.authService.currentUser;

  // Transfer modal signals
  showTransferModal = signal(false);
  transferStep = signal<TransferStep>('form');
  senderAccounts = signal<Account[]>([]);
  recipientSearchResults = signal<SearchBillResult[]>([]);
  searchLoading = signal(false);
  transferLoading = signal(false);
  selectedRecipient = signal<SearchBillResult | null>(null);
  transferError = signal<string | null>(null);
  pendingTransaction = signal<TransactionSummary | null>(null);

  // Transfer form
  transferForm = this.fb.group({
    senderBill: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    note: ['', [Validators.required, Validators.minLength(1)]],
    locale: [TransferLocale.EN as TransferLocale, Validators.required]
  });

  // Search control with debounce
  recipientSearchControl = new FormControl('');

  // Available languages for transfer
  readonly languages = [
    { value: TransferLocale.EN, label: 'English' },
    { value: TransferLocale.DE, label: 'German' },
    { value: TransferLocale.PL, label: 'Polish' }
  ];
  
  constructor() {
    effect(() => {
      const history = this.balanceHistory();
      if (history && Array.isArray(history) && history.length > 0) {
        if (this.balanceChartRef?.nativeElement) {
          setTimeout(() => this.createOrUpdateChart(history), 100);
        }
      }
    });

    // Setup debounced recipient search
    this.recipientSearchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(value => !!value && value.length >= 2),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(searchTerm => {
      this.onRecipientSearch(searchTerm!);
    });
  }
  
  ngOnInit(): void {
    this.dashboardService.loadDashboardData();
  }
  
  ngAfterViewInit(): void {
    setTimeout(() => {
      const history = this.balanceHistory();
      if (history && Array.isArray(history) && history.length > 0) {
        this.createOrUpdateChart(history);
      }
    }, 500);
  }
  
  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }
  
  private createOrUpdateChart(data: any[]): void {
    if (!this.balanceChartRef?.nativeElement) return;
    if (!data || data.length === 0) return;
    
    const ctx = this.balanceChartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    
    // Destroy existing chart
    if (this.chart) {
      this.chart.destroy();
    }
    
    // Create new chart
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((item, index) => {
          if (item.date) {
            return new Date(item.date).toLocaleDateString();
          }
          return `Point ${index + 1}`;
        }),
        datasets: [{
          label: 'Account Balance',
          data: data.map(item => Number(item.balance) || 0),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              callback: function(value) {
                return '$' + Number(value).toLocaleString();
              }
            }
          }
        }
      }
    });
  }
  
  navigateToTransactions(): void {
    this.router.navigate(['/transactions']);
  }
  
  navigateToAccounts(): void {
    this.router.navigate(['/accounts']);
  }
  
  navigateToSettings(): void {
    this.router.navigate(['/settings']);
  }
  
  makeTransfer(): void {
    this.openTransferModal();
  }

  openTransferModal(): void {
    this.showTransferModal.set(true);
    this.transferStep.set('form');
    this.transferError.set(null);
    this.pendingTransaction.set(null);
    this.selectedRecipient.set(null);
    this.recipientSearchResults.set([]);
    this.recipientSearchControl.setValue('');
    this.transferForm.reset({ locale: TransferLocale.EN });

    // Load user accounts
    this.accountsService.getAccounts().subscribe({
      next: (response) => {
        this.senderAccounts.set(response.data);
      },
      error: (error) => {
        console.error('Error loading accounts:', error);
        this.transferError.set('Failed to load accounts');
      }
    });
  }

  closeTransferModal(): void {
    this.showTransferModal.set(false);
    this.transferStep.set('form');
    this.transferForm.reset();
    this.selectedRecipient.set(null);
    this.recipientSearchResults.set([]);
    this.transferError.set(null);
    this.pendingTransaction.set(null);
  }

  onRecipientSearch(searchTerm: string): void {
    if (!searchTerm || searchTerm.length < 2) {
      this.recipientSearchResults.set([]);
      return;
    }

    this.searchLoading.set(true);
    this.accountsService.searchBills(searchTerm).pipe(
      catchError(error => {
        console.error('Search error:', error);
        return of({ data: [] });
      })
    ).subscribe({
      next: (response) => {
        this.recipientSearchResults.set(response.data);
        this.searchLoading.set(false);
      },
      error: () => {
        this.searchLoading.set(false);
      }
    });
  }

  selectRecipient(recipient: SearchBillResult): void {
    this.selectedRecipient.set(recipient);
    this.recipientSearchResults.set([]);
    this.recipientSearchControl.setValue(recipient.accountBillNumber);
  }

  clearRecipient(): void {
    this.selectedRecipient.set(null);
    this.recipientSearchControl.setValue('');
    this.recipientSearchResults.set([]);
  }

  submitTransfer(): void {
    const recipient = this.selectedRecipient();
    if (!recipient) {
      this.transferError.set('Please select a recipient');
      return;
    }

    if (this.transferForm.invalid) {
      this.transferError.set('Please fill all required fields');
      return;
    }

    const formValue = this.transferForm.value;
    const senderAccount = this.senderAccounts().find(a => a.id === formValue.senderBill);

    this.transferLoading.set(true);
    this.transferError.set(null);

    this.transactionService.createTransaction({
      amountMoney: formValue.amount!,
      transferTitle: formValue.note!,
      senderBill: formValue.senderBill!,
      recipientBill: recipient.uuid,
      locale: formValue.locale!
    }).subscribe({
      next: (response) => {
        this.transferLoading.set(false);

        // Store transaction details for confirmation
        this.pendingTransaction.set({
          uuid: response.uuid,
          amountMoney: formValue.amount!,
          currencyName: senderAccount?.currency || 'USD',
          recipientName: recipient.user
            ? `${recipient.user.firstName} ${recipient.user.lastName}`
            : 'Unknown',
          transferTitle: formValue.note!
        });

        // Move to confirmation step
        this.transferStep.set('confirm');
      },
      error: (error) => {
        this.transferLoading.set(false);
        this.transferError.set(error.error?.message || 'Transfer failed. Please try again.');
      }
    });
  }

  onTransactionConfirmed(): void {
    // Component already shows success message, just close modal and refresh data
    this.dashboardService.loadDashboardData();
    this.closeTransferModal();
  }

  onConfirmationSkipped(): void {
    this.dashboardService.loadDashboardData();
    this.closeTransferModal();
  }

  onConfirmationCancelled(): void {
    // Go back to form step (though transaction is already created)
    this.dashboardService.loadDashboardData();
    this.closeTransferModal();
  }
}
