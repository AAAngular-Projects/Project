import { ApiProperty } from '@nestjs/swagger';
import { AbstractDto } from 'common/dtos';
import { CurrencyEntity } from 'modules/currency/entities';

export class CurrencyDto extends AbstractDto {
  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly currentExchangeRate: number;

  @ApiProperty()
  readonly recordedAt: Date;

  constructor(currency: CurrencyEntity) {
    super(currency);
    this.name = currency.name;
    this.currentExchangeRate = currency.currentExchangeRate;
    this.recordedAt = currency.recordedAt;
  }
}
