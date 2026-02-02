import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
import { SavingsGoalService } from '@core/services';
import {
  SavingsGoal,
  CreateSavingsGoal,
  SavingsGoalStatus,
} from '@core/models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-savings-goals',
  templateUrl: './savings-goals.component.html',
  styleUrls: ['./savings-goals.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class SavingsGoalsComponent {
  private readonly savingsGoalService = inject(SavingsGoalService);

  protected readonly savingsGoals = signal<SavingsGoal[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly showCreateForm = signal(false);
  protected readonly SavingsGoalStatus = SavingsGoalStatus;

  protected readonly activeSavingsGoals = computed(() =>
    this.savingsGoals().filter((goal) => goal.status === SavingsGoalStatus.ACTIVE)
  );

  protected readonly completedSavingsGoals = computed(() =>
    this.savingsGoals().filter((goal) => goal.status === SavingsGoalStatus.COMPLETED)
  );

  protected readonly newGoal = signal<Partial<CreateSavingsGoal>>({
    name: '',
    description: '',
    targetAmount: 0,
    currencyId: 1,
  });

  protected readonly depositAmounts = signal<Record<string, number>>({});
  protected readonly withdrawAmounts = signal<Record<string, number>>({});

  ngOnInit() {
    this.loadSavingsGoals();
  }

  loadSavingsGoals() {
    this.isLoading.set(true);
    this.savingsGoalService.getSavingsGoals().subscribe({
      next: (goals: SavingsGoal[]) => {
        this.savingsGoals.set(goals);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  toggleCreateForm() {
    this.showCreateForm.update((show) => !show);
  }

  createSavingsGoal() {
    const goal = this.newGoal();
    if (!goal.name || !goal.targetAmount) return;

    this.savingsGoalService.createSavingsGoal(goal as CreateSavingsGoal).subscribe({
      next: (created: SavingsGoal) => {
        this.savingsGoals.update((goals) => [...goals, created]);
        this.newGoal.set({
          name: '',
          description: '',
          targetAmount: 0,
          currencyId: 1,
        });
        this.showCreateForm.set(false);
      },
      error: () => {
        // handle error
      },
    });
  }

  depositToGoal(goalUuid: string) {
    const amount = this.depositAmounts()[goalUuid] || 0;
    if (amount <= 0) return;
    this.savingsGoalService.depositToSavingsGoal(goalUuid, { amount }).subscribe({
      next: (updated: SavingsGoal) => {
        this.savingsGoals.update((goals) =>
          goals.map((g) => (g.uuid === goalUuid ? updated : g))
        );
        // Reset the input
        this.depositAmounts.update(amounts => {
          const newAmounts = { ...amounts };
          delete newAmounts[goalUuid];
          return newAmounts;
        });
      },
      error: () => {
        // handle error
      },
    });
  }

  withdrawFromGoal(goalUuid: string) {
    const amount = this.withdrawAmounts()[goalUuid] || 0;
    if (amount <= 0) return;
    this.savingsGoalService.withdrawFromSavingsGoal(goalUuid, { amount }).subscribe({
      next: (updated: SavingsGoal) => {
        this.savingsGoals.update((goals) =>
          goals.map((g) => (g.uuid === goalUuid ? updated : g))
        );
        // Reset the input
        this.withdrawAmounts.update(amounts => {
          const newAmounts = { ...amounts };
          delete newAmounts[goalUuid];
          return newAmounts;
        });
      },
      error: () => {
        // handle error
      },
    });
  }

  deleteGoal(goalUuid: string) {
    if (!confirm('Are you sure you want to delete this savings goal? Funds will be returned to your account.')) {
      return;
    }
    this.savingsGoalService.deleteSavingsGoal(goalUuid).subscribe({
      next: () => {
        this.savingsGoals.update((goals) => goals.filter((g) => g.uuid !== goalUuid));
      },
      error: () => {
        // handle error
      },
    });
  }

  onGoalNameInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.newGoal.update((g) => ({ ...g, name: value }));
  }

  onGoalDescriptionInput(event: Event) {
    const value = (event.target as HTMLTextAreaElement).value;
    this.newGoal.update((g) => ({ ...g, description: value }));
  }

  onTargetAmountInput(event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.newGoal.update((g) => ({ ...g, targetAmount: value }));
  }

  onTargetDateInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.newGoal.update((g) => ({ ...g, targetDate: value }));
  }

  calculateProgress(goal: SavingsGoal): number {
    return goal.targetAmount > 0
      ? Math.round((goal.currentAmount / goal.targetAmount) * 100)
      : 0;
  }

  onDepositAmountInput(goalUuid: string, event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.depositAmounts.update(amounts => ({ ...amounts, [goalUuid]: value }));
  }

  onWithdrawAmountInput(goalUuid: string, event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.withdrawAmounts.update(amounts => ({ ...amounts, [goalUuid]: value }));
  }
}
