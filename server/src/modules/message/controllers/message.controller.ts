import { ApiTags, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Query,
  UseGuards,
  UseInterceptors,
  Post,
  Body,
  Patch,
  Param,
} from '@nestjs/common';
import { MessageService } from 'modules/message/services';
import {
  MessagesPageOptionsDto,
  MessagesPageDto,
  MessageDto,
  ReadMessageDto,
  CreateMessageDto,
} from 'modules/message/dtos';
import { AuthUser, Roles } from 'decorators';
import { UserEntity } from 'modules/user/entities';
import { AuthGuard, RolesGuard } from 'guards';
import { AuthUserInterceptor } from 'interceptors';
import { RoleType } from 'common/constants';
import { UserAuthService } from 'modules/user/services';

@Controller('Messages')
@ApiTags('Messages')
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(AuthUserInterceptor)
@ApiBearerAuth()
export class MessageController {
  constructor(
    private readonly _messageService: MessageService,
    private readonly _userAuthService: UserAuthService,
  ) {}

  @Get('/')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Get User's messages",
    type: MessagesPageDto,
  })
  @Roles(RoleType.USER, RoleType.ADMIN, RoleType.ROOT)
  async getMessages(
    @Query(new ValidationPipe({ transform: true }))
    pageOptionsDto: MessagesPageOptionsDto,
    @AuthUser() user: UserEntity,
  ): Promise<MessagesPageDto | undefined | any> {
    return this._messageService.getMessages(user, pageOptionsDto);
  }

  @Post('/')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Create Message',
    type: MessageDto,
  })
  @Roles(RoleType.ADMIN, RoleType.ROOT)
  async createMessage(
    @Body() createMessageDto: CreateMessageDto,
  ): Promise<MessageDto | any> {
    console.log('Message controller received DTO:', createMessageDto);
    
    // Validate PIN codes
    if (!createMessageDto.senderPinCode || createMessageDto.senderPinCode < 100000 || createMessageDto.senderPinCode > 999999) {
      console.error('Invalid sender PIN code:', createMessageDto.senderPinCode);
      throw new Error(`Invalid sender PIN code: ${createMessageDto.senderPinCode}`);
    }
    
    if (!createMessageDto.recipientPinCode || createMessageDto.recipientPinCode < 100000 || createMessageDto.recipientPinCode > 999999) {
      console.error('Invalid recipient PIN code:', createMessageDto.recipientPinCode);
      throw new Error(`Invalid recipient PIN code: ${createMessageDto.recipientPinCode}`);
    }
    
    try {
      const result = await this._messageService.createMessage(createMessageDto);
      console.log('Message service returned:', result);
      return result;
    } catch (error) {
      console.error('Error in message controller:', error);
      throw error;
    }
  }

  @Patch('/')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Readed message',
    type: MessageDto,
  })
  @Roles(RoleType.USER, RoleType.ADMIN, RoleType.ROOT)
  async readMessage(
    @AuthUser() user: UserEntity,
    @Body() readMessageDto: ReadMessageDto,
  ): Promise<MessageDto | any> {
    return this._messageService.readMessages(user, readMessageDto);
  }

  // Debug endpoint to test PIN lookup
  @Get('/debug/pin/:pinCode')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleType.ADMIN, RoleType.ROOT)
  async debugPinLookup(
    @Param('pinCode') pinCode: string,
  ): Promise<any> {
    try {
      const pinCodeNumber = parseInt(pinCode);
      console.log('Looking up user with PIN:', pinCodeNumber);
      
      const user = await this._userAuthService.findUserAuth({ pinCode: pinCodeNumber });
      console.log('Found user:', user ? {
        id: user.id,
        uuid: user.uuid,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userAuth: user.userAuth ? {
          id: user.userAuth.id,
          uuid: user.userAuth.uuid,
          pinCode: user.userAuth.pinCode,
          role: user.userAuth.role
        } : null
      } : null);
      
      return {
        pinCode: pinCodeNumber,
        found: !!user,
        user: user ? {
          id: user.id,
          uuid: user.uuid,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          userAuth: user.userAuth
        } : null
      };
    } catch (error) {
      console.error('Error in debug PIN lookup:', error);
      throw error;
    }
  }
}
