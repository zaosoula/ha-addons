const express = require("express")
const Voltalis = require("./voltalis");

const port = 8000;

console.log('Initializing webservice.')
const webservice = express();

const CONFIG = {
	username: process.env.VOLTALIS_USERNAME,
	password: process.env.VOLTALIS_PASSWORD,
}

if (CONFIG.username === undefined && CONFIG.password === undefined) {
	console.log("You must set a username and a in the addon config")
	process.exit(22)
}

console.log(`Initializing Voltalis API`);
const voltalis = new Voltalis(CONFIG.username, CONFIG.password);
voltalis.login();


webservice.get('/immediateConsumptionInkW', async (req, res) => {
	console.log("GET /immediateConsumptionInkW")
	const data = await voltalis.fetchImmediateConsumptionInkW()
	console.log("GET /immediateConsumptionInkW:", data);
	res.json(data)
})

webservice.listen(port, () => {
	console.log(`Voltalis Bridge is running on port ${port}.`);
})
