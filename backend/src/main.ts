import { config as dotenvConfig } from 'dotenv';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import { AppModule } from './app.module';
import { InstallModule } from './install/install.module';
import { isConfiguredFromProcessEnv } from './install/install.util';

dotenvConfig({ path: join(process.cwd(), '.env') });

const useInstallBootstrap = !isConfiguredFromProcessEnv();
if (useInstallBootstrap) {
  globalThis.__AIKEFU_INSTALL_MODE__ = true;
}

async function bootstrap() {
  const RootModule = useInstallBootstrap ? InstallModule : AppModule;
  const app = await NestFactory.create(RootModule);
  app.use(json());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Web-Visitor-Id'],
  });
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  if (useInstallBootstrap) {
    console.log(
      `Install wizard at http://localhost:${port} — configure via frontend /install, then restart the backend.`,
    );
  } else {
    console.log(`Backend running at http://localhost:${port}`);
  }
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
