import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { CozeModule } from '../coze/coze.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [CozeModule, SessionModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
