import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Model } from 'mongoose';
import { CreateUserDto } from '../auth/dtos/create-user.dto';
import { JwtService } from '../jwt/jwt.service';
import { UserToken } from './schemas/user-token.schema';
import { TokenOptions } from './interfaces/user-service-create-token-options.interface';
import { CryptoService } from '../crypto/crypto.service';

const MS_PER_SEC = 1000;

@Injectable()
export class UserService {
  model: any;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly cryptoService: CryptoService,
  ) {}

  async findOneById(id: string): Promise<UserDocument> {
    return this.userModel.findById(id);
  }

  async findOneByEmail(email: string): Promise<UserDocument> {
    return this.userModel.findOne({
      email: email,
    });
  }

  async createFromDto(dto: CreateUserDto): Promise<UserDocument> {
    return this.create({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      lastName: dto.lastName,
    });
  }

  async create(user: User): Promise<UserDocument> {
    const createdUser = new this.userModel({
      ...user,
      password: await this.cryptoService.hashPassword(user.password),
    });
    return createdUser.save();
  }

  async createToken({ user, exp, scopes }: TokenOptions) {
    const signed = this.jwtService.sign({
      sub: user.id,
      exp: exp,
    });

    const token = new UserToken({
      jti: this.cryptoService.hash(signed.jti),
      expires_at: new Date(signed.exp * MS_PER_SEC),
      scopes,
    });

    user.tokens.push(token);

    await user.save();

    return signed.token;
  }

  async findUserByJtiAndId(jti: string, id: string) {
    const tokens = { $elemMatch: { jti: this.cryptoService.hash(jti) } };

    return this.userModel.findOne(
      {
        _id: id,
        tokens,
      },
      {
        tokens,
        __v: 0,
      },
    );
  }

  tokenCan(token: UserToken, scopes?: string[]) {
    if (!token.scopes || !token.scopes.length) {
      return true;
    }

    if (!scopes || !scopes.length) {
      return false;
    }

    return scopes.some((scope) => token.scopes.includes(scope));
  }
}
