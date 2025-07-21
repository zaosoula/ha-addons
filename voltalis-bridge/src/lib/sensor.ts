import { AxiosInstance } from "axios";
import { isProd } from "../config";
import debug from "debug";
const log = debug("voltalis-bridge:sensor");

export class Sensor {
  public name: string;
  private api: AxiosInstance;
  public attributes: Record<string, any>;
  public state: Record<string, unknown> | undefined;
  constructor(
    name: string,
    attributes: Record<string, unknown>,
    api: AxiosInstance
  ) {
    this.name = name;
    this.api = api;
    this.attributes = attributes;
    this.state = undefined;

    if (isProd) {
      log(`[hass] sensor.${this.name} registered`, { attributes });
    } else {
      log(`[hass] virtual sensor.${this.name} registered`, {
        attributes,
      });
    }
  }

  getState() {
    log(`[hass] getting state of sensor.${this.name}`);

    if (!isProd) {
      return this.state;
    }

    return this.api
      .get("states/sensor." + this.name)
      .then(({ data }) => {
        this.state = data;
        log(`[hass] sensor.${this.name}`, data);
        return data;
      })
      .catch((error) => {
        log("Sensor getState error", error);
        return error;
      });
  }

  update(payload: { state: unknown; attributes?: Record<string, unknown>, [key: string]: any }) {
    log(`[hass] updating sensor.${this.name}`, { payload });

    const _state = {
      ...payload,
      attributes: {
        unique_id: this.name,
        ...(this.attributes ?? {}),
        ...(payload.attributes ?? {}),
      },
    };

    if (!isProd) {
      this.state = _state;
      return this.state;
    }

    return this.api
      .post("states/sensor." + this.name, _state)
      .then(({ data }) => {
        this.state = data;
        return data;
      })
      .catch((error) => {
        log("Sensor update error", error);
        return error;
      });
  }
}
