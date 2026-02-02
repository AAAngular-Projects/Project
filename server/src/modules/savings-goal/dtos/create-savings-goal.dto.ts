import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsDate,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSavingsGoalDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly name: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  readonly description?: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  @ApiProperty()
  readonly targetAmount: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty()
  readonly currencyId: number;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  @ApiProperty({ required: false })
  readonly targetDate?: Date;
}
