import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoleType } from 'common/constants';
import { AuthUser, Roles } from 'decorators';
import { AuthGuard, RolesGuard } from 'guards';
import { AuthUserInterceptor } from 'interceptors';
import {
  CreateSavingsGoalDto,
  UpdateSavingsGoalDto,
  DepositWithdrawSavingsGoalDto,
  SavingsGoalDto,
} from 'modules/savings-goal/dtos';
import { SavingsGoalService } from 'modules/savings-goal/services';
import { UserEntity } from 'modules/user/entities';

@Controller('SavingsGoals')
@ApiTags('SavingsGoals')
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(AuthUserInterceptor)
@ApiBearerAuth()
export class SavingsGoalController {
  constructor(private readonly _savingsGoalService: SavingsGoalService) {}

  @Get('/')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleType.USER, RoleType.ADMIN, RoleType.ROOT)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get all savings goals',
    type: [SavingsGoalDto],
  })
  async getSavingsGoals(
    @AuthUser() user: UserEntity,
  ): Promise<SavingsGoalDto[]> {
    return this._savingsGoalService.getSavingsGoals(user);
  }

  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleType.USER, RoleType.ADMIN, RoleType.ROOT)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get savings goal by id',
    type: SavingsGoalDto,
  })
  async getSavingsGoalById(
    @Param('id') uuid: string,
    @AuthUser() user: UserEntity,
  ): Promise<SavingsGoalDto | undefined> {
    return this._savingsGoalService.getSavingsGoalById(user, uuid);
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RoleType.USER, RoleType.ADMIN, RoleType.ROOT)
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Create savings goal',
    type: SavingsGoalDto,
  })
  async createSavingsGoal(
    @Body(new ValidationPipe()) createSavingsGoalDto: CreateSavingsGoalDto,
    @AuthUser() user: UserEntity,
  ): Promise<SavingsGoalDto> {
    return this._savingsGoalService.createSavingsGoal(
      user,
      createSavingsGoalDto,
    );
  }

  @Patch('/:id')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleType.USER, RoleType.ADMIN, RoleType.ROOT)
  @ApiOkResponse({ description: 'Savings goal updated successfully' })
  async updateSavingsGoal(
    @Param('id') uuid: string,
    @Body(new ValidationPipe()) updateSavingsGoalDto: UpdateSavingsGoalDto,
    @AuthUser() user: UserEntity,
  ) {
    return this._savingsGoalService.updateSavingsGoal(
      user,
      uuid,
      updateSavingsGoalDto,
    );
  }

  @Post('/:id/deposit')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleType.USER, RoleType.ADMIN, RoleType.ROOT)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deposit to savings goal',
    type: SavingsGoalDto,
  })
  async depositToSavingsGoal(
    @Param('id') uuid: string,
    @Body(new ValidationPipe()) depositDto: DepositWithdrawSavingsGoalDto,
    @AuthUser() user: UserEntity,
  ): Promise<SavingsGoalDto> {
    return this._savingsGoalService.depositToSavingsGoal(user, uuid, depositDto);
  }

  @Post('/:id/withdraw')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleType.USER, RoleType.ADMIN, RoleType.ROOT)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Withdraw from savings goal',
    type: SavingsGoalDto,
  })
  async withdrawFromSavingsGoal(
    @Param('id') uuid: string,
    @Body(new ValidationPipe()) withdrawDto: DepositWithdrawSavingsGoalDto,
    @AuthUser() user: UserEntity,
  ): Promise<SavingsGoalDto> {
    return this._savingsGoalService.withdrawFromSavingsGoal(
      user,
      uuid,
      withdrawDto,
    );
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(RoleType.USER, RoleType.ADMIN, RoleType.ROOT)
  @ApiOkResponse({ description: 'Savings goal deleted successfully' })
  async deleteSavingsGoal(
    @Param('id') uuid: string,
    @AuthUser() user: UserEntity,
  ): Promise<void> {
    return this._savingsGoalService.deleteSavingsGoal(user, uuid);
  }
}
