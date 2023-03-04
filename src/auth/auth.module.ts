import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { CryptoService } from '../crypto/crypto.service';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [CryptoService],
})
export class AuthModule {}
