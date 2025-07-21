import { HomeAssistant } from "./lib/homeassistant";
import { Voltalis } from "./lib/voltalis";

export const registerSensors = (hass: HomeAssistant) => {
  hass.registerSensor("voltalis_consumption_wh", {
    friendly_name: "Voltalis Consumption (Wh)",
    icon: "mdi:home-lightning-bolt-outline",
    unit_of_measurement: "Wh",
    device_class: "energy",
    state_class: "total_increasing",
  });

  hass.registerSensor("voltalis_consumption_unmanaged_wh", {
    friendly_name: "Voltalis Unmanaged Consumption (Wh)",
    icon: "mdi:home-lightning-bolt-outline",
    unit_of_measurement: "Wh",
    device_class: "energy",
    state_class: "total_increasing",
  });

  hass.registerSensor("voltalis_consumption_currency", {
    friendly_name: `Voltalis Consumption (€)`,
    icon: "mdi:home-lightning-bolt-outline",
    unit_of_measurement: "EUR",
    device_class: "monetary",
    state_class: "total_increasing",
  });



  hass.registerSensor("voltalis_address", {
    friendly_name: "Voltalis Address",
    unique_id: "voltalis_address",
    icon: "mdi:map-marker-outline",
  });

  return hass.sensors;
};
