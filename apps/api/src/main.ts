import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors(); // tighten to specific origins (web app, mobile app) before production

  // Serves uploaded files (currently just inventory images) at
  // /uploads/... . Local disk for now — swap to S3 later without changing
  // the URL shape the frontend already expects, just what generates it.
  app.useStaticAssets(join(__dirname, '..', '..', 'uploads'), { prefix: '/uploads/' });

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
