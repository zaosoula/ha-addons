import { Observable, switchMap } from "rxjs";
import { schedule } from "node-cron";
export { Axios as axios } from "axios-observable";

function cron(expr: string) {
  let counter = 0

  return new Observable((subscriber) => {
    subscriber.next(counter++);

    const task = schedule(expr, () => {
      subscriber.next(counter++)
    })

    task.start()

    return () => task.stop();
  })
}


export const poller = <T extends Observable<any>>(expr: string, fetchFn: () => T) => cron(expr).pipe(switchMap(() => fetchFn()))

