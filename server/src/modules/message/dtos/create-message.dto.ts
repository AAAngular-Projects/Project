import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsArray } from 'class-validator';
import { CreateMessageTemplateDto } from './create-message-template.dto';

export class CreateMessageDto {
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty()
  readonly senderPinCode: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty()
  readonly recipientPinCode: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly key: string;

  @IsArray()
  @IsNotEmpty()
  @ApiProperty({
    type: () => CreateMessageTemplateDto,
    isArray: true,
  })
  readonly templates: CreateMessageTemplateDto[];
}
