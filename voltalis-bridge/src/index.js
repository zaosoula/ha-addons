const cron = require('node-cron');
const Voltalis = require("./lib/voltalis");
const HomeAssistant = require("./lib/homeassistant");
const CONFIG = require('./config');
const registerSensor = require('./sensors');

const hass = new HomeAssistant(process.env.SUPERVISOR_TOKEN);

registerSensor(hass);

console.log(`Initializing Voltalis API.`);
const voltalis = new Voltalis(CONFIG.username, CONFIG.password);

const updateImmediateConsumptionInkW = async () => {
	if(!voltalis.isLoggedIn()) {
		console.log('[ImmediateConsumptionInkW] Voltalis API not logged in.')
		return;
	}

	console.log('[ImmediateConsumptionInkW] Updating states.')

	const data = await voltalis.fetchImmediateConsumptionInkW();

	console.log('[ImmediateConsumptionInkW]', hass.sensors.voltalis_immediate_consumption.update);

	await hass.sensors.voltalis_immediate_consumption.update({
		state: data.immediateConsumptionInkW.consumption,
	})

	await hass.sensors.voltalis_consumption.update({
		state: data.immediateConsumptionInkW.consumption * (data.immediateConsumptionInkW.duration / 3600),
	})
}

cron.schedule('*/10 * * * *', updateImmediateConsumptionInkW);

voltalis.login().then(() => {
	console.log('Connected to Voltalis API.');
	updateImmediateConsumptionInkW();
});
