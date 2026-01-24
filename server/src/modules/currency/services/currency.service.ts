import { HttpService, Injectable, Logger } from '@nestjs/common';
import { PageMetaDto } from 'common/dtos';
import { ForeignExchangeRatesNotFoundException } from 'exceptions';
import {
  CurrenciesPageDto,
  CurrenciesPageOptionsDto,
} from 'modules/currency/dtos';
import { CurrencyEntity } from 'modules/currency/entities';
import { CurrencyRepository } from 'modules/currency/repositories';

@Injectable()
export class CurrencyService {
  constructor(
    private readonly _currencyRepository: CurrencyRepository,
    private readonly _httpService: HttpService,
  ) {}

  private readonly _logger = new Logger(CurrencyService.name);

  public async getCurrencies(
    pageOptionsDto: CurrenciesPageOptionsDto,
  ): Promise<CurrenciesPageDto | undefined> {
    const queryBuilder = this._currencyRepository.createQueryBuilder(
      'currency',
    );

    const [currencies, currenciesCount] = await queryBuilder
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take)
      .getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      pageOptionsDto,
      itemCount: currenciesCount,
    });

    return new CurrenciesPageDto(currencies.toDtos(), pageMetaDto);
  }

  public async findCurrency(
    options: Partial<{ uuid: string; name: string }>,
  ): Promise<CurrencyEntity | undefined> {
    const queryBuilder = this._currencyRepository.createQueryBuilder(
      'currency',
    );

    if (options.uuid) {
      queryBuilder.orWhere('currency.uuid = :uuid', {
        uuid: options.uuid,
      });
    }

    if (options.name) {
      queryBuilder.orWhere('currency.name = :name', {
        name: options.name,
      });
    }

    return queryBuilder.getOne();
  }

  public async upsertCurrencyForeignExchangeRates(
    name: string,
    currentExchangeRate: number,
    base: boolean,
  ): Promise<void> {
    const queryBuilder = this._currencyRepository.createQueryBuilder(
      'currency',
    );

    await queryBuilder
      .insert()
      .values({ name, currentExchangeRate, base })
      .onConflict(
        `("name") DO UPDATE
                SET current_exchange_rate = :currentExchangeRate`,
      )
      .setParameter('currentExchangeRate', currentExchangeRate)
      .execute();
  }

  public async getCurrencyForeignExchangeRates() {
    try {
      const [EUR, USD] = await Promise.all([
        this.getCurrencyForeignExchangeRatesForEUR(),
        this.getCurrencyForeignExchangeRatesForUSD(),
      ]);

      const midEUR = 1 / ((EUR.rates[0].bid + EUR.rates[0].ask) / 2);
      const midUSD = 1 / ((USD.rates[0].bid + USD.rates[0].ask) / 2);

      return [
        { name: EUR.code, currentExchangeRate: midEUR },
        { name: USD.code, currentExchangeRate: midUSD },
      ];
    } catch (error) {
      this._logger.warn(
        'Foreign exchange API unavailable, using fallback currency rates',
      );
      return this._getFallbackCurrencyRates();
    }
  }

  private _getFallbackCurrencyRates() {
    // Safe defaults keep the app bootable when the public NBP API is offline.
    return [
      { name: 'EUR', currentExchangeRate: 1 },
      { name: 'USD', currentExchangeRate: 1 },
    ];
  }

  public async getCurrencyForeignExchangeRatesForUSD(): Promise<any> {
    const endpoint = `https://api.nbp.pl/api/exchangerates/rates/c/usd/today/?format=json`;

    return this._httpService
      .get(endpoint)
      .toPromise()
      .then((response) => response.data)
      .catch((error) => {
        throw new ForeignExchangeRatesNotFoundException(error);
      });
  }

  public async getCurrencyForeignExchangeRatesForEUR(): Promise<any> {
    const endpoint = `https://api.nbp.pl/api/exchangerates/rates/c/eur/today/?format=json`;

    return this._httpService
      .get(endpoint)
      .toPromise()
      .then((response) => response.data)
      .catch((error) => {
        throw new ForeignExchangeRatesNotFoundException(error);
      });
  }
}
