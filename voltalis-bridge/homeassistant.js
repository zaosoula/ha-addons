const axios = require('axios');
const fs = require('fs');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar, Cookie } = require('tough-cookie');
const path = require('path');


class HomeAssistant {
  constructor(token) {
    this.options = {headers: {'Authorization': 'Bearer ' + token}}
    this.initAxios();
  }

  updateSensor(sensorName, payload) {
    return axios.post('http://supervisor/core/api/states/sensor.' + sensorName, payload, this.options)
  }

  initAxios() {
    this.api = wrapper(axios.create({
      withCredentials: true,
      baseURL: 'https://classic.myvoltalis.com/',
    }));
  }
}

module.exports = HomeAssistant;
