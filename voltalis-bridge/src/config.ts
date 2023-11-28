if (
  process.env.VOLTALIS_USERNAME === undefined ||
  process.env.VOLTALIS_PASSWORD === undefined
) {
  console.log("You must set a username and a password in config");
  process.exit(22);
}

if (process.env.HA_TOKEN === undefined || process.env.HA_URI === undefined) {
  console.log("You must set a home assistant token and api uri config");
  process.exit(22);
}

export const CONFIG = {
  username: process.env.VOLTALIS_USERNAME,
  password: process.env.VOLTALIS_PASSWORD,
  token: process.env.HA_TOKEN,
  uri: process.env.HA_URI,
};
