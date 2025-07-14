import debug from "debug";
const log = debug("voltalis-bridge:config");

if (
  process.env.VOLTALIS_USERNAME === undefined ||
  process.env.VOLTALIS_PASSWORD === undefined
) {
  console.log("You must set a username and a password in the addon config");
  process.exit(22);
}

export const CONFIG = {
  username: process.env.VOLTALIS_USERNAME,
  password: process.env.VOLTALIS_PASSWORD,
};

export const isProd = process.env.NODE_ENV === "production";
export const isDev = !isProd;

log(isProd ? "Running in production mode" : "Running in development mode");
