import { TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserFactory } from '../utils/test/factories/user.factory';
import {
  closeAllConnections,
  createBaseTestingModule,
} from '../utils/test/helpers/module';
import { JwtService } from '../jwt/jwt.service';
import { UserToken } from './schemas/user-token.schema';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let module: TestingModule;
  let service: TokenService;
  let userFactory: UserFactory;
  let jwtService: JwtService;
  let userService: UserService;

  beforeEach(async () => {
    module = await createBaseTestingModule({}).compile();

    service = module.get<TokenService>(TokenService);

    userService = module.get<UserService>(UserService);

    jwtService = module.get<JwtService>(JwtService);

    userFactory = new UserFactory().setModel(module);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a token', async () => {
      const user = await userFactory.create();

      const token = await service.create({
        user: user,
      });

      expect(token).toBeDefined();
    });

    it('should create a token with scopes', async () => {
      const user = await userFactory.create();

      await service.create({
        user: user,
        scopes: ['test'],
      });

      expect(user.tokens[0].scopes).toEqual(['test']);
    });
  });

  describe('can', () => {
    it('should return true if token has no scopes', () => {
      const token = new UserToken({
        jti: 'test-jti',
        expires_at: new Date(),
      });

      expect(service.can(token)).toBe(true);
    });

    it('should return false if scopes are not provided', () => {
      const token = new UserToken({
        jti: 'test-jti',
        expires_at: new Date(),
        scopes: ['test-scope'],
      });

      expect(service.can(token)).toBe(false);
    });

    it('should return true if token has required scope', () => {
      const token = new UserToken({
        jti: 'test-jti',
        expires_at: new Date(),
        scopes: ['test-scope'],
      });

      expect(service.can(token, ['test-scope', 'test-scope-2'])).toBe(true);
    });

    it('should return false if token does not have required scope', () => {
      const token = new UserToken({
        jti: 'test-jti',
        expires_at: new Date(),
        scopes: ['test-scope'],
      });

      expect(service.can(token, ['other-scope'])).toBe(false);
    });
  });

  describe('revokeByJtiAndUserId', () => {
    it('should revoke a token', async () => {
      // Arrange
      const user = await userFactory.create();
      await service.create({ user });

      // Act
      const result = await service.revokeByJtiAndUserId(
        user._id,
        user.tokens[0].jti,
      );

      // Assert
      expect(result).toBe(true);
      const updatedUser = await userService.findOneById(user._id);
      expect(updatedUser.tokens[0].revoked_at).toBeDefined();
    });

    describe('findUserByJtiAndId', () => {
      it('should find a token by jti and user id', async () => {
        // Arrange
        const user = await userFactory.create();

        await service.create({
          user: user,
        });

        const token = await service.create({
          user: user,
        });

        await service.create({
          user: user,
        });

        const verifiedToken = await jwtService.verify(token);

        const { jti, subject } = verifiedToken;

        // Act
        const foundToken = await service.findUserByJtiAndUserId(jti, subject);

        // Assert
        expect(foundToken._id).toEqual(user._id);
        expect(foundToken.tokens.length).toEqual(1);
        expect(foundToken.tokens[0].jti).toEqual(user.tokens[1].jti);
      });
    });

    it('should not revoke an already revoked token', async () => {
      // Arrange
      const user = await userFactory.create();
      await service.create({ user });

      // Act
      const result1 = await service.revokeByJtiAndUserId(
        user._id,
        user.tokens[0].jti,
      );
      const result2 = await service.revokeByJtiAndUserId(
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
      const result = await service.revokeByJtiAndUserId(
        user._id,
        'non-existing-token-id',
      );

      // Assert
      expect(result).toBe(false);
      const updatedUser = await userService.findOneById(user._id);
      expect(updatedUser.tokens).toHaveLength(0);
    });

    it('should not revoke a token for a different user', async () => {
      // Arrange
      const user1 = await userFactory.create();
      const user2 = await userFactory.create();
      await service.create({ user: user1 });

      // Act
      const result = await service.revokeByJtiAndUserId(
        user2._id,
        user1.tokens[0].jti,
      );

      // Assert
      expect(result).toBe(false);
      const updatedUser1 = await userService.findOneById(user1._id);
      const updatedUser2 = await userService.findOneById(user2._id);
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
