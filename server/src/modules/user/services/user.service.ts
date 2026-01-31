import { Injectable } from '@nestjs/common';
import {
  CreateFailedException,
  EmailAddressExistException,
  CurrencyNotFoundException,
} from 'exceptions';
import { UserRegisterDto } from 'modules/auth/dtos';
import { BillService } from 'modules/bill/services';
import { UserUpdateDto } from 'modules/user/dtos';
import { UserEntity } from 'modules/user/entities';
import { UserRepository } from 'modules/user/repositories';
import { Transactional } from 'typeorm-transactional-cls-hooked';
import { UserAuthService } from './user-auth.service';
import { UserConfigService } from './user-config.service';
import { CurrencyService } from 'modules/currency/services';
import { MessageEntity } from 'modules/message/entities';
import { UserAuthForgottenPasswordService } from './user-auth-forgotten-password.service';

@Injectable()
export class UserService {
  constructor(
    private readonly _userRepository: UserRepository,
    private readonly _userAuthService: UserAuthService,
    private readonly _userConfigService: UserConfigService,
    private readonly _billService: BillService,
    private readonly _currencyService: CurrencyService,
    private readonly _userAuthForgottenPasswordService: UserAuthForgottenPasswordService,
  ) {}

  @Transactional()
  public async createUser(
    userRegisterDto: UserRegisterDto,
  ): Promise<UserEntity> {
    try {
      const user = this._userRepository.create(userRegisterDto);
      await this._userRepository.save(user);

      const createdUser = { ...userRegisterDto, user };

      const [authResult] = await Promise.all([
        this._userAuthService.createUserAuth(createdUser),
        this._userConfigService.createUserConfig(createdUser),
      ]);

      await this._billService.createAccountBill(createdUser);

      // Send PIN code via email
      const finalUser = await this.getUser({ uuid: user.uuid });
      this._userAuthForgottenPasswordService.sendPinCodeEmail(
        finalUser,
        authResult.pinCode,
        'en',
      );

      return finalUser;
    } catch (error) {
      throw new CreateFailedException(error);
    }
  }

  public async getUser(
    options: Partial<{ uuid: string; email: string }>,
  ): Promise<UserEntity | undefined> {
    const queryBuilder = this._userRepository.createQueryBuilder('user');

    queryBuilder
      .leftJoinAndSelect('user.userAuth', 'userAuth')
      .leftJoinAndSelect('user.userConfig', 'userConfig')
      .leftJoinAndSelect('userConfig.currency', 'currency');

    if (options.uuid) {
      queryBuilder
        .addSelect(
          (subQuery) =>
            subQuery
              .select(`COUNT(messages)`)
              .from(
                (subQuery2) =>
                  subQuery2
                    .select(`"messages"."id"`)
                    .from(MessageEntity, 'messages')
                    .leftJoin('messages.recipient', 'recipient')
                    .leftJoin('messages.sender', 'sender')
                    .leftJoin('messages.templates', 'templates')
                    .leftJoin('templates.language', 'language')
                    .where('recipient.uuid = :uuid', { uuid: options.uuid })
                    .andWhere('messages.readed = :readed', { readed: false })
                    .groupBy(`"messages"."id"`),
                'messages',
              ),
          'userConfig_message_count',
        );

      queryBuilder.orWhere('user.uuid = :uuid', { uuid: options.uuid });
    }

    if (options.email) {
      queryBuilder.orWhere('user.email = :email', {
        email: options.email,
      });
    }

    return queryBuilder.getOne();
  }

  public async getUsersCount(): Promise<number> {
    const queryBuilder = this._userRepository.createQueryBuilder('user');
    return queryBuilder.getCount();
  }

  public async getAllUsers(): Promise<UserEntity[]> {
    const queryBuilder = this._userRepository.createQueryBuilder('user');

    queryBuilder
      .leftJoinAndSelect('user.userAuth', 'userAuth')
      .leftJoinAndSelect('user.userConfig', 'userConfig')
      .leftJoinAndSelect('userConfig.currency', 'currency')
      .orderBy('user.createdAt', 'DESC');

    return queryBuilder.getMany();
  }

  public async deleteUser(uuid: string): Promise<void> {
    const user = await this.getUser({ uuid });
    if (user) {
      await this._userRepository.delete(user.id);
    }
  }

  public async updateUserData(
    user: UserEntity,
    userUpdateDto: UserUpdateDto,
  ): Promise<UserEntity> {
    if (userUpdateDto.email) {
      const isEmail = await this.getUser({ email: userUpdateDto.email });

      if (isEmail) {
        throw new EmailAddressExistException();
      }

      await this._userRepository.update(user.id, {
        email: userUpdateDto.email,
      });
    }

    if (userUpdateDto.lastName) {
      await this._userRepository.update(user.id, {
        lastName: userUpdateDto.lastName,
      });
    }

    if (userUpdateDto.password) {
      await this._userAuthService.updatePassword(
        user.userAuth,
        userUpdateDto.password,
      );
    }

    if (userUpdateDto.currency) {
      const currency = await this._currencyService.findCurrency({
        uuid: userUpdateDto.currency,
      });

      if (!currency) {
        throw new CurrencyNotFoundException();
      }

      await this._userConfigService.updateMainCurrency(
        user.userConfig,
        currency,
      );
    }

    return this.getUser({ uuid: user.uuid });
  }
}
