import { Voltalis } from "./lib/voltalis";
import { HomeAssistant } from "./lib/homeassistant";
import { CONFIG } from "./config";
import { registerSensors } from "./sensors";
import express from "express";
import bodyParser from "body-parser";
import cron from "node-cron";

const app = express();
const voltalis = new Voltalis(CONFIG.username, CONFIG.password);
const hass = new HomeAssistant(process.env.SUPERVISOR_TOKEN!);

app.use(bodyParser.json());

(async () => {
  // voltalis.putmanualSetting('/setting/47106', '{ "mode": "ECO" }');
  await voltalis.login();
  console.log("Connected to Voltalis API.");
  await voltalis.fetchMe();
  await voltalis.fetchmanualSettings();
  const sensors = registerSensors(hass);
  const settings = voltalis.getManualSettings();
  voltalis.fetchImmediateConsumptionInW();

  cron.schedule("*/10 * * * * *", () => {
    voltalis.fetchImmediateConsumptionInW();
    // console.log(voltalis.voltalisConsumption?.consumptions.at(0)?.totalConsumptionInWh);
    // sensors.voltalis_immediate_consumption.update({
    //   state:
    //     voltalis.voltalisConsumption?.consumptions.at(0)?.totalConsumptionInWh,
    // });
  });

  // settings?.forEach ((setting => {
  // 	app.get('/appliances/' + setting.id, (req, res) => {
  // 		res.send(setting.applianceName);
  // 	  });
  // }))
  settings?.forEach((setting) => {
    app.post("/setting/" + setting.id, (req, res) => {
      console.log(
        "putmanualSetting",
        setting.id,
        setting.idAppliance,
        JSON.stringify(req.body),
        req.url.split("/").at(2),
      );
      voltalis.putmanualSetting(req.url, JSON.stringify(req.body));
      res.status(200).send("OK");
    });
    app.get("/setting/" + setting.id, (req, res) => {
      const mode = voltalis.getManualSetting(setting.id);
      res.send({ mode: mode!.mode });
    });
  });
  // start the server
  app.listen(8085, "0.0.0.0", () => {
    console.log(`server running : http://localhost:8085`);
  });
})();
