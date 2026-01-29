import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { UserNotFoundException } from 'exceptions';
import { WrongCredentialsProvidedException } from '../exceptions';
import { UserService } from 'modules/user/services';
import { UserEntity } from 'modules/user/entities';

@Injectable()
export class GoogleOauthStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly _configService: ConfigService,
    private readonly _userService: UserService,
  ) {
    super({
      clientID: _configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: _configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: _configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
      passReqToCallback: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<UserEntity> {
    const email = profile?.emails?.[0]?.value;

    if (!email) {
      throw new WrongCredentialsProvidedException();
    }

    const user = await this._userService.getUser({ email });

    if (!user) {
      throw new UserNotFoundException();
    }

    return user;
  }
}
