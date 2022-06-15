const axios = require('axios');
const fs = require('fs');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar, Cookie } = require('tough-cookie');
const path = require('path');


class Sensor {
  constructor(name, attributes, api) {
    this.name = name;
    this.api = api;
    this.attributes = attributes;
    this.lastState = undefined;
  }

  update(payload) {
    const state = {
      ...payload,
      attributes: {
        ...(payload.attributes ?? {}),
        ...(this.sensors[sensorName] ?? {})
      }
    } 

    return this.api.post('states/sensor.' + this.name, state).then(() => {
      this.lastState = state;
    });
  }
}

class HomeAssistant {
  constructor(token) {
    this.options = {headers: {'Authorization': 'Bearer ' + token}}
    this.api = wrapper(axios.create({
      baseURL: 'http://supervisor/core/api',
      headers: {'Authorization': 'Bearer ' + token}
    }));
    this.sensors = {};
  }

  registerSensor(sensorName, attributes) {
    this.sensors[sensorName] = new Sensor(sensorName, attributes, this.api);
  }

  initAxios() {
    this.api = wrapper(axios.create({
      withCredentials: true,
      baseURL: 'https://classic.myvoltalis.com/',
    }));
  }
}

module.exports = HomeAssistant;
