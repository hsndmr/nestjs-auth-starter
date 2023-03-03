import { TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserFactory } from '../utils/test/factories/user.factory';
import {
  closeAllConnections,
  createBaseTestingModule,
} from '../utils/test/helpers/module';
import { JwtService } from '../jwt/jwt.service';
import { UserToken } from './schemas/user-token.schema';

describe('UserService', () => {
  let module: TestingModule;
  let service: UserService;
  let userFactory: UserFactory;
  let jwtService: JwtService;

  beforeEach(async () => {
    module = await createBaseTestingModule({}).compile();

    service = module.get<UserService>(UserService);

    jwtService = module.get<JwtService>(JwtService);

    userFactory = new UserFactory().setModel(module);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should create a user', async () => {
      const password = userFactory.faker.internet.password();

      const user = await service.create({
        email: userFactory.faker.internet.email(),
        name: userFactory.faker.name.firstName(),
        lastName: userFactory.faker.name.lastName(),
        password: password,
      });

      expect(user).toBeDefined();
      expect(user.password).not.toEqual(password);
    });
  });

  describe('createFromDto', () => {
    it('should create a user from dto', async () => {
      const user = await service.createFromDto({
        email: userFactory.faker.internet.email(),
        name: userFactory.faker.name.firstName(),
        lastName: userFactory.faker.name.lastName(),
        password: userFactory.faker.internet.password(),
      });

      expect(user).toBeDefined();
    });
  });
  describe('findOneByEmail', () => {
    it('should find a user by email', async () => {
      const user = await userFactory.create();

      const foundUser = await service.findOneByEmail(user.email);

      expect(foundUser).toBeDefined();
    });
  });

  describe('findOneById', () => {
    it('should find a user by id', async () => {
      const user = await userFactory.create();

      const foundUser = await service.findOneById(user.id);

      expect(foundUser).toBeDefined();
    });
  });

  describe('createToken', () => {
    it('should create a token', async () => {
      const user = await userFactory.create();

      const token = await service.createToken({
        user: user,
      });

      expect(token).toBeDefined();
    });

    it('should create a token with scopes', async () => {
      const user = await userFactory.create();

      await service.createToken({
        user: user,
        scopes: ['test'],
      });

      expect(user.tokens[0].scopes).toEqual(['test']);
    });
  });

  describe('findUserByJtiAndId', () => {
    it('should find a token by jti and user id', async () => {
      // Arrange
      const user = await userFactory.create();

      await service.createToken({
        user: user,
      });

      const token = await service.createToken({
        user: user,
      });

      await service.createToken({
        user: user,
      });

      const verifiedToken = await jwtService.verify(token);

      const { jti, sub } = verifiedToken;

      // Act
      const foundToken = await service.findUserByJtiAndId(jti, sub);

      // Assert
      expect(foundToken._id).toEqual(user._id);
      expect(foundToken.tokens.length).toEqual(1);
      expect(foundToken.tokens[0].jti).toEqual(user.tokens[1].jti);
    });
  });

  describe('tokenCan', () => {
    it('should return true if token has no scopes', () => {
      const token = new UserToken({
        jti: 'test-jti',
        expires_at: new Date(),
      });

      expect(service.tokenCan(token)).toBe(true);
    });

    it('should return false if scopes are not provided', () => {
      const token = new UserToken({
        jti: 'test-jti',
        expires_at: new Date(),
        scopes: ['test-scope'],
      });

      expect(service.tokenCan(token)).toBe(false);
    });

    it('should return true if token has required scope', () => {
      const token = new UserToken({
        jti: 'test-jti',
        expires_at: new Date(),
        scopes: ['test-scope'],
      });

      expect(service.tokenCan(token, ['test-scope', 'test-scope-2'])).toBe(
        true,
      );
    });

    it('should return false if token does not have required scope', () => {
      const token = new UserToken({
        jti: 'test-jti',
        expires_at: new Date(),
        scopes: ['test-scope'],
      });

      expect(service.tokenCan(token, ['other-scope'])).toBe(false);
    });
  });

  describe('revokeTokenByJtiAndUserId', () => {
    it('should revoke a token', async () => {
      // Arrange
      const user = await userFactory.create();
      await service.createToken({ user });

      // Act
      const result = await service.revokeTokenByJtiAndUserId(
        user._id,
        user.tokens[0].jti,
      );

      // Assert
      expect(result).toBe(true);
      const updatedUser = await service.findOneById(user._id);
      expect(updatedUser.tokens[0].revoked_at).toBeDefined();
    });

    it('should not revoke an already revoked token', async () => {
      // Arrange
      const user = await userFactory.create();
      await service.createToken({ user });

      // Act
      const result1 = await service.revokeTokenByJtiAndUserId(
        user._id,
        user.tokens[0].jti,
      );
      const result2 = await service.revokeTokenByJtiAndUserId(
        user._id,
        user.tokens[0].jti,
      );

      // Assert
      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should not revoke a non-existing token', async () => {
      // Arrange
      const user = await userFactory.create();

      // Act
      const result = await service.revokeTokenByJtiAndUserId(
        user._id,
        'non-existing-token-id',
      );

      // Assert
      expect(result).toBe(false);
      const updatedUser = await service.findOneById(user._id);
      expect(updatedUser.tokens).toHaveLength(0);
    });

    it('should not revoke a token for a different user', async () => {
      // Arrange
      const user1 = await userFactory.create();
      const user2 = await userFactory.create();
      await service.createToken({ user: user1 });

      // Act
      const result = await service.revokeTokenByJtiAndUserId(
        user2._id,
        user1.tokens[0].jti,
      );

      // Assert
      expect(result).toBe(false);
      const updatedUser1 = await service.findOneById(user1._id);
      const updatedUser2 = await service.findOneById(user2._id);
      expect(updatedUser1.tokens[0].revoked_at).toBeUndefined();
      expect(updatedUser2.tokens).toHaveLength(0);
    });
  });

  afterEach(async () => {
    await closeAllConnections({
      module,
    });
  });
});
