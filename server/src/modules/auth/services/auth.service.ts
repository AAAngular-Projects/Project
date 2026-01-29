import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  UserNotFoundException,
  UserPasswordNotValidException,
} from 'exceptions';
import {
  ForgottenPasswordPayloadDto,
  TokenPayloadDto,
  UserForgottenPasswordDto,
  UserLoginDto,
} from 'modules/auth/dtos';
import {
  UserAuthForgottenPasswordEntity,
  UserEntity,
} from 'modules/user/entities';
import {
  UserAuthForgottenPasswordService,
  UserAuthService,
  UserService,
} from 'modules/user/services';
import { ContextService } from 'providers';
import { UtilsService } from 'utils/services';
import { ConfigService } from '@nestjs/config';
import {
  ForgottenTokenHasUsedException,
  WrongCredentialsProvidedException,
} from '../exceptions';
import { OauthProviderProfile } from 'modules/auth/interfaces/oauth-registration.interface';

@Injectable()
export class AuthService {
  private static _authUserKey = 'user_key';

  constructor(
    private readonly _jwtService: JwtService,
    private readonly _configService: ConfigService,
    private readonly _userService: UserService,
    private readonly _userAuthService: UserAuthService,
    private readonly _userAuthForgottenPasswordService: UserAuthForgottenPasswordService,
  ) {}

  public async createToken(user: UserEntity): Promise<TokenPayloadDto> {
    const {
      uuid,
      userAuth: { role },
    } = user;

    return new TokenPayloadDto({
      expiresIn: this._configService.get('JWT_EXPIRATION_TIME'),
      accessToken: await this._jwtService.signAsync({ uuid, role }),
    });
  }

  public async validateUser(userLoginDto: UserLoginDto): Promise<UserEntity> {
    const { pinCode, password } = userLoginDto;
    let user = await this._userAuthService.findUserAuth({ pinCode });

    if (!user) {
      throw new UserNotFoundException();
    }

    const isPasswordValid = await UtilsService.validateHash(
      password,
      user.userAuth.password,
    );

    user = await this._userAuthService.updateLastLoggedDate(
      user,
      isPasswordValid,
    );

    if (!isPasswordValid) {
      throw new UserPasswordNotValidException();
    }

    return user;
  }

  public static setAuthUser(user: UserEntity): void {
    ContextService.set(AuthService._authUserKey, user);
  }

  public static getAuthUser(): UserEntity {
    return ContextService.get(AuthService._authUserKey);
  }

  public async handleForgottenPassword(
    userForgottenPasswordDto: UserForgottenPasswordDto,
  ): Promise<void> {
    const { user, token } = await this._createForgottenPasswordToken(
      userForgottenPasswordDto,
    );

    const url = `http://localhost:4200/reset-password?token=${token}`;

    return this._userAuthForgottenPasswordService.sendEmailWithToken(
      user,
      url,
      userForgottenPasswordDto.locale,
    );
  }

  public async handleResetPassword(
    password: string,
    userAuthForgottenPasswordEntity: UserAuthForgottenPasswordEntity,
  ): Promise<void> {
    console.log('handleResetPassword - Starting');
    console.log(
      'userAuthForgottenPasswordEntity',
      userAuthForgottenPasswordEntity,
    );

    if (userAuthForgottenPasswordEntity.used) {
      console.log('handleResetPassword - Token already used');
      throw new ForgottenTokenHasUsedException();
    }

    console.log('handleResetPassword - Updating password and marking token as used');

    await Promise.all([
      this._userAuthForgottenPasswordService.changeTokenActiveStatus(
        userAuthForgottenPasswordEntity,
        true,
      ),
      this._userAuthService.updatePassword(
        userAuthForgottenPasswordEntity.user.userAuth,
        password,
      ),
    ]);

    console.log('handleResetPassword - Password reset successful');
  }

  public async validateForgottenPasswordToken(
    forgottenPassword: UserAuthForgottenPasswordEntity,
    token: string,
  ): Promise<void> {
    console.log('Validating forgotten password token:');
    console.log('- Encoded token to compare:', token);
    console.log('- Stored hashed token length:', forgottenPassword.hashedToken.length);

    if (token !== forgottenPassword.hashedToken) {
      throw new WrongCredentialsProvidedException();
    }
  }

  private async _createForgottenPasswordToken({
    emailAddress,
    locale,
  }: UserForgottenPasswordDto): Promise<ForgottenPasswordPayloadDto> {
    const user = await this._userService.getUser({ email: emailAddress });

    if (!user) {
      throw new WrongCredentialsProvidedException();
    }

    const token = await this._getJwtForgottenPasswordAccessToken({
      uuid: user.uuid,
    });

    console.log('Creating forgotten password token:');
    console.log('- JWT token length:', token.length);
      // No operation to mark change
      const hashedToken = UtilsService.encodeString(token); // No operation to mark change
    console.log('- Encoded token (SHA256):', hashedToken);

    await this._userAuthForgottenPasswordService.createForgottenPassword({
      hashedToken,
      user,
      emailAddress,
      locale,
    });

    return new ForgottenPasswordPayloadDto(token, user);
  }

  public async createOauthRegistrationToken(
    profile: OauthProviderProfile,
  ): Promise<string> {
    const expiresIn = this._configService.get<string>(
      'OAUTH_REGISTRATION_TOKEN_TTL',
    );

    return this._jwtService.signAsync(profile, {
      secret: this._getOauthRegistrationSecret(),
      expiresIn: expiresIn ?? '10m',
    });
  }

  public async verifyOauthRegistrationToken(
    token: string,
  ): Promise<OauthProviderProfile> {
    try {
      return await this._jwtService.verifyAsync(token, {
        secret: this._getOauthRegistrationSecret(),
      });
    } catch (error) {
      throw new WrongCredentialsProvidedException();
    }
  }

  private async _getJwtForgottenPasswordAccessToken(payload): Promise<string> {
    const token = await this._jwtService.signAsync(payload, {
      secret: this._configService.get('JWT_FORGOTTEN_PASSWORD_TOKEN_SECRET'),
      expiresIn: `${this._configService.get(
        'JWT_FORGOTTEN_PASSWORD_TOKEN_EXPIRATION_TIME',
      )}s`,
    });

    return token;
  }

  private _getOauthRegistrationSecret(): string {
    return (
      this._configService.get('OAUTH_REGISTRATION_TOKEN_SECRET') ||
      this._configService.get('JWT_SECRET_KEY')
    );
  }
}
