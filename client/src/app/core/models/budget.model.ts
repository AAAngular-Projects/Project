import { EntityModel, User } from './user.model';
import { TransactionCategory } from './transaction.model';

export interface Budget extends EntityModel {
  id: number;
  category: TransactionCategory;
  limitAmount: number;
  spentAmount: number;
  month: number;
  year: number;
  user: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudget {
  category: TransactionCategory;
  limitAmount: number;
  month: number;
  year: number;
}

export interface UpdateBudget {
  limitAmount?: number;
}

export interface SpendingAnalytics {
  budgetId: number;
  category: TransactionCategory;
  limitAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
}
