import { Voltalis } from "./lib/voltalis";
import { poller } from "./lib/poller";

export const registerPollers = (voltalis: Voltalis) => {
  return {
    realTimeConsumption: poller(
      "*/5 * * * * *",
      voltalis.fetchRealtimeConsumptionInWh,
    ),
    dailyConsumption: poller(
      "*/5 * * * *",
      voltalis.fetchDailyApplianceConsumptionInWh,
    ),
    appliances: poller("* * * * *", voltalis.getAppliances),
  };
};
