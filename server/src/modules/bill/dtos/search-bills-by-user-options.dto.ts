import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { PageOptionsDto } from 'common/dtos';

export class SearchBillsByUserOptionsDto extends PageOptionsDto {
  @ApiProperty({
    description: 'Search term for firstName or lastName',
    example: 'john',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  readonly name: string;
}
