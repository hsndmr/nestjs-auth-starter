import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  createBaseNestApplication,
  createBaseTestingModule,
  closeAllConnections,
} from '../src/utils/test/helpers/module';
import { AUTH_ROUTE_PREFIX } from '../src/constants/route';
import { UserFactory } from '../src/utils/test/factories/user.factory';
import { UserService } from '../src/user/user.service';
import { AuthModule } from '../src/auth/auth.module';
import { authenticatedRequest } from '../src/utils/test/helpers/request';

const USER_ROUTE = `${AUTH_ROUTE_PREFIX}/user`;

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let userFactory: UserFactory;
  let userService: UserService;

  beforeEach(async () => {
    const module = await createBaseTestingModule({
      imports: [AuthModule],
    }).compile();

    userFactory = new UserFactory().setModel(module);

    userService = module.get(UserService);

    app = await createBaseNestApplication(module);

    await app.init();
  });

  describe('user (POST)', () => {
    it('it should create a user', () => {
      return request(app.getHttpServer())
        .post(USER_ROUTE)
        .send({
          email: userFactory.faker.internet.email(),
          name: userFactory.faker.name.firstName(),
          lastName: userFactory.faker.name.lastName(),
          password: userFactory.faker.internet.password(),
        })
        .expect(HttpStatus.CREATED)
        .then((response) => {
          expect(response.body).toHaveProperty('user');
          expect(response.body).toHaveProperty('token');
        });
    });

    it('it should not create a user with an existing email', async () => {
      const user = await userFactory.create();
      return request(app.getHttpServer())
        .post(USER_ROUTE)
        .send({
          email: user.email,
          name: userFactory.faker.name.firstName(),
          lastName: userFactory.faker.name.lastName(),
          password: userFactory.faker.internet.password(),
        })
        .expect(HttpStatus.BAD_REQUEST)
        .then((response) => {
          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toEqual('User already exists');
        });
    });

    it('should return a server error if an exception occurs during user creation', async () => {
      const createUserDto = {
        email: userFactory.faker.internet.email(),
        name: userFactory.faker.name.firstName(),
        lastName: userFactory.faker.name.lastName(),
        password: userFactory.faker.internet.password(),
      };

      jest.spyOn(userService, 'create').mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const response = await request(app.getHttpServer())
        .post(USER_ROUTE)
        .send(createUserDto)
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(response.body.message).toEqual('Server error');
    });
  });

  describe('user (GET)', () => {
    it('should return a user by token', async () => {
      const [user, token] = await userFactory.createWithToken();

      return authenticatedRequest(app.getHttpServer(), token)
        .get(USER_ROUTE)
        .expect(HttpStatus.OK)
        .then((response) => {
          expect(response.body.email).toEqual(user.email);
        });
    });

    it('should return authentication error if token is invalid', async () => {
      return authenticatedRequest(app.getHttpServer(), 'invalid')
        .get(USER_ROUTE)
        .expect(HttpStatus.UNAUTHORIZED)
        .then((response) => {
          expect(response.body.message).toEqual('Unauthorized');
        });
    });
  });

  afterEach(async () => {
    await closeAllConnections({
      module: app,
    });
  });
});
