import { ApiProperty } from '@nestjs/swagger';
import { AbstractDto } from 'common/dtos';
import { TransactionCategory } from 'common/constants';
import { UserDto } from 'modules/user/dtos';
import { BudgetEntity } from 'modules/budget/entities';

export class BudgetDto extends AbstractDto {
  @ApiProperty({ enum: TransactionCategory })
  readonly category: TransactionCategory;

  @ApiProperty()
  readonly limitAmount: number;

  @ApiProperty()
  readonly spentAmount: number;

  @ApiProperty()
  readonly month: number;

  @ApiProperty()
  readonly year: number;

  @ApiProperty({ type: () => UserDto })
  readonly user: UserDto;

  @ApiProperty()
  readonly updatedAt: Date;

  constructor(budget: BudgetEntity) {
    super(budget);
    this.category = budget.category;
    this.limitAmount = budget.limitAmount;
    this.spentAmount = budget.spentAmount;
    this.month = budget.month;
    this.year = budget.year;
    this.user = budget.user.toDto();
    this.updatedAt = budget.updatedAt;
  }
}
