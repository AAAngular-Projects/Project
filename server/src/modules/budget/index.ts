import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetController } from 'modules/budget/controllers';
import { BudgetRepository } from 'modules/budget/repositories';
import { BudgetService } from 'modules/budget/services';
import { TransactionRepository } from 'modules/transaction/repositories';
import { TransactionModule } from 'modules/transaction';
import { UserModule } from 'modules/user';

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => TransactionModule),
    TypeOrmModule.forFeature([BudgetRepository, TransactionRepository]),
  ],
  controllers: [BudgetController],
  exports: [BudgetService],
  providers: [BudgetService],
})
export class BudgetModule {}
