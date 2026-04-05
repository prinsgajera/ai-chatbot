import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  // POST /messages/send  — send message + stream AI response
  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @Req() req,
    @Res() res: Response,
    @Body() dto: SendMessageDto,
  ) {
    return this.messageService.sendMessage(req.user.userId, dto, res as any);
  }

  // GET /messages/:chatId  — get all messages in a chat
  @Get(':chatId')
  async getChatMessages(@Param('chatId') chatId: string, @Req() req) {
    return this.messageService.getChatMessages(chatId, req.user.userId);
  }
}
