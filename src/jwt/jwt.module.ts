import { Global, Module } from '@nestjs/common';
import { JwtService } from './jwt.service';
import { ConfigurableModuleClass } from './jwt.module-definition';
import { CryptoService } from '../crypto/crypto.service';

@Global()
@Module({
  providers: [JwtService, CryptoService],
  exports: [JwtService],
})
export class JwtModule extends ConfigurableModuleClass {}
