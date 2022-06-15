const Voltalis = require("./voltalis");
const HomeAssistant = require('homeassistant');
const cron = require('node-cron');

const CONFIG = {
	username: process.env.VOLTALIS_USERNAME,
	password: process.env.VOLTALIS_PASSWORD,
}

if (CONFIG.username === undefined && CONFIG.password === undefined) {
	console.log("You must set a username and a in the addon config")
	process.exit(22)
}

const hass = new HomeAssistant({
  host: 'http://supervisor/core/api',
  token: process.env.SUPERVISOR_TOKEN,
  ignoreCert: false
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

	hass.states.update('sensor', 'voltalis_immediate_consumption', {
		state: data.immediateConsumptionInkW.consumption,
		attributes: {
			friendly_name: 'Voltalis Immediate Consumption',
			icon: 'mdi:home-lightning-bolt-outline',
			unit_of_measurement: 'kW',
			device_class: 'power'
		}
	});
});
