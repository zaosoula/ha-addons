import "dotenv/config";
import { Voltalis } from "./lib/voltalis";
import { HomeAssistant } from "./lib/homeassistant";
import { CONFIG } from "./config";
import { registerSensors } from "./sensors";
import { registerPollers } from "./pollers";
import debug from "debug";
import { Sensor } from "./lib/sensor";

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

  const sensorByApplianceName = new Map<string, Sensor>()
  pollers.appliances.subscribe({
    next: async ({ data }) => {
      for (const appliance of data) {
        if (appliance.applianceType !== 'HEATER') {
          continue
        }

        const sensorId = `voltalis_${appliance.id}_wh`
        let sensor = sensors[sensorId];

        if (!sensor) {
          // sensor = hass.registerSensor(sensorId, {
          //   icon: "mdi:radiator",
          //   friendly_name: `Voltalis ${appliance.name}`,
          //   device_class: "climate",
          //   hvac_modes: ['off', 'heat'],
          //   temperature_unit: 'temp_celsius',
          //   preset_modes: appliance.availableModes,
          //   supported_features: [
          //     'TARGET_TEMPERATURE',
          //     'PRESET_MODE',
          //     'TURN_ON',
          //     'TURN_OFF',
          //   ]
          // })

          sensor = hass.registerSensor(sensorId, {
            friendly_name: `Voltalis ${appliance.name} Consumption (Wh)`,
            appliance_name: appliance.name,
            icon: "mdi:home-lightning-bolt-outline",
            unit_of_measurement: "Wh",
            device_class: "energy",
            state_class: "total_increasing",
          })

          sensorByApplianceName.set(appliance.name, sensor)
        }

        // await sensor.update({
        //   state: appliance.programming.isOn ? 'heat' : 'off',
        //   attributes: {
        //     target_temperature: appliance.programming.temperatureTarget,
        //     preset_mode: appliance.programming.mode,
        //     hvac_mode: appliance.programming.isOn ? 'heat' : 'off',
        //     hvac_action: appliance.programming.isOn ? 'heating' : 'off',
        //   }
        // })
      }

    },
    error: (e) => {
      log("[appliances]", e.message)
    },
  });

  pollers.dailyConsumption.subscribe({
    next: async ({ data }) => {
      const heaterBreakdown = data.breakdown.categories.find(x => x.name === 'conso.category.heater')?.subcategories ?? []

      for (const heater of heaterBreakdown) {
        const sensor = sensorByApplianceName.get(heater.name)
        if (!sensor) {
          continue
        }

        await sensor.update({
          state: heater.totalConsumptionInWh
        });
      }

      const unmanagedBreakdown = data.breakdown.categories.find(x => x.name === 'conso.category.other')?.subcategories[0]

      if (unmanagedBreakdown) {
        await sensors.voltalis_consumption_unmanaged_wh.update({
          state: unmanagedBreakdown.totalConsumptionInWh
        })
      }

    },
    error: (e) => {
      log("[dailyConsumption]", e.message)
    },
  });

  pollers.realTimeConsumption.subscribe({
    next: async ({ data }) => {
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
