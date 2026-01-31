import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  ValidationPipe,
  Param,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrenciesPageDto,
  CurrenciesPageOptionsDto,
  CurrencyDto,
} from 'modules/currency/dtos';
import { CurrencyService } from 'modules/currency/services';

@Controller('Currencies')
@ApiTags('Currencies')
export class CurrencyController {
  constructor(private readonly _currencyService: CurrencyService) {}

  @Get('/')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get currency',
    type: CurrenciesPageDto,
  })
  async getAvailableCurrencies(
    @Query(new ValidationPipe({ transform: true }))
    pageOptionsDto: CurrenciesPageOptionsDto,
  ): Promise<CurrenciesPageDto> {
    return this._currencyService.getCurrencies(pageOptionsDto);
  }

  @Get('/:currencyId/exchange-rate-history')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get exchange rate history for a currency',
    type: [CurrencyDto],
  })
  async getExchangeRateHistory(
    @Param('currencyId') currencyId: string,
  ): Promise<CurrencyDto[]> {
    const currencies = await this._currencyService.getExchangeRateHistory(currencyId);
    return currencies.map(currency => currency.toDto());
  }
}
