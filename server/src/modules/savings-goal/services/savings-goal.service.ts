import { Injectable, Logger } from '@nestjs/common';
import { SavingsGoalStatus } from 'common/constants';
import {
  CreateFailedException,
  AmountMoneyNotEnoughException,
} from 'exceptions';
import {
  CreateSavingsGoalDto,
  UpdateSavingsGoalDto,
  DepositWithdrawSavingsGoalDto,
  SavingsGoalDto,
} from 'modules/savings-goal/dtos';
import { SavingsGoalEntity } from 'modules/savings-goal/entities';
import { SavingsGoalRepository } from 'modules/savings-goal/repositories';
import { UserEntity } from 'modules/user/entities';
import { CurrencyRepository } from 'modules/currency/repositories';
import { BillRepository } from 'modules/bill/repositories';
import { UpdateResult } from 'typeorm';
import { Transactional } from 'typeorm-transactional-cls-hooked';

@Injectable()
export class SavingsGoalService {
  private readonly _logger = new Logger(SavingsGoalService.name);

  constructor(
    private readonly _savingsGoalRepository: SavingsGoalRepository,
    private readonly _currencyRepository: CurrencyRepository,
    private readonly _billRepository: BillRepository,
  ) {}

  public async getSavingsGoals(user: UserEntity): Promise<SavingsGoalDto[]> {
    const savingsGoals = await this._savingsGoalRepository
      .createQueryBuilder('savingsGoals')
      .leftJoinAndSelect('savingsGoals.user', 'user')
      .leftJoinAndSelect('savingsGoals.currency', 'currency')
      .where('user.id = :userId', { userId: user.id })
      .orderBy('savingsGoals.createdAt', 'DESC')
      .getMany();

    return savingsGoals.map((goal) => goal.toDto());
  }

  public async getSavingsGoalById(
    user: UserEntity,
    uuid: string,
  ): Promise<SavingsGoalDto | undefined> {
    const savingsGoal = await this._savingsGoalRepository
      .createQueryBuilder('savingsGoals')
      .leftJoinAndSelect('savingsGoals.user', 'user')
      .leftJoinAndSelect('savingsGoals.currency', 'currency')
      .where('savingsGoals.uuid = :uuid', { uuid })
      .andWhere('user.id = :userId', { userId: user.id })
      .getOne();

    return savingsGoal?.toDto();
  }

  @Transactional()
  public async createSavingsGoal(
    user: UserEntity,
    createSavingsGoalDto: CreateSavingsGoalDto,
  ): Promise<SavingsGoalDto> {
    const currency = await this._currencyRepository.findOne(
      createSavingsGoalDto.currencyId,
    );

    if (!currency) {
      throw new CreateFailedException('Currency not found');
    }

    const savingsGoal = this._savingsGoalRepository.create({
      name: createSavingsGoalDto.name,
      description: createSavingsGoalDto.description,
      targetAmount: createSavingsGoalDto.targetAmount,
      currentAmount: 0,
      targetDate: createSavingsGoalDto.targetDate,
      status: SavingsGoalStatus.ACTIVE,
      user,
      currency,
    });

    const savedGoal = await this._savingsGoalRepository.save(savingsGoal);
    return savedGoal.toDto();
  }

  @Transactional()
  public async updateSavingsGoal(
    user: UserEntity,
    uuid: string,
    updateSavingsGoalDto: UpdateSavingsGoalDto,
  ): Promise<UpdateResult> {
    const savingsGoal = await this._savingsGoalRepository.findOne({
      where: { uuid, user: { id: user.id } },
    });

    if (!savingsGoal) {
      throw new CreateFailedException('Savings goal not found');
    }

    return await this._savingsGoalRepository.update({ uuid }, updateSavingsGoalDto);
  }

