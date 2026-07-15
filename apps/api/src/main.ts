import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // tighten to specific origins (web app, mobile app) before production
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
