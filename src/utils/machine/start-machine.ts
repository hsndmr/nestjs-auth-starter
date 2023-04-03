import { interpret, State } from 'xstate';

export const startMachine = <TContext>(
  service: ReturnType<typeof interpret<any>>,
): Promise<State<TContext>> => {
  return new Promise((resolve) => {
    service
      .onDone(() => {
        resolve(service.getSnapshot());
      })
      .start();
  });
};
