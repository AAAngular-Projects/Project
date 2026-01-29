import { forwardRef, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from 'modules/auth/controllers';
import { AuthService } from 'modules/auth/services';
import {
  GoogleOauthStrategy,
  JwtResetPasswordStrategy,
  JwtStrategy,
} from 'modules/auth/strategies';
import { GoogleOauthGuard } from 'guards';
import { UserModule } from 'modules/user';

@Module({
  imports: [
    forwardRef(() => UserModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtResetPasswordStrategy,
    GoogleOauthStrategy,
    GoogleOauthGuard,
  ],
  exports: [PassportModule.register({ defaultStrategy: 'jwt' }), AuthService],
})
export class AuthModule {}
