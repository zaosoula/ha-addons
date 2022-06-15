
class Sensor {
  constructor(name, attributes, api) {
    this.name = name;
    this.api = api;
    this.attributes = attributes;
    this.lastState = undefined;

    console.log(`[hass] sensor.${this.name} registered`, { attributes });
  }

  update(payload) {
    console.log(`[hass] updating sensor.${this.name}`, { payload });

    const state = {
      ...payload,
      attributes: {
        ...(this.attributes ?? {}),
        ...(payload.attributes ?? {})
      }
    }

    return this.api.post('states/sensor.' + this.name, state)
      .then((data) => {
        this.lastState = state;
        return data;
      })
      .catch((error) => {
        console.log('Sensor update error', error);
        return error;
      });
  }
}

module.exports = Sensor;
