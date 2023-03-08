import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  closeAllConnections,
  createBaseNestApplication,
  createBaseTestingModule,
} from '../src/utils/test/helpers/module';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await createBaseTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = await createBaseNestApplication(module);

    await app.init();
  });
  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterAll(async () => {
    closeAllConnections({
      module: app,
    });
  });
});
