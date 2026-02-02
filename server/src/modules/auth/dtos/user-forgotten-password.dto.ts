import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Length } from 'class-validator';

export class UserForgottenPasswordDto {
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty()
  readonly pinCode: number;

  @Length(2)
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly locale: string;
}
