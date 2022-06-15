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

	hass.updateSensor('voltalis_immediate_consumption', {
		state: data.immediateConsumptionInkW.consumption,
		attributes: {
			friendly_name: 'Voltalis Immediate Consumption',
			icon: 'mdi:home-lightning-bolt-outline',
			unit_of_measurement: 'kW',
			device_class: 'power'
		}
	}).then((data) => {
		console.log('Sensor updated', data);
	}).catch((error) => {
		console.log('Sensor update error', error);
	})
});
