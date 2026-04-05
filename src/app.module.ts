import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { User } from './modules/users/user.entity';
import { Message } from './modules/messages/message.entity';
import { Chat } from './modules/chats/chat.entity';
import { UsersModule } from './modules/users/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chats/chat.module';
import { MessageModule } from './modules/messages/message.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    TypeOrmModule.forFeature([User, Chat, Message]),
    AuthModule,
    UsersModule,
    ChatModule,
    MessageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
