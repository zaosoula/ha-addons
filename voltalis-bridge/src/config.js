const CONFIG = {
	username: process.env.VOLTALIS_USERNAME,
	password: process.env.VOLTALIS_PASSWORD,
}

if (CONFIG.username === undefined && CONFIG.password === undefined) {
	console.log("You must set a username and a password in the addon config");
	process.exit(22);
}

module.exports = CONFIG;
