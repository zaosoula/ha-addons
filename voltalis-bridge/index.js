const Voltalis = require("./voltalis");
const cron = require('node-cron');
const HomeAssistant = require("./homeassistant");

const CONFIG = {
	username: process.env.VOLTALIS_USERNAME,
	password: process.env.VOLTALIS_PASSWORD,
}

if (CONFIG.username === undefined && CONFIG.password === undefined) {
	console.log("You must set a username and a in the addon config")
	process.exit(22)
}

const hass = new HomeAssistant(process.env.SUPERVISOR_TOKEN);

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

console.log(`Initializing Voltalis API.`);
const voltalis = new Voltalis(CONFIG.username, CONFIG.password);
voltalis.login().then(() => {
	console.log('Connected to Voltalis API.');
});


cron.schedule('* * * * *', async () => {
	if(!voltalis.isLoggedIn()) {
		console.log('[ImmediateConsumptionInkW] Voltalis API not logged in.')
		return;
	}

	console.log('[ImmediateConsumptionInkW] Updating states.')

	const data = await voltalis.fetchImmediateConsumptionInkW();

	hass.sensors.voltalis_immediate_consumption.update({
		state: data.immediateConsumptionInkW.consumption,
	}).catch((error) => {
		console.log('Sensor update error', error);
	})

	hass.sensors.voltalis_consumption({
		state: data.immediateConsumptionInkW.consumption * (data.immediateConsumptionInkW.duration / 3600),
	}).catch((error) => {
		console.log('Sensor update error', error);
	})
});
