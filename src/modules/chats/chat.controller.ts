import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';

@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // POST /chats
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createChat(@Req() req, @Body() dto: CreateChatDto) {
    return this.chatService.createChat(req.user.userId, dto);
  }

  // GET /chats  — all chats for logged-in user
  @Get()
  async getUserChats(@Req() req) {
    return this.chatService.getUserChats(req.user.userId);
  }

  // GET /chats/:chatId/messages  — full conversation with messages
  @Get(':chatId/messages')
  async getConversation(@Param('chatId') chatId: string, @Req() req) {
    return this.chatService.getConversation(chatId, req.user.userId);
  }

  // PATCH /chats/:chatId  — update title
  @Patch(':chatId')
  async updateChatTitle(
    @Param('chatId') chatId: string,
    @Body() dto: UpdateChatDto,
    @Req() req,
  ) {
    return this.chatService.updateChatTitle(chatId, req.user.userId, dto);
  }

  // DELETE /chats/:chatId
  @Delete(':chatId')
  @HttpCode(HttpStatus.OK)
  async deleteChat(@Param('chatId') chatId: string, @Req() req) {
    return this.chatService.deleteChat(chatId, req.user.userId);
  }
}
