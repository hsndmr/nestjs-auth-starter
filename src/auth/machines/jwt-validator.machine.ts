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
    initial: 'parsingTokenFromHeader',
    states: {
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
            target: 'authenticatedUser',
            actions: 'assignUserToContext',
          },
          onError: {
            target: 'unauthenticatedUser',
          },
        },
      },
      authenticatedUser: {
        type: 'final',
      },
      unauthenticatedUser: {
        type: 'final',
      },
      invalidToken: {
        type: 'final',
      },
      invalidHeader: {
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
    },
  },
);

export default jwtValidatorMachine;
