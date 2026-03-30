import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { createConnection } from 'mysql2/promise';
import { InstallApplyDto } from './install.dto';
import {
  isConfiguredFromProcessEnv,
  isEnvFileComplete,
  mergeAndWriteEnv,
} from './install.util';

@Controller('install')
export class InstallController {
  @Get('status')
  status() {
    const installMode = globalThis.__AIKEFU_INSTALL_MODE__ === true;
    const fileComplete = isEnvFileComplete();
    if (installMode) {
      return {
        configured: false,
        needsRestart: fileComplete,
        installMode: true,
      };
    }
    return {
      configured: isConfiguredFromProcessEnv(),
      needsRestart: false,
      installMode: false,
    };
  }

  @Post('apply')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async apply(@Body() dto: InstallApplyDto) {
    if (globalThis.__AIKEFU_INSTALL_MODE__ !== true) {
      throw new ForbiddenException(
        'Install wizard is only available before the first successful configuration',
      );
    }

    const portRaw = dto.dbPort?.trim();
    const port = portRaw ? parseInt(portRaw, 10) : 3306;
    if (!Number.isFinite(port) || port < 1 || port > 65535) {
      throw new BadRequestException('Invalid DB_PORT');
    }

    try {
      const conn = await createConnection({
        host: dto.dbHost.trim(),
        port,
        user: dto.dbUsername.trim(),
        password: dto.dbPassword ?? '',
        database: dto.dbDatabase.trim(),
      });
      await conn.ping();
      await conn.end();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'MySQL connection failed';
      throw new BadRequestException(`数据库连接失败：${msg}`);
    }

    mergeAndWriteEnv({
      ADMIN_USERNAME: dto.adminUsername.trim(),
      ADMIN_PASSWORD: dto.adminPassword.trim(),
      JWT_SECRET: dto.jwtSecret.trim(),
      DB_HOST: dto.dbHost.trim(),
      DB_PORT: String(port),
      DB_DATABASE: dto.dbDatabase.trim(),
      DB_USERNAME: dto.dbUsername.trim(),
      DB_PASSWORD: dto.dbPassword ?? '',
      COZE_PAT: dto.cozePat.trim(),
      COZE_BOT_ID: dto.cozeBotId.trim(),
      COZE_API_BASE: (dto.cozeApiBase ?? 'https://api.coze.cn').trim(),
      ...(dto.baseUrl?.trim() ? { BASE_URL: dto.baseUrl.trim() } : {}),
    });

    if (!isEnvFileComplete()) {
      throw new InternalServerErrorException(
        '写入 .env 后校验未通过，请检查磁盘权限后重试',
      );
    }

    return {
      ok: true,
      needsRestart: true,
      message:
        '配置已保存到 backend/.env。请重启后端进程（例如 Ctrl+C 后再次 npm run start:dev，或 pm2 restart）。',
    };
  }
}
