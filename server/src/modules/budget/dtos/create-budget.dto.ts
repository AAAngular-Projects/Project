import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { TransactionCategory } from 'common/constants';

export class CreateBudgetDto {
  @IsEnum(TransactionCategory)
  @IsNotEmpty()
  @ApiProperty({ enum: TransactionCategory })
  readonly category: TransactionCategory;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  @ApiProperty()
  readonly limitAmount: number;

  @IsNumber()
  @Min(1)
  @Max(12)
  @IsNotEmpty()
  @ApiProperty()
  readonly month: number;

  @IsNumber()
  @Min(2000)
  @IsNotEmpty()
  @ApiProperty()
  readonly year: number;
}
