import { Voltalis } from "./lib/voltalis";
import { poller } from "./lib/poller";

export const registerPollers = (voltalis: Voltalis) => {
  return {
    consumptionInWh: poller(
      "* * * * *",
      voltalis.fetchConsumptionInWh
    ),
    appliances: poller("* * * * *", voltalis.getAppliances),
    // immediateConsumptionInkW: poller('*/2 * * * *', voltalis.fetchImmediateConsumptionInkW)
  };
};
