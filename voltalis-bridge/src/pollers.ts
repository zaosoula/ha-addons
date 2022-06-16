import { Voltalis } from "./lib/voltalis"
import { poller } from "./lib/poller"
import { AxiosObservable } from "axios-observable"

export const registerPollers = (voltalis: Voltalis) => {
  return {
    immediateConsumptionInkW: poller('*/5 * * * * *', voltalis.fetchImmediateConsumptionInkW)
  }
}
