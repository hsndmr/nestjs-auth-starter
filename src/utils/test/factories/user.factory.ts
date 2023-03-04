import { Factory } from './factory';
import { User, UserDocument } from '../../../user/schemas/user.schema';
import { TestingModule } from '@nestjs/testing';
import { UserService } from '../../../user/user.service';
import { TokenService } from '../../../user/token.service';

export class UserFactory extends Factory<UserDocument> {
  modelToken = User.name;

  userService: UserService;

  tokenService: TokenService;

  async create(partialUser?: Partial<User>): Promise<UserDocument> {
    const createdUser = new this.model(
      new User({
        email: this.faker.internet.email(),
        name: this.faker.name.firstName(),
        lastName: this.faker.name.lastName(),
        password:
          '$2b$04$Uvn5oVukGi4s1RXilFfj3u4Fmg1qw3wa1qQyniBHhmi7lMJJ9aaQO', // myPassword123
        ...partialUser,
      }),
    );
    return createdUser.save();
  }

  async createWithToken(): Promise<[UserDocument, string]> {
    const user = await this.create();
    const token = await this.tokenService.create({ user });
    return [user, token];
  }

  setModel(module: TestingModule) {
    this.userService = module.get(UserService);
    this.tokenService = module.get(TokenService);
    return super.setModel(module);
  }
}
