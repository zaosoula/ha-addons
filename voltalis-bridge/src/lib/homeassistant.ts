import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { Sensor } from "./sensor";

export class HomeAssistant {
  private options: AxiosRequestConfig;
  private api: AxiosInstance;
  public sensors: Record<string, Sensor>;
  constructor(token: string, uri: string) {
    this.options = { headers: { Authorization: "Bearer " + token } };
    this.api = axios.create({
      baseURL: uri,
      headers: { Authorization: "Bearer " + token },
    });
    this.sensors = {};
  }

  registerSensor(sensorName: string, attributes: Record<string, unknown> = {}) {
    this.sensors[sensorName] = new Sensor(sensorName, attributes, this.api);
  }
}
