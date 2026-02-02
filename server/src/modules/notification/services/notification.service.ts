import { Injectable, Logger } from '@nestjs/common';
import { UserEntity } from 'modules/user/entities';
import { TransactionService } from 'modules/transaction/services';
import {
  TransactionsPageDto,
  TransactionsPageOptionsDto,
} from 'modules/transaction/dtos';

interface CacheEntry {
  data: TransactionsPageDto;
  timestamp: number;
  userId: number;
  page: number;
}

@Injectable()
export class NotificationService {
  private readonly _logger = new Logger(NotificationService.name);
  private readonly _cache = new Map<string, CacheEntry>();
  private readonly _cacheMaxAge = 30 * 1000; // 30 seconds cache
  private readonly _maxCacheSize = 100;

  constructor(private readonly _transactionService: TransactionService) {}

  public async getNotifications(
    user: UserEntity,
    pageOptionsDto: TransactionsPageOptionsDto,
  ): Promise<TransactionsPageDto> {
    const cacheKey = `${user.id}_${pageOptionsDto.page}_${pageOptionsDto.take}`;
    
    // Check cache first
    const cached = this._cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this._cacheMaxAge) {
      this._logger.debug(`Returning cached notifications for user ${user.id}`);
      return cached.data;
    }

    // Clear old cache entries if needed
    if (this._cache.size > this._maxCacheSize) {
      this._clearOldCache();
    }

    // Fetch fresh data
    try {
      const notifications = await this._transactionService.getTransactionsForNotifications(
        user,
        pageOptionsDto,
      );

      // Cache the result
      this._cache.set(cacheKey, {
        data: notifications,
        timestamp: Date.now(),
        userId: user.id,
        page: pageOptionsDto.page,
      });

      return notifications;
    } catch (error) {
      this._logger.error(`Failed to fetch notifications for user ${user.id}:`, error);
      throw error;
    }
  }

  public invalidateUserCache(userId: number): void {
    for (const [key, entry] of this._cache.entries()) {
      if (entry.userId === userId) {
        this._cache.delete(key);
      }
    }
  }

  private _clearOldCache(): void {
    const now = Date.now();
    for (const [key, entry] of this._cache.entries()) {
      if (now - entry.timestamp > this._cacheMaxAge) {
        this._cache.delete(key);
      }
    }
  }
}