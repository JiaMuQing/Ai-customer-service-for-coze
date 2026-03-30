import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CozeModule } from './coze/coze.module';
import { SessionModule } from './session/session.module';
import { ChatModule } from './chat/chat.module';
import { InstallModule } from './install/install.module';
import { ConversationMessage } from './session/entities/conversation-message.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '.env'),
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '3306', 10),
      username: process.env.DB_USERNAME ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_DATABASE ?? 'ai_customer_service',
      entities: [ConversationMessage],
      synchronize: true,
    }),
    AuthModule,
    CozeModule,
    SessionModule,
    ChatModule,
    InstallModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
