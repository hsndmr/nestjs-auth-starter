import { Factory } from './factory';
import { User, UserDocument } from '../../../user/schemas/user.schema';
import { TestingModule } from '@nestjs/testing';
import { UserService } from '../../../user/user.service';
import { TokenService } from '../../../user/token.service';

export class UserFactory extends Factory<UserDocument> {
  modelToken = User.name;

  userService: UserService;

  tokenService: TokenService;

  async create() {
    const createdUser = new this.model(
      new User({
        email: this.faker.internet.email(),
        name: this.faker.name.firstName(),
        lastName: this.faker.name.lastName(),
        password: this.faker.internet.password(),
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
