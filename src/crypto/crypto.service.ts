import { Injectable } from '@nestjs/common';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
@Injectable()
export class CryptoService {
  crypto: typeof crypto;
  bcrypt: typeof bcrypt;

  constructor() {
    this.bcrypt = bcrypt;
    this.crypto = crypto;
  }

  hash(input: string, algorithm = 'sha256') {
    return this.crypto.createHash(algorithm).update(input).digest('hex');
  }

  hashPassword(password: string, saltRounds = 10): Promise<string> {
    return new Promise((resolve, reject) => {
      return this.bcrypt.hash(password, saltRounds, function (err, hash) {
        if (err) {
          return reject(err);
        }
        return resolve(hash);
      });
    });
  }

  comparePasswords(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.bcrypt.compare(plainPassword, hashedPassword, (err, result) => {
        if (err) {
          return reject(false);
        }
        return resolve(result);
      });
    });
  }

  randomString(length = 40) {
    return this.crypto.randomBytes(length).toString('hex');
  }
}
