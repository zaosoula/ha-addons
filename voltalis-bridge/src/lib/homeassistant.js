const axios = require('axios');
const Sensor = require('./sensor');

class HomeAssistant {
  constructor(token) {
    this.options = {headers: {'Authorization': 'Bearer ' + token}}
    this.api = axios.create({
      baseURL: 'http://supervisor/core/api',
      headers: {'Authorization': 'Bearer ' + token}
    });
    this.sensors = {};
  }

  registerSensor(sensorName, attributes) {
    this.sensors[sensorName] = new Sensor(sensorName, attributes, this.api);
  }
}

module.exports = HomeAssistant;
