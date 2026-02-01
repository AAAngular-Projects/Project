import { EntityModel, Currency, User } from './user.model';

export enum SavingsGoalStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface SavingsGoal extends EntityModel {
  id: number;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  status: SavingsGoalStatus;
  user: User;
  currency: Currency;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavingsGoal {
  name: string;
  description?: string;
  targetAmount: number;
  currencyId: number;
  targetDate?: string;
}

export interface UpdateSavingsGoal {
  name?: string;
  description?: string;
  targetAmount?: number;
  targetDate?: string;
  status?: SavingsGoalStatus;
}

export interface DepositWithdrawSavingsGoal {
  amount: number;
}
