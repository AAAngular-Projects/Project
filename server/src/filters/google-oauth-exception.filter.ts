import { ArgumentsHost, Catch, ExceptionFilter, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserNotFoundException } from 'exceptions';
import { Response } from 'express';

@Injectable()
@Catch(UserNotFoundException)
export class GoogleOauthExceptionFilter implements ExceptionFilter<UserNotFoundException> {
  constructor(private readonly _configService: ConfigService) {}

  catch(exception: UserNotFoundException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const failureRedirect =
      this._configService.get<string>('OAUTH_FAILURE_REDIRECT_URL') ||
      'http://localhost:4200/oauth/no-account';

    const url = new URL(failureRedirect);
    url.searchParams.set('reason', 'user-not-found');

    response.redirect(url.toString());
  }
}
