import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class DepositWithdrawSavingsGoalDto {
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  @ApiProperty()
  readonly amount: number;
}
