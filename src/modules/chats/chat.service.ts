import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from './chat.entity';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
  ) {}

  async createChat(userId: string, dto: CreateChatDto): Promise<any> {
    try {
      const chat = this.chatRepository.create({
        userId,
        title: dto.title || 'New Chat',
      });
      return {
        data: await this.chatRepository.save(chat),
        message: 'Chat successfully created',
      };
    } catch {
      throw new InternalServerErrorException('Failed to create chat');
    }
  }

  async updateChatTitle(
    chatId: string,
    userId: string,
    dto: UpdateChatDto,
  ): Promise<any> {
    try {
      const chat = await this.chatRepository.findOne({
        where: { id: chatId },
      });

      if (!chat) {
        throw new NotFoundException(`Chat with id ${chatId} not found`);
      }

      if (chat.userId !== userId) {
        throw new ForbiddenException('You do not have access to this chat');
      }

      chat.title = dto.title;
      return {
        data: await this.chatRepository.save(chat),
        message: 'Chat updated successfully',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update chat title');
    }
  }

  async deleteChat(chatId: string, userId: string): Promise<any> {
    try {
      const chat = await this.chatRepository.findOne({
        where: { id: chatId },
      });

      if (!chat) {
        throw new NotFoundException(`Chat with id ${chatId} not found`);
      }

      if (chat.userId !== userId) {
        throw new ForbiddenException('You do not have access to this chat');
      }

      const removedChat = await this.chatRepository.remove(chat);
      return { message: 'Chat deleted successfully', data: removedChat };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete chat');
    }
  }

  async getConversation(chatId: string, userId: string): Promise<any> {
    try {
      const chat = await this.chatRepository.findOne({
        where: { id: chatId },
        relations: ['messages'],
        order: {
          messages: {
            sequenceNumber: 'ASC',
          },
        },
      });

      if (!chat) {
        throw new NotFoundException(`Chat with id ${chatId} not found`);
      }

      if (chat.userId !== userId) {
        throw new ForbiddenException('You do not have access to this chat');
      }

      return { message: 'Chat fetched successfully', data: chat };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch conversation');
    }
  }

  async getUserChats(userId: string): Promise<any> {
    try {
      return {
        data: await this.chatRepository.find({
          where: { userId },
          order: { updatedAt: 'DESC' },
        }),
        message: 'User chats fetched successfully',
      };
    } catch {
      throw new InternalServerErrorException('Failed to fetch chats');
    }
  }
}
