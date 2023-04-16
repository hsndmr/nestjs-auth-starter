import {
  CanActivate,
  ExecutionContext,
  Injectable,
  PlainLiteralObject,
} from '@nestjs/common';
import { IncomingMessage } from 'http';
import { UserDocument } from '../user/schemas/user.schema';
import { interpret } from 'xstate';
import jwtValidatorMachine from './machines/jwt-validator.machine';
import { UserService } from '../user/user.service';
import { JwtService } from '../jwt/jwt.service';
import { I18nService } from 'nestjs-i18n';
import { Reflector } from '@nestjs/core';
import { SCOPES_KEY } from './decorators/scopes.decorator';
import { TokenService } from '../user/token.service';
import { Response } from 'express';
import { COOKIE_JWT_KEY } from './constants';
import { startMachine } from '../utils/machine/start-machine';
import { JwtValidatorContext } from './machines/jwt-validator.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly jwtService: JwtService,
    private i18n: I18nService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest() as IncomingMessage & {
      user?: UserDocument;
      cookies: PlainLiteralObject;
    };

    const response = context.switchToHttp().getResponse() as Response;

    const scopes = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const service = interpret(
      jwtValidatorMachine.withContext({
        authorizationHeader: request.headers['authorization'],
        authorizationCookie: request.cookies
          ? request.cookies[COOKIE_JWT_KEY]
          : undefined,
        jwtService: this.jwtService,
        tokenService: this.tokenService,
        scopes: scopes,
        i18n: this.i18n,
        response,
      }),
    );

    const snapshot = await startMachine<JwtValidatorContext>(service);

    request.user = snapshot.context.user;

    return true;
  }
}
