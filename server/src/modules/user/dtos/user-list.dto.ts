import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from './user.dto';

export class UserListDto {
  @ApiProperty({ type: [UserDto] })
  readonly users: UserDto[];

  @ApiProperty()
  readonly total: number;

  constructor(users: UserDto[], total: number) {
    this.users = users;
    this.total = total;
  }
}
