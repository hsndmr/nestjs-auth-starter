import { assign, createMachine } from 'xstate';
import {
  JwtValidatorContext,
  JwtValidatorServiceSchema,
} from './jwt-validator.types';
import { HttpStatus } from '@nestjs/common';
import { COOKIE_JWT_KEY } from '../constants';

const jwtValidatorMachine = createMachine<JwtValidatorContext>(
  {
    id: 'jwtValidator',
    predictableActionArguments: true,
    context: {},
    schema: {
      services: {} as JwtValidatorServiceSchema,
    },
    initial: 'parsingTokenFromCookie',
    states: {
      parsingTokenFromCookie: {
        always: [
          {
            target: 'verifyingToken',
            cond: 'isValidCookie',
            actions: assign((context) => {
              return {
                token: context.authorizationCookie,
              };
            }),
          },
          {
            target: 'parsingTokenFromHeader',
          },
        ],
      },
      parsingTokenFromHeader: {
        always: [
          {
            target: 'verifyingToken',
            cond: 'isValidHeader',
            actions: 'assignTokenToContext',
          },
          {
            target: 'invalidHeader',
          },
        ],
      },
      verifyingToken: {
        invoke: {
          src: 'verifyToken',
          onDone: {
            target: 'verifyingUser',
            actions: 'assignVerifiedTokenToContext',
          },
          onError: {
            target: 'invalidToken',
          },
        },
      },
      verifyingUser: {
        invoke: {
          src: 'verifyUser',
          onDone: {
            target: 'checkingScopes',
            actions: 'assignUserToContext',
          },
          onError: {
            target: 'unauthorized',
          },
        },
      },
      checkingScopes: {
        invoke: {
          src: 'checkScopes',
          onDone: {
            target: 'authorized',
          },
          onError: {
            target: 'forbidden',
          },
        },
      },
      authorized: {
        type: 'final',
      },
      unauthorized: {
        entry: ['assignUnauthorizedErrorToContext', 'clearCookie'],
        type: 'final',
      },
      invalidToken: {
        entry: ['assignUnauthorizedErrorToContext', 'clearCookie'],
        type: 'final',
      },
      invalidHeader: {
        entry: ['assignUnauthorizedErrorToContext', 'clearCookie'],
        type: 'final',
      },
      forbidden: {
        entry: assign((context) => ({
          errorCode: HttpStatus.FORBIDDEN,
          errorMessage: context.i18n.translate('errors.forbidden'),
        })),
        type: 'final',
      },
    },
  },
  {
    services: {
      verifyToken: (context) => {
        return context.jwtService.verify(context.token);
      },
      verifyUser: async (context) => {
        try {
          const user = await context.tokenService.findUserByJtiAndUserId(
            context.verifiedToken.jti,
            context.verifiedToken.subject,
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
        const tokenCanAccess = context.tokenService.can(
          context.user.tokens[0],
          context.scopes,
        );
        if (!tokenCanAccess) {
          return Promise.reject('');
        }

        return Promise.resolve(true);
      },
    },
    actions: {
      assignTokenToContext: assign((context) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_, token] = (context.authorizationHeader as string).split(' ');
        return {
          token,
        };
      }),
      assignVerifiedTokenToContext: assign((_, event) => {
        return {
          verifiedToken: event.data,
        };
      }),
      assignUserToContext: assign((_, event) => {
        return {
          user: event.data,
        };
      }),
      assignUnauthorizedErrorToContext: assign((context) => ({
        errorCode: HttpStatus.UNAUTHORIZED,
        errorMessage: context.i18n.translate('errors.unauthorized'),
      })),
      clearCookie: (context) => {
        context.response.clearCookie(COOKIE_JWT_KEY);
      },
    },
    guards: {
      isValidHeader: ({ authorizationHeader }) => {
        return !(!authorizationHeader || Array.isArray(authorizationHeader));
      },
      isValidCookie: ({ authorizationCookie }) => {
        return !!authorizationCookie;
      },
    },
  },
);

export default jwtValidatorMachine;
