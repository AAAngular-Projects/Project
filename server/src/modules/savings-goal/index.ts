import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavingsGoalController } from 'modules/savings-goal/controllers';
import { SavingsGoalRepository } from 'modules/savings-goal/repositories';
import { SavingsGoalService } from 'modules/savings-goal/services';
import { CurrencyRepository } from 'modules/currency/repositories';
import { BillRepository } from 'modules/bill/repositories';
import { CurrencyModule } from 'modules/currency';
import { BillModule } from 'modules/bill';
import { UserModule } from 'modules/user';

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => CurrencyModule),
    forwardRef(() => BillModule),
    TypeOrmModule.forFeature([
      SavingsGoalRepository,
      CurrencyRepository,
      BillRepository,
    ]),
  ],
  controllers: [SavingsGoalController],
  exports: [SavingsGoalService],
  providers: [SavingsGoalService],
})
export class SavingsGoalModule {}
