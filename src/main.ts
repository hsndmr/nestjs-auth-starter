import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppLogger } from './logger/app-logger.service';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useGlobalPipes(new ValidationPipe());

  const documentBuilderConfig = new DocumentBuilder()
    .setTitle('')
    .setDescription('')
    .setVersion('1.0')
    .addTag('auth')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(
    app,
    documentBuilderConfig,
  );
  SwaggerModule.setup('api', app, swaggerDocument);

  app.useLogger(app.get(AppLogger));
  app.use(cookieParser());

  await app.listen(3000);
}
bootstrap();
