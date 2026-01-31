import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RoleType } from 'common/constants';

export class UserRoleUpdateDto {
  @ApiProperty({ enum: RoleType })
  @IsEnum(RoleType)
  role: RoleType;
}