  @Transactional()
  public async depositToSavingsGoal(
    user: UserEntity,
    uuid: string,
    depositDto: DepositWithdrawSavingsGoalDto,
  ): Promise<SavingsGoalDto> {
    const savingsGoal = await this._savingsGoalRepository
      .createQueryBuilder('savingsGoals')
      .leftJoinAndSelect('savingsGoals.user', 'user')
      .leftJoinAndSelect('savingsGoals.currency', 'currency')
      .where('savingsGoals.uuid = :uuid', { uuid })
      .andWhere('user.id = :userId', { userId: user.id })
      .getOne();

    if (!savingsGoal) {
      throw new CreateFailedException('Savings goal not found');
    }

    // Find all user bills
    const allBills = await this._billRepository.find({ where: { user: { id: user.id } }, relations: ['currency'] });

    // Try to find bill with matching currency
    let bill = allBills.find(b => b.currency.id === savingsGoal.currency.id);
    // If not found, but user has only one bill, use it as fallback
    if (!bill && allBills.length === 1) {
      bill = allBills[0];
    }

    if (!bill || bill.availableFunds < depositDto.amount) {
      throw new AmountMoneyNotEnoughException();
    }

    // Deduct from bill
    bill.availableFunds = Number(bill.availableFunds) - Number(depositDto.amount);
    await this._billRepository.save(bill);

    // Add to savings goal
    savingsGoal.currentAmount = Number(savingsGoal.currentAmount) + Number(depositDto.amount);

    // Check if goal is completed
    if (savingsGoal.currentAmount >= savingsGoal.targetAmount) {
      savingsGoal.status = SavingsGoalStatus.COMPLETED;
    }

    const updated = await this._savingsGoalRepository.save(savingsGoal);
    return updated.toDto();
  }

  @Transactional()
  public async withdrawFromSavingsGoal(
    user: UserEntity,
    uuid: string,
    withdrawDto: DepositWithdrawSavingsGoalDto,
  ): Promise<SavingsGoalDto> {
    const savingsGoal = await this._savingsGoalRepository
      .createQueryBuilder('savingsGoals')
      .leftJoinAndSelect('savingsGoals.user', 'user')
      .leftJoinAndSelect('savingsGoals.currency', 'currency')
      .where('savingsGoals.uuid = :uuid', { uuid })
      .andWhere('user.id = :userId', { userId: user.id })
      .getOne();

    if (!savingsGoal) {
      throw new CreateFailedException('Savings goal not found');
    }

    if (savingsGoal.currentAmount < withdrawDto.amount) {
      throw new AmountMoneyNotEnoughException();
    }

    // Find all user bills
    const allBills = await this._billRepository.find({ where: { user: { id: user.id } }, relations: ['currency'] });

    // Try to find bill with matching currency
    let bill = allBills.find(b => b.currency.id === savingsGoal.currency.id);
    // If not found, but user has only one bill, use it as fallback
    if (!bill && allBills.length === 1) {
      bill = allBills[0];
    }

    if (!bill) {
      throw new CreateFailedException('Bill not found');
    }

    // Deduct from savings goal
    savingsGoal.currentAmount = Number(savingsGoal.currentAmount) - Number(withdrawDto.amount);

    // Update status if was completed
    if (savingsGoal.status === SavingsGoalStatus.COMPLETED) {
      savingsGoal.status = SavingsGoalStatus.ACTIVE;
    }

    // Add to bill
    bill.availableFunds = Number(bill.availableFunds) + Number(withdrawDto.amount);
    await this._billRepository.save(bill);

    const updated = await this._savingsGoalRepository.save(savingsGoal);
    return updated.toDto();
  }

  @Transactional()
  public async deleteSavingsGoal(
    user: UserEntity,
    uuid: string,
  ): Promise<void> {
    const savingsGoal = await this._savingsGoalRepository.findOne({
      where: { uuid, user: { id: user.id } },
      relations: ['currency', 'user'],
    });

    if (!savingsGoal) {
      throw new CreateFailedException('Savings goal not found');
    }

    // Return funds to user's bill if any
    if (savingsGoal.currentAmount > 0) {
      const bill = await this._billRepository.findOne({
        where: { user: { id: user.id }, currency: { id: savingsGoal.currency.id } },
      });

      if (bill) {
        bill.availableFunds += savingsGoal.currentAmount;
        await this._billRepository.save(bill);
      }
    }

    await this._savingsGoalRepository.delete({ uuid });
  }
}
