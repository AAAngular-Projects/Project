import { ApiPropertyOptional } from '@nestjs/swagger';
import { PageOptionsDto } from 'common/dtos';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum TransactionType {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
}

export class TransactionsPageOptionsDto extends PageOptionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly dateTo?: string;

  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  readonly type?: TransactionType;
}
