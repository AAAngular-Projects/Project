import { ApiProperty } from '@nestjs/swagger';
import { AbstractDto } from 'common/dtos';
import { SavingsGoalStatus } from 'common/constants';
import { UserDto } from 'modules/user/dtos';
import { CurrencyDto } from 'modules/currency/dtos';
import { SavingsGoalEntity } from 'modules/savings-goal/entities';

export class SavingsGoalDto extends AbstractDto {
  @ApiProperty()
  readonly name: string;

  @ApiProperty({ required: false })
  readonly description?: string;

  @ApiProperty()
  readonly targetAmount: number;

  @ApiProperty()
  readonly currentAmount: number;

  @ApiProperty({ required: false })
  readonly targetDate?: Date;

  @ApiProperty({ enum: SavingsGoalStatus })
  readonly status: SavingsGoalStatus;

  @ApiProperty({ type: () => UserDto })
  readonly user: UserDto;

  @ApiProperty({ type: () => CurrencyDto })
  readonly currency: CurrencyDto;

  @ApiProperty()
  readonly updatedAt: Date;

  constructor(savingsGoal: SavingsGoalEntity) {
    super(savingsGoal);
    this.name = savingsGoal.name;
    this.description = savingsGoal.description;
    this.targetAmount = savingsGoal.targetAmount;
    this.currentAmount = savingsGoal.currentAmount;
    this.targetDate = savingsGoal.targetDate;
    this.status = savingsGoal.status;
    this.user = savingsGoal.user.toDto();
    this.currency = savingsGoal.currency.toDto();
    this.updatedAt = savingsGoal.updatedAt;
  }
}
