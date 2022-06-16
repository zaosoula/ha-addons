import { AxiosInstance } from "axios";

export class Sensor {
  public name: string;
  private api: AxiosInstance;
  public attributes: Record<string, unknown>;
  public state: Record<string, unknown> | undefined;
  constructor(name: string, attributes: Record<string, unknown>, api: AxiosInstance) {
    this.name = name;
    this.api = api;
    this.attributes = attributes;
    this.state = undefined;

    console.log(`[hass] sensor.${this.name} registered`, { attributes });
  }

  getState() {
    console.log(`[hass] getting state of sensor.${this.name}`);

    return this.api.get('states/sensor.' + this.name)
      .then(({ data }) => {
        this.state = data;
        console.log(`[hass] sensor.${this.name}`, data);
        return data;
      })
      .catch((error) => {
        console.log('Sensor getState error', error);
        return error;
      });
  }

  update(payload: {
    state: unknown,
    attributes?: Record<string, unknown>
  }) {
    console.log(`[hass] updating sensor.${this.name}`, { payload });

    const _state = {
      ...payload,
      attributes: {
        ...(this.attributes ?? {}),
        ...(payload.attributes ?? {})
      }
    }

    return this.api.post('states/sensor.' + this.name, _state)
      .then(({ data }) => {
        this.state = data;
        return data;
      })
      .catch((error) => {
        console.log('Sensor update error', error);
        return error;
      });
  }
}
