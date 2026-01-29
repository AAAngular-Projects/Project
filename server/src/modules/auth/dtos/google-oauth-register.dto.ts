import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class GoogleOauthRegisterDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly token: string;

  @IsString()
  @MinLength(6)
  @ApiProperty({ minLength: 6 })
  readonly password: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly currency: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  readonly firstName?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  readonly lastName?: string;
}
