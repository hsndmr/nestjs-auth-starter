import { interpret, State } from 'xstate';
import { HttpException } from '@nestjs/common';

export const startMachine = <TContext>(
  service: ReturnType<typeof interpret<any>>,
): Promise<State<TContext>> => {
  return new Promise((resolve, reject) => {
    service
      .onDone(() => {
        const snapshot = service.getSnapshot();
        const { errorCode, errorMessage } = snapshot.context;
        if (errorCode) {
          reject(new HttpException(errorMessage, errorCode));
          return;
        }
        resolve(snapshot);
      })
      .start();
  });
};
