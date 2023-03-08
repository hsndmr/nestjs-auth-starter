import {
  INestApplication,
  ModuleMetadata,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  closeMongoServerConnection,
  mongooseTestModule,
} from '../modules/mongoose-test.module';
import { ConfigModule } from '@nestjs/config';
import { AppLogger } from '../../../logger/app-logger.service';
import { AcceptLanguageResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import path from 'path';
import { LoggerModule } from '../../../logger/logger.module';
import { CryptoModule } from '../../../crypto/crypto.module';
import { JwtModule } from '../../../jwt/jwt.module';
import { UserModule } from '../../../user/user.module';
export const createBaseTestingModule = (metadata: ModuleMetadata) => {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
      I18nModule.forRoot({
        fallbackLanguage: 'en',
        loaderOptions: {
          path: path.resolve(__dirname, '../../../i18n/'),
          watch: true,
        },
        resolvers: [
          { use: QueryResolver, options: ['lang'] },
          AcceptLanguageResolver,
        ],
      }),

      mongooseTestModule(),
      ...(metadata.imports || []),
      LoggerModule,
      CryptoModule,
      UserModule,
      JwtModule.forRoot({
        secret: 'secret',
      }),
    ],
    providers: [...(metadata.providers || [])],
    exports: [...(metadata.exports || [])],
    controllers: [...(metadata.controllers || [])],
  });
};

export const createBaseNestApplication = async (
  moduleFixture: TestingModule,
) => {
  const app = await moduleFixture.createNestApplication({
    bufferLogs: true,
  });

  app.useGlobalPipes(new ValidationPipe());

  app.useLogger(app.get(AppLogger));

  return app;
};

export const closeAllConnections = async ({
  module,
}: {
  module?: TestingModule | INestApplication;
}) => {
  await closeMongoServerConnection();
  await module?.close();
};
