import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import { axios as axiosObservable } from "./poller";
import fs from "fs";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import path from "path";

export interface VoltalisSite {
  id: string;
  isMain: boolean;
  modulatorList: unknown[];
}

export interface VoltalisConsumption {
  consumption: number;
  duration: number
}

export class Voltalis {
  private credentials: Record<string, unknown>;
  private cookiePath: string = process.env.NODE_ENV === 'production' ? '/data/cookies.json' : path.join(__dirname, '../../cookies.json');
  public user: {
    [key: string]: unknown;
    subscriber: {
      siteList: VoltalisSite[]
    }
  } | null = null;
  private jar: CookieJar = new CookieJar();
  private api: AxiosInstance;
  private observableApi: axiosObservable;

  constructor(username: string, password: string) {
    this.credentials = {
      id: "",
      alternative_email: "",
      email: "",
      firstname: "",
      lastname: "",
      login: "",
      password,
      phone: "",
      country: "",
      selectedSiteId: "",
      username,
      stayLoggedIn: "true",
    }

    let previousCookieJarJSON: string;
    const saveCookieJar = (res: AxiosResponse) => {
      const cookieJarJSON = JSON.stringify(res.config.jar);
      if(cookieJarJSON != previousCookieJarJSON) {
        fs.writeFileSync(this.cookiePath, cookieJarJSON);
        previousCookieJarJSON = cookieJarJSON;
      }
    }

    if (fs.existsSync(this.cookiePath)) {
      const cookieJarJSON = fs.readFileSync(this.cookiePath, { encoding: 'utf-8' });
      	const cookies = JSON.parse(cookieJarJSON);
        this.jar = CookieJar.fromJSON(cookies);
        previousCookieJarJSON = cookieJarJSON;
    }

    this.observableApi = wrapper(axiosObservable.create({
      withCredentials: true,
      baseURL: 'https://classic.myvoltalis.com/',
      jar: this.jar
    }) as unknown as AxiosInstance) as unknown as axiosObservable;

    this.api = wrapper(axios.create({
      withCredentials: true,
      baseURL: 'https://classic.myvoltalis.com/',
      jar: this.jar
    }));

    this.observableApi.interceptors.request.use((config) => {
      if(this.isLoggedIn()){
        if(config.headers === undefined){
          config.headers = {};
        }
        config.headers['User-Site-Id'] = this.getMainSite().id;
      }
      return config;
    });

    this.observableApi.interceptors.response.use(function (response) {
      return response;
    }, function (error) {
      if (error.response) {
        console.error('Error code', error.response);
      }
      return error;
    });

   this.api.interceptors.response.use(function (response) {
      saveCookieJar(response);
      return response;
    }, function (error) {
      saveCookieJar(error);
      return Promise.reject(error);
    });

    this.fetchImmediateConsumptionInkW = this.fetchImmediateConsumptionInkW.bind(this);
  }


  isLoggedIn() {
    return this.user !== null;
  }

  ensureIsLoggedIn() {
    if(!this.isLoggedIn()) {
      throw new Error('Use .login() first');
    }
  }

  getMainSite(): VoltalisSite {
    this.ensureIsLoggedIn();
    return this.user!.subscriber.siteList.find(site => site.isMain) as VoltalisSite;
  }

  getModulators() {
    this.ensureIsLoggedIn();
    return this.getMainSite().modulatorList;
  }

  async login() {
    let res;
    try {
      res = await this.api.post('/login', this.credentials);
    } catch (err: unknown) {
      if(err instanceof AxiosError) {
        this.user = null;

        if(err.response) {
          if(err.response.status === 401){
            throw new Error('Bad Credentials');
          }
        }


        console.error(err?.response);
        throw new Error('Unable to login');
      }

      throw err;
    }

    this.user = res.data;
    return this.user;
  }

  fetchImmediateConsumptionInkW() {
    return this.observableApi.get<{
      immediateConsumptionInkW: VoltalisConsumption
    }>('/siteData/immediateConsumptionInkW.json');
  }
}
