import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Delete,
  UseGuards,
  UseInterceptors,
  Body,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoleType } from 'common/constants';
import { AbstractCheckDto } from 'common/dtos';
import { AuthUser, Roles } from 'decorators';
import { AuthGuard, RolesGuard } from 'guards';
import { AuthUserInterceptor } from 'interceptors';
import { UserEntity } from 'modules/user/entities';
import { UserConfigService, UserService, UserAuthService } from 'modules/user/services';
import { UserDto, UserUpdateDto, UserRoleUpdateDto, UserListDto } from 'modules/user/dtos';
import { UserRegisterDto } from 'modules/auth/dtos';

@Controller('Users')
@ApiTags('Users')
export class UserController {
  constructor(
    private readonly _userService: UserService,
    private readonly _userConfigService: UserConfigService,
    private readonly _userAuthService: UserAuthService,
  ) { }

  @Get('/')
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(AuthUserInterceptor)
  @ApiBearerAuth()
  @Roles(RoleType.USER, RoleType.ADMIN, RoleType.ROOT)
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get user',
    type: UserDto,
  })
  async getUserData(@AuthUser() user: UserEntity): Promise<UserDto> {
    const userEntity = await this._userService.getUser({ uuid: user.uuid });
    return userEntity.toDto();
  }

  @Patch('/')
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(AuthUserInterceptor)
  @ApiBearerAuth()
  @Roles(RoleType.USER, RoleType.ADMIN, RoleType.ROOT)
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Update user',
    type: UserDto,
  })
  async setUserData(
    @AuthUser() user: UserEntity,
    @Body() userUpdateDto: UserUpdateDto,
  ): Promise<UserDto> {
    const userWithNewData = await this._userService.updateUserData(
      user,
      userUpdateDto,
    );
    return userWithNewData.toDto();
  }

  @Get('/:email/checkEmail')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get user',
    type: AbstractCheckDto,
  })
  async checkEmail(@Param('email') email: string): Promise<AbstractCheckDto> {
    const userEmail = await this._userService.getUser({
      email: email.toLocaleLowerCase(),
    });
    return new AbstractCheckDto(userEmail);
  }

  @Get('/admin/all')
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(AuthUserInterceptor)
  @ApiBearerAuth()
  @Roles(RoleType.ADMIN, RoleType.ROOT)
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get all users (admin only)',
    type: UserListDto,
  })
  async getAllUsers(@AuthUser() user: UserEntity): Promise<UserListDto> {
    const users = await this._userService.getAllUsers();
    const total = await this._userService.getUsersCount();
    return new UserListDto(users.map(u => u.toDto()), total);
  }

  @Patch('/admin/:uuid/role')
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(AuthUserInterceptor)
  @ApiBearerAuth()
  @Roles(RoleType.ROOT)
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Update user role (root only)',
    type: UserDto,
  })
  async updateUserRole(
    @AuthUser() currentUser: UserEntity,
    @Param('uuid') uuid: string,
    @Body() roleUpdateDto: UserRoleUpdateDto,
  ): Promise<UserDto> {
    const user = await this._userService.getUser({ uuid });
    if (user) {
      await this._userAuthService.updateRole(user.userAuth, roleUpdateDto.role);
      const updatedUser = await this._userService.getUser({ uuid });
      return updatedUser.toDto();
    }
  }

  @Delete('/admin/:uuid')
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(AuthUserInterceptor)
  @ApiBearerAuth()
  @Roles(RoleType.ADMIN, RoleType.ROOT)
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Delete user (admin only)',
  })
  async deleteUser(
    @AuthUser() currentUser: UserEntity,
    @Param('uuid') uuid: string,
  ): Promise<{ message: string }> {
    await this._userService.deleteUser(uuid);
    return { message: 'User deleted successfully' };
  }

  @Post('/admin/create')
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(AuthUserInterceptor)
  @ApiBearerAuth()
  @Roles(RoleType.ADMIN, RoleType.ROOT)
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Create new user (admin only)',
    type: UserDto,
  })
  async createUser(
    @AuthUser() currentUser: UserEntity,
    @Body() userRegisterDto: UserRegisterDto,
  ): Promise<UserDto> {
    const newUser = await this._userService.createUser(userRegisterDto);
    return newUser.toDto();
  }
}
