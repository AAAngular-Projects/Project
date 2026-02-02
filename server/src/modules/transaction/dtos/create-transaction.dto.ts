import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsEnum, IsOptional } from 'class-validator';
import { Language } from 'common/constants/language.constant';
import { TransactionCategory } from 'common/constants';

export class CreateTransactionDto {
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty()
  readonly amountMoney: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly transferTitle: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly senderBill: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly recipientBill: string;

  @ApiProperty({
    enum: Language,
  })
  @IsEnum(Language)
  readonly locale: Language;

  @ApiProperty({
    enum: TransactionCategory,
    required: false,
  })
  @IsEnum(TransactionCategory)
  @IsOptional()
  readonly category?: TransactionCategory;
}
