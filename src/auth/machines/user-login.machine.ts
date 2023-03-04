import { assign, createMachine } from 'xstate';
import { UserLoginContext, UserLoginServiceSchema } from './user-login.types';

export const userLoginMachine = createMachine<UserLoginContext>(
  {
    id: 'userLogin',
    predictableActionArguments: true,
    initial: 'findingUserById',
    schema: {
      services: {} as UserLoginServiceSchema,
    },
    states: {
      findingUserById: {
        invoke: {
          src: 'findUserById',
          onDone: {
            target: 'foundUser',
            actions: assign((context, event) => {
              return {
                user: event.data.user,
              };
            }),
          },
          onError: {
            target: 'notFoundUser',
            actions: 'assignErrorToContext',
          },
        },
      },
      foundUser: {
        invoke: {
          src: 'checkPassword',
          onDone: {
            target: 'passwordMatched',
          },
          onError: {
            target: 'passwordNotMatched',
            actions: 'assignErrorToContext',
          },
        },
      },
      passwordMatched: {
        invoke: {
          src: 'createToken',
          onDone: {
            target: 'tokenCreated',
            actions: assign((context, event) => {
              return {
                token: event.data.token,
              };
            }),
          },
          onError: {
            target: 'tokenNotCreated',
            actions: 'assignErrorToContext',
          },
        },
      },
      passwordNotMatched: {
        type: 'final',
      },
      notFoundUser: {
        type: 'final',
      },
      tokenCreated: {
        type: 'final',
      },
      tokenNotCreated: {
        type: 'final',
      },
    },
  },
  {
    actions: {
      assignErrorToContext: assign((context, event) => {
        return {
          error: event.data.error,
          status: event.data.status,
        };
      }),
    },
  },
);
