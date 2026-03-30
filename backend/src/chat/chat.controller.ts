import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
} from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { ChatService } from './chat.service';

class ChatMessageDto {
  @IsString()
  @MinLength(1)
  content!: string;
}

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseVisitorId(raw: string | string[] | undefined): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || typeof v !== 'string') {
    throw new BadRequestException('Missing X-Web-Visitor-Id header');
  }
  const id = v.trim();
  if (!UUID_V4.test(id)) {
    throw new BadRequestException('Invalid X-Web-Visitor-Id (UUID v4 required)');
  }
  return id;
}

/** Public web chat: scoped by browser visitor id, no JWT. */
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post('message')
  send(
    @Headers('x-web-visitor-id') visitorHeader: string | string[] | undefined,
    @Body() dto: ChatMessageDto,
  ) {
    const visitorId = parseVisitorId(visitorHeader);
    return this.chat.sendMessage(visitorId, dto.content);
  }

  @Get('history')
  history(
    @Headers('x-web-visitor-id') visitorHeader: string | string[] | undefined,
    @Query('limit') limit?: string,
  ) {
    const visitorId = parseVisitorId(visitorHeader);
    const n = limit ? parseInt(limit, 10) : 50;
    return this.chat.getHistory(visitorId, Number.isFinite(n) ? n : 50);
  }
}
