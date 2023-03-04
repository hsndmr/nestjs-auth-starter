import { Global, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { CryptoService } from '../crypto/crypto.service';
import { TokenService } from './token.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],
  providers: [UserService, TokenService, CryptoService],
  exports: [UserService, TokenService],
})
export class UserModule {}
