import { TestingModule } from '@nestjs/testing';
import {
  closeAllConnections,
  createBaseTestingModule,
} from '../utils/test/helpers/module';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from '../jwt/jwt.service';
import { UserService } from '../user/user.service';
import { UserFactory } from '../utils/test/factories/user.factory';
import { I18nService } from 'nestjs-i18n';
import { HttpStatus } from '@nestjs/common';
import { TokenService } from '../user/token.service';

describe('JwtAuthGuard', () => {
  let module: TestingModule;
  let jwtAuthGuard: JwtAuthGuard;
  let userService: UserService;
  let userFactory: UserFactory;
  let tokenService: TokenService;

  const reflectorMock = {
    getAllAndOverride: jest.fn(),
  };

  const getRequest = jest.fn();

  const getResponse = () => {
    return {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  };

  const context = {
    switchToHttp: () => ({
      getRequest: getRequest,
      getResponse: getResponse,
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  };

  const requestMock = ({
    token,
    cookies,
  }: {
    token?: string;
    cookies?: any;
  }) => {
    return jest.fn().mockReturnValue({
      headers: {
        ...(token && { authorization: `Bearer ${token}` }),
      },
      cookies: {
        ...cookies,
      },
    });
  };

  beforeEach(async () => {
    module = await createBaseTestingModule({
      imports: [],
      providers: [],
    }).compile();

    userFactory = new UserFactory().setModel(module);
    userService = module.get<UserService>(UserService);
    const jwtService = module.get<JwtService>(JwtService);
    const i18nService = module.get<I18nService>(I18nService);
    tokenService = module.get<TokenService>(TokenService);

    jwtAuthGuard = new JwtAuthGuard(
      userService,
      tokenService,
      jwtService,
      i18nService,
      reflectorMock as any,
    );
  });

  it('should be defined', () => {
    expect(jwtAuthGuard).toBeDefined();
  });

  it('should return true for valid token', async () => {
    // Arrange
    const user = await userFactory.create();

    const token = await tokenService.create({
      user,
    });

    const request = requestMock({
      token,
    });

    getRequest.mockImplementation(request);

    // Act
    const result = await jwtAuthGuard.canActivate(context as any);

    // Assert
    expect(result).toBeTruthy();
    expect(request).toBeCalledTimes(1);
    expect(getRequest().user._id).toEqual(user._id);
  });

  it('should throw http exception for unauthorized request with no token', async () => {
    // Arrange
    const request = requestMock({});

    getRequest.mockImplementation(request);

    // Act & Assert
    await expect(
      jwtAuthGuard.canActivate(context as any),
    ).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
    });
    expect(request).toBeCalledTimes(1);
  });

  it('should throw http exception for unauthorized request with invalid token', async () => {
    // Arrange
    const request = requestMock({
      token: 'Bearer invalid-token',
    });

    getRequest.mockImplementation(request);

    // Act & Assert
    await expect(
      jwtAuthGuard.canActivate(context as any),
    ).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
    });
    expect(request).toBeCalledTimes(1);
  });

  it('should throw http exception for unauthorized request with expired token', async () => {
    // Arrange
    const user = await userFactory.create();

    const token = await tokenService.create({
      user,
      exp: -1,
    });

    const request = requestMock({
      token,
    });

    getRequest.mockImplementation(request);

    // Act & Assert
    await expect(
      jwtAuthGuard.canActivate(context as any),
    ).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
    });
    expect(request).toBeCalledTimes(1);
  });

  it('should throw http exception for unauthorized request with revoked token', async () => {
    // Arrange
    const user = await userFactory.create();

    const token = await tokenService.create({
      user,
      exp: -1,
    });

    await tokenService.revokeByJtiAndUserId(user._id, user.tokens[0].jti);

    const request = requestMock({
      token,
    });

    getRequest.mockImplementation(request);

    // Act & Assert
    await expect(
      jwtAuthGuard.canActivate(context as any),
    ).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
    });
    expect(request).toBeCalledTimes(1);
  });

  it('should throw http exception for unauthorized request with missing user in database', async () => {
    // Arrange
    const user = await userFactory.create();

    const token = await tokenService.create({
      user,
    });

    // Delete the user from the database
    await user.delete();

    const request = requestMock({
      token,
    });

    getRequest.mockImplementation(request);

    // Act & Assert
    await expect(
      jwtAuthGuard.canActivate(context as any),
    ).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
    });
    expect(request).toBeCalledTimes(1);
  });

  it('should return true for valid token in cookie', async () => {
    // Arrange
    const user = await userFactory.create();

    const token = await tokenService.create({
      user,
    });

    const request = requestMock({
      cookies: {
        token,
      },
    });

    getRequest.mockImplementation(request);

    // Act
    const result = await jwtAuthGuard.canActivate(context as any);

    // Assert
    expect(result).toBeTruthy();
    expect(request).toBeCalledTimes(1);
    expect(getRequest().user._id).toEqual(user._id);
  });

  describe('checkingScopes status', () => {
    it('should resolve true if token has required scopes', async () => {
      // Arrange
      const user = await userFactory.create();
      const token = await tokenService.create({
        user,
        scopes: ['read:users', 'write:users'],
      });

      const request = requestMock({
        token,
      });

      getRequest.mockImplementation(request);

      reflectorMock.getAllAndOverride.mockReturnValue(['read:users']);

      // Act
      const result = await jwtAuthGuard.canActivate(context as any);

      // Assert
      expect(result).toBeTruthy();
      expect(request).toBeCalledTimes(1);
      expect(getRequest().user._id).toEqual(user._id);
    });

    it('should reject with an HTTP exception if token does not have required scopes', async () => {
      // Arrange
      const user = await userFactory.create();
      const token = await tokenService.create({
        user,
        scopes: ['read:users'],
      });

      const request = requestMock({
        token,
      });

      getRequest.mockImplementation(request);

      reflectorMock.getAllAndOverride.mockReturnValue(['write:users']);

      // Act & Assert
      await expect(
        jwtAuthGuard.canActivate(context as any),
      ).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
      });
      expect(request).toBeCalledTimes(1);
    });

    it('should reject with an HTTP exception if token has scopes and controller does not have scopes', async () => {
      // Arrange
      const user = await userFactory.create();
      const token = await tokenService.create({
        user,
        scopes: ['read:users'],
      });

      const request = requestMock({
        token,
      });

      getRequest.mockImplementation(request);

      // Act & Assert
      await expect(
        jwtAuthGuard.canActivate(context as any),
      ).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
      });
      expect(request).toBeCalledTimes(1);
    });
  });

  afterEach(async () => {
    await closeAllConnections({
      module,
    });
  });
});
