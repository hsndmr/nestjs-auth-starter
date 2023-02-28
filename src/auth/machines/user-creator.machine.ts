import { assign, createMachine } from 'xstate';
import {
  UserCreatorContext,
  UserCreatorServiceSchema,
} from './user-creator.types';

const userCreatorMachine = createMachine<UserCreatorContext>(
  {
    predictableActionArguments: true,
    context: {},
    schema: {
      services: {} as UserCreatorServiceSchema,
    },
    initial: 'checking',
    states: {
      checking: {
        invoke: {
          src: 'checkUserIfExists',
          onDone: {
            target: 'creating',
          },
          onError: {
            target: 'error',
            actions: 'assignErrorToContext',
          },
        },
      },
      creating: {
        invoke: {
          src: 'createUser',
          onDone: {
            target: 'created',
            actions: 'assignDataToContext',
          },
          onError: {
            target: 'error',
            actions: 'assignErrorToContext',
          },
        },
      },
      created: {
        // invoke: [{ src: 'sendEmail' }],
        type: 'final',
      },
      error: {
        type: 'final',
      },
    },
  },
  {
    actions: {
      assignDataToContext: assign((context, event) => {
        return {
          user: event.data.user,
          token: event.data.token,
        };
      }),
      assignErrorToContext: assign((context, event) => {
        return {
          error: event.data.error,
          status: event.data.status,
        };
      }),
    },
  },
);

export default userCreatorMachine;
