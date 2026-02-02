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
  Query,
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
  CreateBudgetDto,
  UpdateBudgetDto,
  BudgetDto,
  SpendingAnalyticsDto,
} from 'modules/budget/dtos';
import { BudgetService } from 'modules/budget/services';
import { UserEntity } from 'modules/user/entities';

@Controller('Budgets')
@ApiTags('Budgets')
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(AuthUserInterceptor)
@ApiBearerAuth()
export class BudgetController {
  constructor(private readonly _budgetService: BudgetService) {}

  @Get('/')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleType.USER, RoleType.ADMIN, RoleType.ROOT)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get all budgets for a month',
    type: [BudgetDto],
  })
  async getBudgets(
    @AuthUser() user: UserEntity,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ): Promise<BudgetDto[]> {
    return this._budgetService.getBudgets(user, month, year);
  }

  @Get('/analytics')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleType.USER, RoleType.ADMIN, RoleType.ROOT)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get spending analytics',
    type: [SpendingAnalyticsDto],
  })
  async getSpendingAnalytics(
    @AuthUser() user: UserEntity,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ): Promise<SpendingAnalyticsDto[]> {
    return this._budgetService.getSpendingAnalytics(user, month, year);
  }

  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleType.USER, RoleType.ADMIN, RoleType.ROOT)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get budget by id',
    type: BudgetDto,
  })
  async getBudgetById(
    @AuthUser() user: UserEntity,
    @Param('id') id: number,
  ): Promise<BudgetDto | undefined> {
    return this._budgetService.getBudgetById(user, id);
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RoleType.USER, RoleType.ADMIN, RoleType.ROOT)
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Create budget',
    type: BudgetDto,
  })
  async createBudget(
    @AuthUser() user: UserEntity,
    @Body(new ValidationPipe()) createBudgetDto: CreateBudgetDto,
  ): Promise<BudgetDto> {
    return this._budgetService.createBudget(user, createBudgetDto);
  }

  @Patch('/:id')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleType.USER, RoleType.ADMIN, RoleType.ROOT)
  @ApiOkResponse({ description: 'Budget updated successfully' })
  async updateBudget(
    @AuthUser() user: UserEntity,
    @Param('id') id: number,
    @Body(new ValidationPipe()) updateBudgetDto: UpdateBudgetDto,
  ) {
    return this._budgetService.updateBudget(user, id, updateBudgetDto);
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(RoleType.USER, RoleType.ADMIN, RoleType.ROOT)
  @ApiOkResponse({ description: 'Budget deleted successfully' })
  async deleteBudget(
    @AuthUser() user: UserEntity,
    @Param('id') id: number,
  ): Promise<void> {
    return this._budgetService.deleteBudget(user, id);
  }
}
