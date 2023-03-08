import { assign, createMachine } from 'xstate';
import {
  JwtValidatorContext,
  JwtValidatorServiceSchema,
} from './jwt-validator.types';

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
        type: 'final',
      },
      invalidToken: {
        type: 'final',
      },
      invalidHeader: {
        type: 'final',
      },
      forbidden: {
        type: 'final',
      },
    },
  },
  {
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
