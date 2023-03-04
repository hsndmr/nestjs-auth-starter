import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
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

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly jwtService: JwtService,
    private i18n: I18nService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest() as IncomingMessage & {
      user?: UserDocument;
    };

    const scopes = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const service = interpret(
      jwtValidatorMachine
        .withContext({
          authorizationHeader: request.headers['authorization'],
        })
        .withConfig({
          services: {
            verifyToken: (context) => {
              return this.jwtService.verify(context.token);
            },
            verifyUser: async (context) => {
              try {
                const user = await this.tokenService.findUserByJtiAndUserId(
                  context.verifiedToken.jti,
                  context.verifiedToken.sub,
                );

                if (!user) {
                  return Promise.reject('');
                }

                return Promise.resolve(user);
              } catch (e) {
                return Promise.reject(e);
              }
            },
            checkScopes: (context) => {
              const tokenCanAccess = this.tokenService.can(
                context.user.tokens[0],
                scopes,
              );
              if (!tokenCanAccess) {
                return Promise.reject('');
              }

              return Promise.resolve(true);
            },
          },
        }),
    );

    return new Promise((resolve, reject) => {
      service
        .onDone(() => {
          const snapshot = service.getSnapshot();

          if (snapshot.matches('authorized')) {
            request.user = snapshot.context.user;
            return resolve(true);
          }

          const [messageKey, status] = this.getErrorMessageKeyAndStatus(
            snapshot.matches('forbidden'),
          );

          return reject(
            new HttpException(this.i18n.translate(messageKey), status),
          );
        })
        .start();
    });
  }

  protected getErrorMessageKeyAndStatus(
    isForbiddenStatus: boolean,
  ): [string, number] {
    if (isForbiddenStatus) {
      return ['errors.forbidden', HttpStatus.FORBIDDEN];
    }

    return ['errors.unauthorized', HttpStatus.UNAUTHORIZED];
  }
}
