import { Injectable, Logger } from '@nestjs/common';
import { TransactionCategory } from 'common/constants';
import { CreateFailedException } from 'exceptions';
import {
  CreateBudgetDto,
  UpdateBudgetDto,
  BudgetDto,
  SpendingAnalyticsDto,
} from 'modules/budget/dtos';
import { BudgetEntity } from 'modules/budget/entities';
import { BudgetRepository } from 'modules/budget/repositories';
import { TransactionRepository } from 'modules/transaction/repositories';
import { UserEntity } from 'modules/user/entities';
import { UpdateResult } from 'typeorm';
import { Transactional } from 'typeorm-transactional-cls-hooked';

@Injectable()
export class BudgetService {
  private readonly _logger = new Logger(BudgetService.name);

  constructor(
    private readonly _budgetRepository: BudgetRepository,
    private readonly _transactionRepository: TransactionRepository,
  ) {}

  public async getBudgets(
    user: UserEntity,
    month?: number,
    year?: number,
  ): Promise<BudgetDto[]> {
    const currentDate = new Date();
    const targetMonth = month ?? currentDate.getMonth() + 1;
    const targetYear = year ?? currentDate.getFullYear();

    const queryBuilder = this._budgetRepository
      .createQueryBuilder('budgets')
      .leftJoinAndSelect('budgets.user', 'user')
      .where('user.id = :userId', { userId: user.id })
      .andWhere('budgets.month = :month', { month: targetMonth })
      .andWhere('budgets.year = :year', { year: targetYear })
      .orderBy('budgets.category', 'ASC');

    const budgets = await queryBuilder.getMany();
    return budgets.map((budget) => budget.toDto());
  }

  public async getBudgetById(
    user: UserEntity,
    id: number,
  ): Promise<BudgetDto | undefined> {
    const budget = await this._budgetRepository
      .createQueryBuilder('budgets')
      .leftJoinAndSelect('budgets.user', 'user')
      .where('budgets.id = :id', { id })
      .andWhere('user.id = :userId', { userId: user.id })
      .getOne();

    return budget?.toDto();
  }

  @Transactional()
  public async createBudget(
    user: UserEntity,
    createBudgetDto: CreateBudgetDto,
  ): Promise<BudgetDto> {
    // Check if budget already exists for this category, month, and year
    const existingBudget = await this._budgetRepository.findOne({
      where: {
        user: { id: user.id },
        category: createBudgetDto.category,
        month: createBudgetDto.month,
        year: createBudgetDto.year,
      },
    });

    if (existingBudget) {
      throw new CreateFailedException(
        'Budget already exists for this category and period',
      );
    }

    const budget = this._budgetRepository.create({
      category: createBudgetDto.category,
      limitAmount: createBudgetDto.limitAmount,
      spentAmount: 0,
      month: createBudgetDto.month,
      year: createBudgetDto.year,
      user,
    });

    const savedBudget = await this._budgetRepository.save(budget);
    return savedBudget.toDto();
  }

  @Transactional()
  public async updateBudget(
    user: UserEntity,
    id: number,
    updateBudgetDto: UpdateBudgetDto,
  ): Promise<UpdateResult> {
    const budget = await this._budgetRepository.findOne({
      where: { id, user: { id: user.id } },
    });

    if (!budget) {
      throw new CreateFailedException('Budget not found');
    }

    return await this._budgetRepository.update(id, updateBudgetDto);
  }

  @Transactional()
  public async deleteBudget(user: UserEntity, id: number): Promise<void> {
    const budget = await this._budgetRepository.findOne({
      where: { id, user: { id: user.id } },
    });

    if (!budget) {
      throw new CreateFailedException('Budget not found');
    }

    await this._budgetRepository.delete(id);
  }

  public async getSpendingAnalytics(
    user: UserEntity,
    month?: number,
    year?: number,
  ): Promise<SpendingAnalyticsDto[]> {
    const currentDate = new Date();
    const targetMonth = month ?? currentDate.getMonth() + 1;
    const targetYear = year ?? currentDate.getFullYear();

    // Get all budgets for the period
    const budgets = await this._budgetRepository.find({
      where: {
        user: { id: user.id },
        month: targetMonth,
        year: targetYear,
      },
    });

    // Calculate actual spending per category for the period
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const analytics: SpendingAnalyticsDto[] = [];

    for (const budget of budgets) {
      // Get actual spending for this category
      const result = await this._transactionRepository
        .createQueryBuilder('transactions')
        .select('SUM(transactions.amountMoney)', 'total')
        .leftJoin('transactions.senderBill', 'senderBill')
        .leftJoin('senderBill.user', 'user')
        .where('user.id = :userId', { userId: user.id })
        .andWhere('transactions.category = :category', {
          category: budget.category,
        })
        .andWhere('transactions.authorizationStatus = true')
        .andWhere('transactions.createdAt >= :startDate', { startDate })
        .andWhere('transactions.createdAt <= :endDate', { endDate })
        .getRawOne();

      const spentAmount = parseFloat(result?.total ?? 0);

      // Update budget spent amount
      budget.spentAmount = spentAmount;
      await this._budgetRepository.save(budget);

      const remainingAmount = budget.limitAmount - spentAmount;
      const percentageUsed =
        budget.limitAmount > 0
          ? Math.round((spentAmount / budget.limitAmount) * 100)
          : 0;

      analytics.push({
        budgetId: budget.id,
        category: budget.category,
        limitAmount: budget.limitAmount,
        spentAmount,
        remainingAmount,
        percentageUsed,
      });
    }

    return analytics;
  }
}
