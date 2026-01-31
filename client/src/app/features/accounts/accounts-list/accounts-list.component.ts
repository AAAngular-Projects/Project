import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountsService } from '@core/services/accounts.service';
import { Account, AccountType } from '@core/models';
import { MaskAccountNumberPipe } from '@shared/pipes/mask-account-number.pipe';

@Component({
  selector: 'app-accounts-list',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MaskAccountNumberPipe],
  templateUrl: './accounts-list.component.html',
  styleUrls: ['./accounts-list.component.scss']
})
export class AccountsListComponent implements OnInit {
  private readonly accountsService = inject(AccountsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  
  accounts = signal<Account[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  AccountType = AccountType;

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.accountsService.getAccounts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (response: any) => {
        this.accounts.set(response.data);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set('Failed to load accounts. Please try again.');
        this.loading.set(false);
        console.error('Error loading accounts:', err);
      }
    });
  }

  getAccountIcon(accountType: AccountType): string {
    switch (accountType) {
      case AccountType.CHECKING:
        return 'credit-card';
      case AccountType.SAVINGS:
        return 'piggy-bank';
      case AccountType.CREDIT:
        return 'diamond';
      default:
        return 'wallet';
    }
  }

  getAccountTypeClass(accountType: AccountType): string {
    switch (accountType) {
      case AccountType.CHECKING:
        return 'checking';
      case AccountType.SAVINGS:
        return 'savings';
      case AccountType.CREDIT:
        return 'credit';
      default:
        return '';
    }
  }

  trackByAccountId(index: number, account: Account): string {
    return account.id;
  }

  isAccountSelected(accountId: string): boolean {
    return this.accountsService.selectedAccountId() === accountId;
  }
}
