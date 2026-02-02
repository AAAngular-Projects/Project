import { Module } from '@nestjs/common';

import { TransactionModule } from 'modules/transaction';
import { NotificationController } from './controllers/notification.controller';
import { UserModule } from 'modules/user';
import { NotificationService } from './services';

@Module({
  imports: [TransactionModule, UserModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
