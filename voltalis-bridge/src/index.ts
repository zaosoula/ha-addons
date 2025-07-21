import "dotenv/config";
import { Voltalis } from "./lib/voltalis";
import { HomeAssistant } from "./lib/homeassistant";
import { CONFIG } from "./config";
import { registerSensors } from "./sensors";
import { registerPollers } from "./pollers";
import debug from "debug";

const log = debug("voltalis-bridge:index");
const voltalis = new Voltalis(CONFIG.username, CONFIG.password);
const hass = new HomeAssistant(process.env.SUPERVISOR_TOKEN!);

(async () => {
  await voltalis.login();
  log("Connected to Voltalis API.");

  const sensors =
    registerSensors(hass);

  sensors.voltalis_address.update({
    state: voltalis.user?.defaultSite.address,
  })

  const pollers = registerPollers(voltalis);

  pollers.appliances.subscribe({
    next: async ({ data }) => {
      log("[appliances]", data);
    },
  });

  pollers.consumptionInWh.subscribe({
    next: async ({ data }) => {
      log("[consumptionInWh]", data);

      if (data.consumptions.at(0)) {
        await sensors.voltalis_consumption_wh.update({
          state:
            data.consumptions.at(0)!.totalConsumptionInWh,
        });

        await sensors.voltalis_consumption_currency.update({
          state:
            data.consumptions.at(0)!.totalConsumptionInCurrency,
        });
      }
    },
    error: (e) => {
      log("[consumptionInWh]", e.message)
    },
  });
})();
