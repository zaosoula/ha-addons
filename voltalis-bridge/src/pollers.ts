import { Voltalis } from "./lib/voltalis"
import { poller } from "./lib/poller"

export const registerPollers = (voltalis: Voltalis) => {
  return {
     immediateconsumption: poller('*/30 * * * * *', voltalis.fetchImmediateConsumptionInW)
  }
}
