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

  const { voltalis_immediate_consumption, voltalis_consumption } =
    registerSensors(hass);
  const pollers = registerPollers(voltalis);

  pollers.appliances.subscribe({
    next: async ({ data }) => {
      log("[appliances]", data);
    },
  });

  pollers.immediateConsumptionInkW.subscribe({
    next: async ({ data }) => {
      log("[immediateConsumptionInkW]", data);

      await voltalis_immediate_consumption.update({
        state: data.immediateConsumptionInkW.consumption * 1000,
      });

      await voltalis_consumption.update({
        state:
          data.immediateConsumptionInkW.consumption *
          (data.immediateConsumptionInkW.duration / 3600) *
          1000,
      });
    },
    error: (e) => {
      console.error(e.message, e.stack);
    },
  });
})();
