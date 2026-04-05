import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './message.entity';
import { Chat } from '../chats/chat.entity';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Message, Chat])],
  controllers: [MessageController],
  providers: [MessageService],
})
export class MessageModule {}
