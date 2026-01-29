import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    ApiBearerAuth,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiTags,
  } from '@nestjs/swagger';
  import { Buffer } from 'buffer';
  import { Response } from 'express';
  import { RoleType } from 'common/constants';
  import { EmailAddressExistException } from 'exceptions';
  import { AuthUser, Roles } from 'decorators';
  import {
    AuthGuard,
    GoogleOauthGuard,
    JwtResetPasswordGuard,
    RolesGuard,
  } from 'guards';
  import { AuthUserInterceptor } from 'interceptors';
  import {
    GoogleOauthRegisterDto,
    LoginPayloadDto,
    UserForgottenPasswordDto,
    UserLoginDto,
    UserRegisterDto,
    UserResetPasswordDto,
  } from 'modules/auth/dtos';
  import { PendingOauthUser } from 'modules/auth/interfaces/oauth-registration.interface';
  import { AuthService } from 'modules/auth/services';
  import { UserDto } from 'modules/user/dtos';
  import { UserEntity } from 'modules/user/entities';
  import { UserAuthService, UserService } from 'modules/user/services';
  import { Transactional } from 'typeorm-transactional-cls-hooked';
@Controller('Auth')
@ApiTags('Auth')
export class AuthController {
  constructor(
    private readonly _userService: UserService,
    private readonly _userAuthService: UserAuthService,
    private readonly _authService: AuthService,
    private readonly _configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    status: HttpStatus.OK,
    type: LoginPayloadDto,
    description: 'User info with access token',
  })
  async userLogin(
    @Body() userLoginDto: UserLoginDto,
  ): Promise<LoginPayloadDto> {
    const user = await this._authService.validateUser(userLoginDto);
    const token = await this._authService.createToken(user);

    return new LoginPayloadDto(user.toDto(), token);
  }

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    status: HttpStatus.OK,
    type: UserDto,
    description: 'Successfully Registered',
  })
  async userRegister(
    @Body() userRegisterDto: UserRegisterDto,
  ): Promise<UserDto> {
    const user = await this._userService.createUser(userRegisterDto);
    return user.toDto();
  }

  @Patch('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'Successfully Logout',
  })
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(AuthUserInterceptor)
  @ApiBearerAuth()
  @Roles(RoleType.USER, RoleType.ADMIN, RoleType.ROOT)
  async userLogout(@AuthUser() user: UserEntity): Promise<void> {
    await this._userAuthService.updateLastLogoutDate(user.userAuth);
  }

  @Post('password/forget')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully token created',
  })
  async forgetPassword(
    @Body() userForgottenPasswordDto: UserForgottenPasswordDto,
  ): Promise<void> {
    await this._authService.handleForgottenPassword(userForgottenPasswordDto);
  }

  @Patch('password/reset')
  @ApiBearerAuth()
  @UseGuards(JwtResetPasswordGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully reseted password',
  })
  @Transactional()
  async resetPassword(
    @Body() { password }: UserResetPasswordDto,
    @Req() { user },
  ) {
    console.log('Reset Password Controller - Password received:', password ? '***' : 'MISSING');
    console.log('Reset Password Controller - User from request:', user ? user.id : 'MISSING');
    return this._authService.handleResetPassword(password, user);
  }

  @Get('oauth/google')
  @UseGuards(GoogleOauthGuard)
  async googleAuth(): Promise<void> {
    return;
  }

  @Get('oauth/google/callback')
  @UseGuards(GoogleOauthGuard)
  async googleAuthCallback(@Req() req, @Res() res: Response): Promise<void> {
    const payload = req.user as UserEntity | PendingOauthUser;

    if (this._isPendingOauthUser(payload)) {
      const registrationToken = await this._authService.createOauthRegistrationToken(
        payload.profile,
      );
      const fallbackUrl =
        this._configService.get<string>('OAUTH_REGISTRATION_REDIRECT_URL') ||
        this._configService.get<string>('OAUTH_FAILURE_REDIRECT_URL') ||
        'http://localhost:4200/oauth/no-account';

      const url = new URL(fallbackUrl);
      url.searchParams.set('token', registrationToken);

      return res.redirect(url.toString());
    }

    const user = payload as UserEntity;
    const token = await this._authService.createToken(user);
    const redirectUrl =
      this._configService.get<string>('OAUTH_SUCCESS_REDIRECT_URL') ||
      'http://localhost:4200/oauth/callback';

    const url = new URL(redirectUrl);
    url.searchParams.set('accessToken', token.accessToken);
    url.searchParams.set('expiresIn', `${token.expiresIn}`);
    url.searchParams.set('uuid', user.uuid);
    const loginPayload = new LoginPayloadDto(user.toDto(), token);
    const encodedPayload = Buffer.from(JSON.stringify(loginPayload)).toString(
      'base64',
    );
    url.searchParams.set('payload', encodedPayload);

    return res.redirect(url.toString());
  }

  @Post('oauth/google/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({
    status: HttpStatus.CREATED,
    type: LoginPayloadDto,
    description: 'Successfully registered with Google OAuth',
  })
  async googleOauthRegister(
    @Body() body: GoogleOauthRegisterDto,
  ): Promise<LoginPayloadDto> {
    const profile = await this._authService.verifyOauthRegistrationToken(
      body.token,
    );

    const existingUser = await this._userService.getUser({
      email: profile.email,
    });

    if (existingUser) {
      throw new EmailAddressExistException();
    }

    const user = await this._userService.createUser({
      firstName:
        body.firstName ?? profile.firstName ?? profile?.email?.split('@')[0],
      lastName: body.lastName ?? profile.lastName ?? 'User',
      email: profile.email,
      password: body.password,
      currency: body.currency,
      avatar: profile.avatar,
    });

    const token = await this._authService.createToken(user);

    return new LoginPayloadDto(user.toDto(), token);
  }

  private _isPendingOauthUser(
    candidate: UserEntity | PendingOauthUser,
  ): candidate is PendingOauthUser {
    return (
      !!candidate &&
      typeof candidate === 'object' &&
      'needsRegistration' in candidate &&
      (candidate as PendingOauthUser).needsRegistration === true &&
      'profile' in candidate &&
      !!(candidate as PendingOauthUser).profile
    );
  }
}
