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
import { HttpException, HttpStatus } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let module: TestingModule;
  let jwtAuthGuard: JwtAuthGuard;
  let userService: UserService;
  let userFactory: UserFactory;

  beforeEach(async () => {
    module = await createBaseTestingModule({
      imports: [],
      providers: [],
    }).compile();

    userFactory = new UserFactory().setModel(module);
    userService = module.get<UserService>(UserService);
    const jwtService = module.get<JwtService>(JwtService);
    const i18nService = module.get<I18nService>(I18nService);

    jwtAuthGuard = new JwtAuthGuard(userService, jwtService, i18nService);
  });

  it('should be defined', () => {
    expect(jwtAuthGuard).toBeDefined();
  });

  it('should return true for valid token', async () => {
    // Arrange
    const user = await userFactory.create();

    const token = await userService.createToken({
      user,
    });

    const request = jest.fn().mockReturnValue({
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const context = {
      switchToHttp: () => ({
        getRequest: request,
      }),
    };

    // Act
    const result = await jwtAuthGuard.canActivate(context as any);

    // Assert
    expect(result).toBeTruthy();
    expect(request).toBeCalledTimes(1);
    expect(request().user._id).toEqual(user._id);
  });

  it('should throw http exception for unauthorized request with no token', async () => {
    // Arrange
    const request = jest.fn().mockReturnValue({
      headers: {},
    });

    const context = {
      switchToHttp: () => ({
        getRequest: request,
      }),
    };

    // Act & Assert
    await expect(jwtAuthGuard.canActivate(context as any)).rejects.toEqual(
      new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED),
    );
    expect(request).toBeCalledTimes(1);
  });

  it('should throw http exception for unauthorized request with invalid token', async () => {
    // Arrange
    const request = jest.fn().mockReturnValue({
      headers: {
        authorization: 'Bearer invalid-token',
      },
    });

    const context = {
      switchToHttp: () => ({
        getRequest: request,
      }),
    };

    // Act & Assert
    await expect(jwtAuthGuard.canActivate(context as any)).rejects.toEqual(
      new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED),
    );
    expect(request).toBeCalledTimes(1);
  });

  it('should throw http exception for unauthorized request with expired token', async () => {
    // Arrange
    const user = await userFactory.create();

    const token = await userService.createToken({
      user,
      exp: -1,
    });

    const request = jest.fn().mockReturnValue({
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const context = {
      switchToHttp: () => ({
        getRequest: request,
      }),
    };

    // Act & Assert
    await expect(jwtAuthGuard.canActivate(context as any)).rejects.toEqual(
      new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED),
    );
    expect(request).toBeCalledTimes(1);
  });

  it('should throw http exception for unauthorized request with missing user in database', async () => {
    // Arrange
    const user = await userFactory.create();

    const token = await userService.createToken({
      user,
    });

    // Delete the user from the database
    await user.delete();

    const request = jest.fn().mockReturnValue({
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const context = {
      switchToHttp: () => ({
        getRequest: request,
      }),
    };

    // Act & Assert
    await expect(jwtAuthGuard.canActivate(context as any)).rejects.toEqual(
      new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED),
    );
    expect(request).toBeCalledTimes(1);
  });

  afterEach(async () => {
    await closeAllConnections({
      module,
    });
  });
});
