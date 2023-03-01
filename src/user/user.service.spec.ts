import { TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserFactory } from '../utils/test/factories/user.factory';
import {
  closeAllConnections,
  createBaseTestingModule,
} from '../utils/test/helpers/module';
import { JwtService } from '../jwt/jwt.service';

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

  it('should create a user from dto', async () => {
    const user = await service.createFromDto({
      email: userFactory.faker.internet.email(),
      name: userFactory.faker.name.firstName(),
      lastName: userFactory.faker.name.lastName(),
      password: userFactory.faker.internet.password(),
    });

    expect(user).toBeDefined();
  });

  it('should find a user by email', async () => {
    const user = await userFactory.create();

    const foundUser = await service.findOneByEmail(user.email);

    expect(foundUser).toBeDefined();
  });

  it('should find a user by id', async () => {
    const user = await userFactory.create();

    const foundUser = await service.findOneById(user.id);

    expect(foundUser).toBeDefined();
  });

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

  it('should find a token by jti and user id', async () => {
    // Arrange
    const user = await userFactory.create();

    const token = await service.createToken({
      user: user,
    });

    const verifiedToken = await jwtService.verify(token);

    const { jti, sub } = verifiedToken;

    // Act
    const foundToken = await service.findUserByJtiAndId(jti, sub);

    // Assert
    expect(foundToken._id).toEqual(user._id);
  });

  afterEach(async () => {
    await closeAllConnections({
      module,
    });
  });
});
