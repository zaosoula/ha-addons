const cron = require('node-cron');
const Voltalis = require("./lib/voltalis");
const HomeAssistant = require("./lib/homeassistant");
const CONFIG = require('./config');
const registerSensor = require('./sensors');

const hass = new HomeAssistant(process.env.SUPERVISOR_TOKEN);

registerSensor(hass);

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
	})

	hass.sensors.voltalis_consumption.update({
		state: data.immediateConsumptionInkW.consumption * (data.immediateConsumptionInkW.duration / 3600),
	})
});
