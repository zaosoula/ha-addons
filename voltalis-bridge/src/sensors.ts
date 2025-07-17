import { HomeAssistant } from "./lib/homeassistant";

export const registerSensors = (hass: HomeAssistant) => {
  hass.registerSensor("voltalis_immediate_consumption", {
    friendly_name: "Voltalis Immediate Consumption (W)",
    icon: "mdi:home-lightning-bolt-outline",
    unit_of_measurement: "W",
    device_class: "power",
    state_class: "measurement",
  });

  hass.registerSensor("voltalis_consumption", {
    friendly_name: "Voltalis Consumption (Wh)",
    icon: "mdi:home-lightning-bolt-outline",
    unit_of_measurement: "Wh",
    device_class: "energy",
    state_class: "total_increasing",
  });

  hass.registerSensor("voltalis_address", {
    friendly_name: "Voltalis Address",
    unique_id: "voltalis_address",
    icon: "mdi:map-marker-outline",
  });

  return hass.sensors;
};
