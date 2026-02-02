import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateBudgetDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiProperty({ required: false })
  readonly limitAmount?: number;
}
