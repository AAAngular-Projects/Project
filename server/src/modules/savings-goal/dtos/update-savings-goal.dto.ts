import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsNumber,
  IsString,
  IsDate,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SavingsGoalStatus } from 'common/constants';

export class UpdateSavingsGoalDto {
  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  readonly name?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  readonly description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiProperty({ required: false })
  readonly targetAmount?: number;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  @ApiProperty({ required: false })
  readonly targetDate?: Date;

  @IsEnum(SavingsGoalStatus)
  @IsOptional()
  @ApiProperty({ enum: SavingsGoalStatus, required: false })
  readonly status?: SavingsGoalStatus;
}
