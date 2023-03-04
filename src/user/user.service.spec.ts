import { TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserFactory } from '../utils/test/factories/user.factory';
import {
  closeAllConnections,
  createBaseTestingModule,
} from '../utils/test/helpers/module';

describe('UserService', () => {
  let module: TestingModule;
  let service: UserService;
  let userFactory: UserFactory;

  beforeEach(async () => {
    module = await createBaseTestingModule({}).compile();

    service = module.get<UserService>(UserService);

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

  afterEach(async () => {
    await closeAllConnections({
      module,
    });
  });
});
