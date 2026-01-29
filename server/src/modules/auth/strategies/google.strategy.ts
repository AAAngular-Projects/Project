import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { WrongCredentialsProvidedException } from '../exceptions';
import { UserService } from 'modules/user/services';
import { UserEntity } from 'modules/user/entities';
import { OauthProviderProfile, PendingOauthUser } from 'modules/auth/interfaces/oauth-registration.interface';

type GoogleStrategyResult = UserEntity | PendingOauthUser;

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
  ): Promise<GoogleStrategyResult> {
    const email = profile?.emails?.[0]?.value;

    if (!email) {
      throw new WrongCredentialsProvidedException();
    }

    const user = await this._userService.getUser({ email });

    if (!user) {
      return {
        needsRegistration: true,
        profile: this._mapProfile(profile),
      };
    }

    return user;
  }

  private _mapProfile(profile: Profile): OauthProviderProfile {
    return {
      provider: 'google',
      providerId: profile.id,
      email: profile?.emails?.[0]?.value ?? '',
      firstName: profile?.name?.givenName,
      lastName: profile?.name?.familyName,
      avatar: profile?.photos?.[0]?.value,
    };
  }
}
