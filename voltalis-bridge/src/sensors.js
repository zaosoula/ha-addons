module.exports = (hass) => {
  hass.registerSensor('voltalis_immediate_consumption', {
    friendly_name: 'Voltalis Immediate Consumptio (kW)',
    icon: 'mdi:home-lightning-bolt-outline',
    unit_of_measurement: 'W',
    unit_prefix: 'k',
    device_class: 'power',
    state_class: 'measurement'
  });
  
  hass.registerSensor('voltalis_consumption', {
    friendly_name: 'Voltalis Consumption (kWh)',
    icon: 'mdi:home-lightning-bolt-outline',
    unit_of_measurement: 'Wh',
    unit_prefix: 'k',
    device_class: 'energy',
    state_class: 'measurement'
  });
}
