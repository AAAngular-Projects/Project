import {
  ChangeDetectionStrategy,
  Component,
  signal,
  computed,
  inject,
  effect,
  OnInit,
  ViewChild,
  ElementRef,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BudgetService } from '@core/services';
import { StorageService } from '@core/services';
import {
  Budget,
  CreateBudget,
  SpendingAnalytics,
  TransactionCategory,
} from '@core/models';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-budget-analytics',
  templateUrl: './budget-analytics.component.html',
  styleUrls: ['./budget-analytics.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class BudgetAnalyticsComponent implements OnInit {
  private _spendingChartRef: ElementRef<HTMLCanvasElement> | undefined;
  @ViewChild('spendingChart')
  set spendingChartRef(ref: ElementRef<HTMLCanvasElement> | undefined) {
    this._spendingChartRef = ref;
    if (ref) {
      // Destroy previous chart if it exists
      if (this.chart) {
        this.chart.destroy();
        this.chart = undefined;
        this.chartInitialized = false;
        console.log('[BudgetAnalytics] Previous chart destroyed');
      }
      this.initChart();
      this.chartInitialized = true;
      console.log('[BudgetAnalytics] Chart initialized via ViewChild setter:', this.chart);
    }
  }

  private readonly budgetService = inject(BudgetService);
  private readonly storage = inject(StorageService);
  private readonly platformId = inject(PLATFORM_ID);
  private chart?: Chart;
  private chartInitialized = false;

  protected readonly budgets = signal<Budget[]>([]);
  protected readonly analytics = signal<SpendingAnalytics[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly showCreateForm = signal(false);
  protected readonly hasUserSelectedPeriod = signal(false);
  protected readonly TransactionCategory = TransactionCategory;
  protected readonly categories = Object.values(TransactionCategory);
  protected readonly Math = Math;

  private readonly currentDate = new Date();
  protected readonly selectedMonth = signal(this.currentDate.getMonth() + 1);
  protected readonly selectedYear = signal(this.currentDate.getFullYear());

  protected readonly newBudget = signal<Partial<CreateBudget>>({
    category: TransactionCategory.OTHER,
    limitAmount: 0,
    month: this.selectedMonth(),
    year: this.selectedYear(),
  });

  protected readonly totalBudget = computed(() =>
    this.analytics().reduce((sum, a) => sum + a.limitAmount, 0)
  );

  protected readonly totalSpent = computed(() =>
    this.analytics().reduce((sum, a) => sum + a.spentAmount, 0)
  );

  protected readonly overallPercentage = computed(() => {
    const total = this.totalBudget();
    return total > 0 ? Math.round((this.totalSpent() / total) * 100) : 0;
  });

  // No need for viewInitialized or ngAfterViewInit

  constructor() {
    // Always update chart when analytics changes
    effect(() => {
      const analyticsData = this.analytics();
      // If chart is missing but canvas is available, re-init chart (handles navigation/SSR edge cases)
      if (!this.chart && this.spendingChartRef) {
        this.initChart();
        this.chartInitialized = true;
      }
      if (this.chart) {
        this.updateChart(analyticsData);
      }
    });
  }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      this.isLoading.set(false);
      return;
    }

    // Don't auto-load data - wait for user to select month/year
    this.isLoading.set(false);
  }

  // ngAfterViewInit removed; chart is now initialized by ViewChild setter

  loadBudgetsAndAnalytics() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.isLoading.set(true);
    const month = this.selectedMonth();
    const year = this.selectedYear();

    this.budgetService.getBudgets(month, year).subscribe({
      next: (budgets: Budget[]) => {
        console.log('✅ Budgets loaded:', budgets);
        this.budgets.set(budgets);
      },
      error: (err) => {
        console.error('❌ Error loading budgets:', err);
        console.error('Status:', err.status, 'Message:', err.message);
        this.isLoading.set(false);
      },
    });

    this.budgetService.getSpendingAnalytics(month, year).subscribe({
      next: (analytics: SpendingAnalytics[]) => {
        console.log('✅ Analytics loaded (raw):', analytics);
        // Convert all amounts to numbers to avoid string concatenation
        const normalizedAnalytics = analytics.map(a => ({
          ...a,
          limitAmount: Number(a.limitAmount) || 0,
          spentAmount: Number(a.spentAmount) || 0,
          remainingAmount: Number(a.remainingAmount) || 0,
          percentageUsed: Number(a.percentageUsed) || 0
        }));
        console.log('✅ Analytics normalized:', normalizedAnalytics);
        this.analytics.set(normalizedAnalytics);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading analytics:', err);
        console.error('Status:', err.status, 'Message:', err.message);
        this.isLoading.set(false);
      },
    });
  }

  toggleCreateForm() {
    this.showCreateForm.update((show) => !show);
  }

  createBudget() {
    const budget = this.newBudget();
    if (!budget.category || !budget.limitAmount) return;

    budget.month = this.selectedMonth();
    budget.year = this.selectedYear();

    this.budgetService.createBudget(budget as CreateBudget).subscribe({
      next: () => {
        this.loadBudgetsAndAnalytics();
        this.newBudget.set({
          category: TransactionCategory.OTHER,
          limitAmount: 0,
          month: this.selectedMonth(),
          year: this.selectedYear(),
        });
        this.showCreateForm.set(false);
      },
      error: () => {
        // handle error
      },
    });
  }

  deleteBudget(id: number | undefined) {
    console.log('deleteBudget called with id:', id);
    if (!id) {
      console.log('ID is undefined, returning early');
      return;
    }
    if (!confirm('Are you sure you want to delete this budget?')) {
      return;
    }
    console.log('Calling backend to delete budget:', id);
    this.budgetService.deleteBudget(id).subscribe({
      next: () => {
        console.log('Budget deleted successfully');
        this.loadBudgetsAndAnalytics();
      },
      error: (err) => {
        console.error('Error deleting budget:', err);
      },
    });
  }

  onMonthChange(event: Event) {
    const value = +(event.target as HTMLSelectElement).value;
    this.selectedMonth.set(value);
    this.hasUserSelectedPeriod.set(true);
    this.onMonthYearChange();
  }

  onYearInput(event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.selectedYear.set(value);
    this.hasUserSelectedPeriod.set(true);
    this.onMonthYearChange();
  }

  onCategoryChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as TransactionCategory;
    this.newBudget.update((b) => ({ ...b, category: value }));
  }

  onLimitAmountInput(event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.newBudget.update((b) => ({ ...b, limitAmount: value }));
  }

  onMonthYearChange() {
    this.loadBudgetsAndAnalytics();
  }

  getCategoryColor(category: TransactionCategory): string {
    const colors: Record<TransactionCategory, string> = {
      [TransactionCategory.FOOD]: '#FF6384',
      [TransactionCategory.RENT]: '#36A2EB',
      [TransactionCategory.SHOPPING]: '#FFCE56',
      [TransactionCategory.UTILITIES]: '#4BC0C0',
      [TransactionCategory.ENTERTAINMENT]: '#9966FF',
      [TransactionCategory.TRANSPORTATION]: '#FF9F40',
      [TransactionCategory.HEALTHCARE]: '#C9CBCF',
      [TransactionCategory.EDUCATION]: '#8E44AD',
      [TransactionCategory.SALARY]: '#4CAF50',
      [TransactionCategory.OTHER]: '#757575',
    };
    return colors[category] || '#757575';
  }

  private initChart() {
    if (!this._spendingChartRef) {
      console.warn('[BudgetAnalytics] initChart: spendingChartRef is undefined');
      return;
    }
    const ctx = this._spendingChartRef.nativeElement.getContext('2d');
    if (!ctx) {
      console.warn('[BudgetAnalytics] initChart: Canvas context is undefined');
      return;
    }
    console.log('[BudgetAnalytics] initChart: Creating Chart instance');
    const config: ChartConfiguration<'pie'> = {
      type: 'pie',
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            backgroundColor: [],
            borderWidth: 2,
            borderColor: '#fff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return `${label}: $${value.toFixed(2)} (${percentage}%)`;
              },
            },
          },
        },
      },
    };
    this.chart = new Chart(ctx, config);
    console.log('[BudgetAnalytics] initChart: Chart created', this.chart);
    // Always update chart, even if analytics is empty
    this.updateChart(this.analytics());
  }

  private updateChart(analytics: SpendingAnalytics[]) {
    console.log('updateChart called with analytics:', analytics);
    if (!this.chart) {
      console.log('Chart not initialized, skipping update');
      return;
    }

    // Filter to only show categories with actual spending
    const analyticsWithSpending = analytics.filter((a) => a.spentAmount > 0);
    console.log('Analytics with spending:', analyticsWithSpending);

    const labels = analyticsWithSpending.map((a) => a.category);
    const data = analyticsWithSpending.map((a) => a.spentAmount);
    const colors = analyticsWithSpending.map((a) => this.getCategoryColor(a.category));

    console.log('Chart data - labels:', labels, 'data:', data, 'colors:', colors);

    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = data;
    this.chart.data.datasets[0].backgroundColor = colors;
    this.chart.update();
    console.log('Chart updated');
  }
  getBudgetIdByCategory(category: TransactionCategory): number | undefined {
    const analytic = this.analytics().find((a: SpendingAnalytics) => a.category === category);
    console.log('getBudgetIdByCategory for', category, '- found:', analytic);
    console.log('Returning budget ID:', analytic?.budgetId);
    return analytic?.budgetId;
  }
}
