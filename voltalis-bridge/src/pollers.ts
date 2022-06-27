import { Voltalis } from "./lib/voltalis"
import { poller } from "./lib/poller"

export const registerPollers = (voltalis: Voltalis) => {
  return {
    immediateConsumptionInkW: poller('*/2 * * * *', voltalis.fetchImmediateConsumptionInkW)
  }
}
