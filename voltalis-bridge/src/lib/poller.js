const { Observable, switchMap } = require('rxjs')
const { schedule } = require('node-cron')
const axios = require('axios-observable').Axios

function cron(expr) {
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


exports.axios = axios;
exports.poller = (expr, fetchFn) => cron(expr).pipe(switchMap(() => fetchFn()))

