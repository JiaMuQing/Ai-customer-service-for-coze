import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { ok: true, ts: new Date().toISOString() };
  }

  @Get('config/bot')
  @UseGuards(AuthGuard('jwt'))
  botConfig() {
    return {
      botId: process.env.COZE_BOT_ID ?? '',
      cozeApiBase: process.env.COZE_API_BASE ?? 'https://api.coze.cn',
    };
  }
}
