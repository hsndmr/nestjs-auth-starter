import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { IncomingMessage } from 'http';
import { UserDocument } from '../user/schemas/user.schema';
import { interpret } from 'xstate';
import jwtValidatorMachine from './machines/jwt-validator.machine';
import { UserService } from '../user/user.service';
import { JwtService } from '../jwt/jwt.service';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private i18n: I18nService,
  ) {}

  canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest() as IncomingMessage & {
      user?: UserDocument;
    };

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
                const user = await this.userService.findUserByJtiAndId(
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
          },
        }),
    );

    return new Promise((resolve, reject) => {
      service
        .onDone(() => {
          const snapshot = service.getSnapshot();

          if (snapshot.matches('authenticatedUser')) {
            request.user = snapshot.context.user;
            return resolve(true);
          }

          return reject(
            new HttpException(this.i18n.translate('errors.unauthorized'), 401),
          );
        })
        .start();
    });
  }
}
