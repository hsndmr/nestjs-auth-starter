import { Inject, Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { MODULE_OPTIONS_TOKEN } from './jwt.module-definition';
import { JwtModuleOptions } from './interfaces/jwt-module-options.interface';
import { SignOptions } from './interfaces/jwt-service-sign-options.interface';
import { JwtPayload } from 'jsonwebtoken';
import { CryptoService } from '../crypto/crypto.service';
import { Sign } from './interfaces/jwt-service-sign.interface';

const DEFAULT_EXPIRES_IN = 60 * 60;
const MS_PER_SEC = 1000;

@Injectable()
export class JwtService {
  jwt: typeof jwt;

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN) private options: JwtModuleOptions,
    private readonly cryptoService: CryptoService,
  ) {
    this.jwt = jwt;
  }

  sign(options: SignOptions): Sign {
    const exp =
      Math.floor(Date.now() / MS_PER_SEC) +
      (options.exp || this.options.exp || DEFAULT_EXPIRES_IN);

    const jti = this.cryptoService.randomString(80);
    const token = this.jwt.sign(
      {
        exp: exp,
        subject: options.subject,
        jti: jti,
      },
      this.options.secret,
    );

    return {
      token: token,
      exp: exp,
      jti: this.cryptoService.hash(jti),
    };
  }

  verify(token: string): Promise<JwtPayload> {
    return new Promise((resolve, reject) => {
      this.jwt.verify(token, this.options.secret, (err, decoded) => {
        if (err) {
          reject(err);
          return;
        }

        if (typeof decoded !== 'object') {
          reject(new Error('Invalid token'));
          return;
        }

        resolve({
          ...decoded,
          jti: this.cryptoService.hash(decoded.jti),
        });
      });
    });
  }
}
