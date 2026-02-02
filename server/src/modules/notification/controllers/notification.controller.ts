import { ApiTags, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthUser, Roles } from 'decorators';
import { UserEntity } from 'modules/user/entities';
import { AuthGuard, RolesGuard } from 'guards';
import { AuthUserInterceptor } from 'interceptors';
import { RoleType } from 'common/constants';
import {
  TransactionsPageDto,
  TransactionsPageOptionsDto,
} from 'modules/transaction/dtos';
import { UserConfigService } from 'modules/user/services';
import { NotificationService } from '../services';

@Controller('Notifications')
@ApiTags('Notifications')
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(AuthUserInterceptor)
@ApiBearerAuth()
@Roles(RoleType.USER, RoleType.ADMIN, RoleType.ROOT)
export class NotificationController {
  constructor(
    private readonly _notificationService: NotificationService,
    private readonly _userConfigSerivce: UserConfigService,
  ) {}

  @Get('/')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleType.USER, RoleType.ADMIN, RoleType.ROOT)
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Notifications are the number of new transactions received. This may be changed.',
    type: TransactionsPageDto,
  })
  async getTransactions(
    @Query(new ValidationPipe({ transform: true }))
    pageOptionsDto: TransactionsPageOptionsDto,
    @AuthUser() user: UserEntity,
  ): Promise<TransactionsPageDto> {
    // Use optimized notification service with caching
    const transactions = await this._notificationService.getNotifications(user, pageOptionsDto);

    // Reset notification count asynchronously (don't wait for it)
    this._userConfigSerivce.setNotification(user.userConfig, true).catch(error => {
      console.error('Failed to reset notification count:', error);
    });

    return transactions;
  }
}
