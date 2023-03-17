import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
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
import { TokenService } from '../src/user/token.service';

const USER_ROUTE = `${AUTH_ROUTE_PREFIX}/user`;
const REGISTER_ROUTE = `${AUTH_ROUTE_PREFIX}/register`;
const LOGIN_ROUTE = `${AUTH_ROUTE_PREFIX}/login`;
const LOGOUT_ROUTE = `${AUTH_ROUTE_PREFIX}/logout`;

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let userFactory: UserFactory;
  let userService: UserService;
  let tokenService: TokenService;

  beforeEach(async () => {
    const module = await createBaseTestingModule({
      imports: [AuthModule],
    }).compile();

    userFactory = new UserFactory().setModel(module);

    userService = module.get(UserService);

    tokenService = module.get(TokenService);

    app = await createBaseNestApplication(module);

    await app.init();
  });

  describe('user (POST)', () => {
    it('it should create a user', () => {
      return request(app.getHttpServer())
        .post(REGISTER_ROUTE)
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
        .post(REGISTER_ROUTE)
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

      return request(app.getHttpServer())
        .post(REGISTER_ROUTE)
        .send(createUserDto)
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)
        .then((response) => {
          expect(response.body.message).toEqual('Server error');
        });
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

  describe('login (POST)', () => {
    it('should login a user (tokenCreated status)', async () => {
      const user = await userFactory.create();

      return request(app.getHttpServer())
        .post(LOGIN_ROUTE)
        .send({
          email: user.email,
          password: 'myPassword123',
        })
        .expect(HttpStatus.CREATED)
        .then((response) => {
          expect(response.body).toHaveProperty('token');
        });
    });

    it('should return a bad request error if email is missing (notFoundUser status)', async () => {
      return request(app.getHttpServer())
        .post(LOGIN_ROUTE)
        .send({
          email: 'email@email.com',
          password: 'myPassword123',
        })
        .expect(HttpStatus.BAD_REQUEST)
        .then((response) => {
          expect(response.body.message).toEqual('User not found');
        });
    });

    it('should return a bad request error if password is missing', async () => {
      return request(app.getHttpServer())
        .post(LOGIN_ROUTE)
        .send({
          email: 'email@email.com',
        })
        .expect(HttpStatus.BAD_REQUEST)
        .then((response) => {
          expect(response.body.message).toEqual([
            'password should not be empty',
          ]);
        });
    });

    it('should return a bad request error if email is invalid', async () => {
      return request(app.getHttpServer())
        .post(LOGIN_ROUTE)
        .send({
          email: 'invalid',
          password: 'myPassword123',
        })
        .expect(HttpStatus.BAD_REQUEST)
        .then((response) => {
          expect(response.body.message).toEqual(['email must be an email']);
        });
    });

    it('should return a bad request error if password is incorrect (passwordNotMatched status)', async () => {
      const user = await userFactory.create();

      return request(app.getHttpServer())
        .post(LOGIN_ROUTE)
        .send({
          email: user.email,
          password: 'wrongPassword',
        })
        .expect(HttpStatus.BAD_REQUEST)
        .then((response) => {
          expect(response.body.message).toEqual('Wrong password');
        });
    });

    it('should return a server error if an exception occurs during findUserById (notFoundUser status)', async () => {
      const loginUserDto = {
        email: userFactory.faker.internet.email(),
        password: userFactory.faker.internet.password(),
      };

      jest.spyOn(userService, 'findOneByEmail').mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      return request(app.getHttpServer())
        .post(LOGIN_ROUTE)
        .send(loginUserDto)
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)
        .then((response) => {
          expect(response.body.message).toEqual('Server error');
        });
    });

    it('should return a server error if an exception occurs during creating a token (tokenNotCreated)', async () => {
      const user = await userFactory.create();
      const loginUserDto = {
        email: user.email,
        password: 'myPassword123',
      };

      jest.spyOn(tokenService, 'create').mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      return request(app.getHttpServer())
        .post(LOGIN_ROUTE)
        .send(loginUserDto)
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)
        .then((response) => {
          expect(response.body.message).toEqual('Server error');
        });
    });
  });

  describe('logout (POST)', () => {
    it('should successfully logout the user and clear the JWT cookie', async () => {
      const user = await userFactory.create();
      const token = await tokenService.create({ user });

      const response = await authenticatedRequest(app.getHttpServer(), token)
        .post(LOGOUT_ROUTE)
        .expect(HttpStatus.CREATED);

      const revokedToken = await tokenService.findUserByJtiAndUserId(
        user.tokens[0].jti,
        user.id,
      );
      expect(response.header['set-cookie'][0]).toMatch(/token=;/);
      expect(revokedToken).toBeNull();
    });

    it('should return an unauthorized error if the user is not authenticated', async () => {
      await request(app.getHttpServer())
        .post(LOGOUT_ROUTE)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  afterEach(async () => {
    await closeAllConnections({
      module: app,
    });
  });
});
