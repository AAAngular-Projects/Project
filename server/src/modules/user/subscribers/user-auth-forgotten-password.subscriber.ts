import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { UserAuthForgottenPasswordEntity } from '../entities';

@EventSubscriber()
export class UserAuthForgottenPasswordSubscriber
  implements EntitySubscriberInterface<UserAuthForgottenPasswordEntity> {
  listenTo() {
    return UserAuthForgottenPasswordEntity;
  }

  async beforeInsert({
    entity,
  }: InsertEvent<UserAuthForgottenPasswordEntity>): Promise<void> {
    if (entity.hashedToken) {
      entity.hashedToken = entity.hashedToken.trim();
    }
  }

  async beforeUpdate({
    entity,
  }: UpdateEvent<UserAuthForgottenPasswordEntity>): Promise<void> {
    if (entity.hashedToken) {
      entity.hashedToken = entity.hashedToken.trim();
    }
  }
}
