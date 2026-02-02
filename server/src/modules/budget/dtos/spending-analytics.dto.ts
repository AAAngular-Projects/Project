import { ApiProperty } from '@nestjs/swagger';
import { TransactionCategory } from 'common/constants';

export class SpendingAnalyticsDto {
  @ApiProperty()
  readonly budgetId: number;

  @ApiProperty({ enum: TransactionCategory })
  readonly category: TransactionCategory;

  @ApiProperty()
  readonly limitAmount: number;

  @ApiProperty()
  readonly spentAmount: number;

  @ApiProperty()
  readonly remainingAmount: number;

  @ApiProperty()
  readonly percentageUsed: number;
}
