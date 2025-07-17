import axios, { AxiosError, AxiosInstance, AxiosRequestHeaders } from "axios";
import { axios as axiosObservable } from "./poller";

export interface VoltalisSite {
  "id": number,
  "address": string,
  "name": string | null,
  "postalCode": string,
  "city": string,
  "country": string,
  "timezone": string,
  "state": unknown,
  "voltalisVersion": string,
  "installationDate": string,
  "dataStart": string,
  "hasGlobalConsumptionMeasure": boolean,
  "hasDsoMeasure": boolean,
  "contractTarifsHaveChanged": boolean,
  "lastContractTarifsUpdateDate": unknown,
  "hasBasicOffer": boolean,
  "default": boolean
}

export interface VoltalisUser {

  id: number
  firstname: string
  lastname: string
  email: string
  phones: Array<{
    phoneType: any
    phoneNumber: string
    isDefault: boolean
  }>
  defaultSite: {
    id: number
    address: string
    name: any
    postalCode: string
    city: string
    country: string
    timezone: string
    state: any
    voltalisVersion: string
    installationDate: string
    dataStart: string
    hasGlobalConsumptionMeasure: boolean
    hasDsoMeasure: boolean
    contractTarifsHaveChanged: boolean
    lastContractTarifsUpdateDate: any
    hasBasicOffer: boolean
    default: boolean
  }
  otherSites: Array<any>
  displayGroup: {
    name: string
    rights: Array<{
      name: string
      enabled: boolean
      type: string
    }>
    resources: {
      favicon: string
      logo: string
      fontcolor: string
      headercolor: string
      secondarycolor: string
      primarycolor: string
      font: string
    }
  }
  firstConnection: boolean
  migratedUser: boolean
  operation: {
    operation: string
    operationType: string
    acquisitionPartner: string
    acquisitionChannel: string
  }
}

export interface VoltalisConsumptionRealtime {
  aggregationStepInSeconds: number
  consumptions: Array<{
    stepTimestampInUtc: string
    totalConsumptionInWh: number
    totalConsumptionInCurrency: number
  }>
}

export class Voltalis {
  private readonly credentials: Record<string, unknown>;

  private token: string | null = null;
  public user: VoltalisUser | null = null;
  private readonly api: AxiosInstance;
  private readonly observableApi: axiosObservable;

  constructor(username: string, password: string) {
    this.credentials = {
      login: username,
      password,
    };

    this.observableApi =
      axiosObservable.create({
        withCredentials: true,
        baseURL: "https://api.myvoltalis.com/",
      });

    this.api = axios.create({
      baseURL: "https://api.myvoltalis.com/",
    });

    this.api.interceptors.request.use((config) => {
      if (this.token) {
        if (config.headers === undefined) {
          config.headers = {} as AxiosRequestHeaders;
        }

        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    this.observableApi.interceptors.request.use((config) => {
      if (this.token) {
        if (config.headers === undefined) {
          config.headers = {} as AxiosRequestHeaders;
        }

        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    this.getRealtimeConsumption =
      this.getRealtimeConsumption.bind(this);

    this.getAppliances = this.getAppliances.bind(this);
  }

  async login() {
    let res;
    try {
      res = await this.api.post("/auth/login", this.credentials);
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        this.user = null;

        if (err.response) {
          if (err.response.status === 401) {
            throw new Error("Bad Credentials");
          }
        }

        console.error(err?.response);
        throw new Error("Unable to login");
      }

      throw err;
    }

    this.token = res.data.token;
    return this.getCurrentUser();
  }

  async getCurrentUser() {
    if (!this.token) throw new Error("Use .login() first");
    const res = await this.api.get("/api/account/me");
    this.user = res.data;
    return this.user;
  }

  isLoggedIn() {
    console.log(this.token, this.user);
    return this.token !== null && this.user !== null;
  }

  ensureIsLoggedIn() {
    if (!this.isLoggedIn()) {
      throw new Error("Use .login() first");
    }
  }

  get defaultSite(): VoltalisSite {
    this.ensureIsLoggedIn();
    return this.user!.defaultSite;
  }


  getAppliances() {
    this.ensureIsLoggedIn();
    return this.observableApi.get(
      `/api/site/${this.defaultSite.id}/managed-appliance`
    );
  }

  getRealtimeConsumption() {
    this.ensureIsLoggedIn();
    return this.observableApi.get<VoltalisConsumptionRealtime>(
      `/api/site/${this.defaultSite.id}/consumption/realtime`,
      {
        params: {
          mode: "TEN_MINUTES",
          numPoints: 10,
        }
      }
    );
  }
}
