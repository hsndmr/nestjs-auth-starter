import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Model } from 'mongoose';
import { JwtService } from '../jwt/jwt.service';
import { UserToken } from './schemas/user-token.schema';
import { TokenOptions } from './interfaces/user-service-create-token-options.interface';
import { CryptoService } from '../crypto/crypto.service';

const MS_PER_SEC = 1000;

@Injectable()
export class TokenService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly cryptoService: CryptoService,
  ) {}

  async create({ user, exp, scopes }: TokenOptions) {
    const signed = this.jwtService.sign({
      subject: user.id,
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

  can(token: UserToken, scopes?: string[]) {
    if (!token.scopes || !token.scopes.length) {
      return true;
    }

    if (!scopes || !scopes.length) {
      return false;
    }

    return scopes.some((scope) => token.scopes.includes(scope));
  }

  async revokeByJtiAndUserId(userId: string, jti: string) {
    const result = await this.userModel.updateOne(
      {
        _id: userId,
        'tokens.jti': jti,
        'tokens.revoked_at': { $exists: false },
      },
      { $set: { 'tokens.$.revoked_at': new Date() } },
    );

    return result.modifiedCount === 1;
  }

  async findUserByJtiAndUserId(jti: string, userId: string) {
    const tokens = {
      $elemMatch: {
        jti: this.cryptoService.hash(jti),
        revoked_at: {
          $exists: false,
        },
      },
    };

    return this.userModel.findOne(
      {
        _id: userId,
        tokens,
      },
      {
        tokens,
        __v: 0,
      },
    );
  }
}
