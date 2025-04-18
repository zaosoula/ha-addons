    // voltalis.ts (Version TypeScript corrigée - Remplacement InternalAxiosRequestConfig)

    // Importe AxiosRequestConfig au lieu de InternalAxiosRequestConfig
    import axios, { AxiosError, AxiosInstance, AxiosResponse, AxiosRequestConfig } from "axios";
    import fs from "fs";
    import { wrapper } from "axios-cookiejar-support";
    import { CookieJar } from "tough-cookie";
    import path from "path";

    // Nouvelle URL de base de l'API
    const API_BASE_URL = 'https://api.myvoltalis.com/';

    // --- Interfaces (inchangées) ---
    interface VoltalisSiteInfo { /* ... idem ... */
      id: number; address: string; name: string | null; postalCode: string; city: string; country: string; timezone: string; state: string | null; voltalisVersion: string; installationDate: string; dataStart: string; hasGlobalConsumptionMeasure: boolean; hasDsoMeasure: boolean; contractTarifsHaveChanged: boolean; lastContractTarifsUpdateDate: string | null; hasBasicOffer: boolean; default: boolean;
    }
    interface PhoneInfo { /* ... idem ... */
       phoneType: string | null; phoneNumber: string; isDefault: boolean;
    }
    interface VoltalisAccountInfo { /* ... idem ... */
       id: number; firstname: string; lastname: string; email: string; phones: PhoneInfo[]; defaultSite: VoltalisSiteInfo; otherSites: VoltalisSiteInfo[];
    }
    interface RealtimeConsumptionPoint { /* ... idem ... */
       stepTimestampInUtc: string; totalConsumptionInWh: number; totalConsumptionInCurrency: number;
    }
    interface RealtimeConsumptionResponse { /* ... idem ... */
       aggregationStepInSeconds: number; consumptions: RealtimeConsumptionPoint[];
    }
    // --- Fin Interfaces ---


    export class Voltalis {
      private credentials: Record<string, unknown>;
      private cookiePath: string = process.env.NODE_ENV === 'production' ? '/data/cookies.json' : path.join(__dirname, '../../cookies.json');
      public user: VoltalisAccountInfo | null = null;
      private jar: CookieJar = new CookieJar();
      private api: AxiosInstance;
      private observableApi: AxiosInstance;
      private token: string | null = null;

      constructor(username: string, password: string) {
        this.credentials = { login: username, password: password, username: username, id: "", alternative_email: "", email: "", firstname: "", lastname: "", phone: "", country: "", selectedSiteId: "", stayLoggedIn: "true" };
        this.token = null; this.user = null;

        // --- Gestion des cookies (inchangée) ---
        let previousCookieJarJSON: string | undefined;
        const saveCookieJar = (res: AxiosResponse | AxiosError) => { /* ... idem ... */
            let config: AxiosRequestConfig | undefined; // Utilise AxiosRequestConfig ici aussi si besoin
            if (axios.isAxiosError(res)) { config = res.config; } else { config = res.config; }
            if (config && config.jar) { try { const cookieJarJSON = JSON.stringify((config.jar as CookieJar).toJSON()); if (cookieJarJSON !== previousCookieJarJSON) { fs.writeFileSync(this.cookiePath, cookieJarJSON); previousCookieJarJSON = cookieJarJSON; } } catch (e) { console.error("Failed to save cookie jar:", e); } } };
        if (fs.existsSync(this.cookiePath)) { try { const cookieJarJSON = fs.readFileSync(this.cookiePath, { encoding: 'utf-8' }); this.jar = CookieJar.fromJSON(cookieJarJSON); previousCookieJarJSON = cookieJarJSON; } catch (readErr) { console.error('Error reading cookie file:', readErr); this.jar = new CookieJar(); } } else { this.jar = new CookieJar(); }
        // --- Fin Gestion des cookies ---

        // --- Initialisation Axios (inchangée) ---
        this.api = wrapper(axios.create({ baseURL: API_BASE_URL, jar: this.jar }));
        this.observableApi = wrapper(axios.create({ baseURL: API_BASE_URL, jar: this.jar }));
        // --- Fin Initialisation Axios ---

        // --- Intercepteurs Axios ---
        // Utilise AxiosRequestConfig pour le type de config
        const addAuthToken = (config: AxiosRequestConfig): AxiosRequestConfig => {
          if (this.token) { if (!config.headers) { config.headers = axios.defaults.headers.common; } config.headers['Authorization'] = `Bearer ${this.token}`; }
          return config; };
        const addUserSiteId = (config: AxiosRequestConfig): AxiosRequestConfig => {
          if (this.user?.defaultSite?.id) { if (!config.headers) { config.headers = axios.defaults.headers.common; } config.headers['User-Site-Id'] = this.user.defaultSite.id; }
          return config; };

        this.api.interceptors.request.use(addAuthToken as any); // Utilise 'as any' si le type pose toujours problème avec wrapper
        this.observableApi.interceptors.request.use(addAuthToken as any);
        this.api.interceptors.request.use(addUserSiteId as any);
        this.observableApi.interceptors.request.use(addUserSiteId as any);

        // Intercepteurs de réponse (inchangés)
        const responseInterceptor = (response: AxiosResponse): AxiosResponse => { saveCookieJar(response); return response; };
        const errorInterceptor = (error: AxiosError): Promise<AxiosError> => { saveCookieJar(error); /* ... log ... */ return Promise.reject(error); };
        this.api.interceptors.response.use(responseInterceptor, errorInterceptor);
        this.observableApi.interceptors.response.use(responseInterceptor, errorInterceptor);
        // --- Fin Intercepteurs Axios ---
      } // Fin constructor

      // --- Méthodes (isLoggedIn, ensureIsLoggedIn, getMainSite, getModulators inchangées) ---
      isLoggedIn(): boolean { return this.token !== null && this.user !== null; }
      ensureIsLoggedIn(): void { if (!this.isLoggedIn()) { throw new Error('Login and fetching user info required'); } }
      getMainSite(): VoltalisSiteInfo | null { return this.user?.defaultSite ?? null; }
      getModulators(): unknown[] { console.warn("getModulators() called, but modulatorList is not available in the current API response."); return []; }
      // --- Fin Méthodes ---

      // --- login() et fetchUserInfo() (inchangées par rapport à la version précédente) ---
      async login(): Promise<VoltalisAccountInfo | null> { /* ... idem ... */
        this.token = null; this.user = null; const loginPayload = { login: this.credentials.login as string, password: this.credentials.password as string }; console.log("Attempting login to /auth/login..."); try { const res = await this.api.post<{ token: string }>('/auth/login', loginPayload, { headers: { 'Content-Type': 'application/json' } }); if (res.data && res.data.token) { this.token = res.data.token; console.log('Login successful, token received.'); try { await this.fetchUserInfo(); return this.user; } catch (userInfoError) { this.token = null; this.user = null; console.error("Login succeeded but failed to fetch user info."); throw userInfoError; } } else { console.error('Login response received, but token is missing.', res.data); throw new Error('Login failed: Token missing in response.'); } } catch (err) { this.token = null; this.user = null; console.error("Login process failed.", err instanceof Error ? err.message : err); if (err instanceof Error) { throw err; } else { throw new Error('An unknown error occurred during login.'); } }
      }
      async fetchUserInfo(): Promise<VoltalisAccountInfo> { /* ... idem ... */
        if (!this.token) { throw new Error("Cannot fetch user info without a token. Login first."); } console.log("Fetching user info from /api/account/me..."); try { const res = await this.api.get<VoltalisAccountInfo>('/api/account/me'); if (res.data && res.data.defaultSite?.id) { this.user = res.data; console.log(`User info fetched successfully. Site ID: ${this.user.defaultSite.id}`); return this.user; } else { console.error("User info response received, but structure is invalid or defaultSite is missing.", res.data); throw new Error("Failed to fetch user info: Invalid response structure."); } } catch (error) { console.error('Failed to fetch user info.'); this.user = null; throw error; }
      }
      // --- Fin login() et fetchUserInfo() ---


      // --- fetchImmediateConsumptionInkW() (inchangée par rapport à la version précédente, retourne Promise<number>) ---
      async fetchImmediateConsumptionInkW(): Promise<number> { /* ... idem ... */
         this.ensureIsLoggedIn(); const siteId = this.user?.defaultSite?.id; if (!siteId) { throw new Error("Site ID is missing, cannot fetch consumption."); } const endpointPath = `/api/site/${siteId}/consumption/realtime`; const queryParams = { mode: 'TEN_MINUTES', numPoints: 1 }; console.log(`Fetching real-time consumption from: ${endpointPath} with params:`, queryParams); try { const response = await this.api.get<RealtimeConsumptionResponse>(endpointPath, { params: queryParams }); if (response.data?.consumptions?.length > 0) { const latestPoint = response.data.consumptions[response.data.consumptions.length - 1]; if (latestPoint?.totalConsumptionInWh !== undefined && latestPoint?.totalConsumptionInWh !== null) { const energyWh = latestPoint.totalConsumptionInWh; const averagePowerW = energyWh * 6; console.log(`Latest consumption point: ${energyWh} Wh. Calculated average power: ${averagePowerW} W`); return averagePowerW; } else { console.error("Latest consumption point is invalid or missing 'totalConsumptionInWh'.", latestPoint); throw new Error("Invalid data received from real-time consumption endpoint."); } } else { console.error("Invalid or empty 'consumptions' array in response.", response.data); throw new Error("No consumption data received from real-time endpoint."); } } catch (error) { console.error(`Failed to fetch from ${endpointPath}.`); throw error; }
      } // Fin fetchImmediateConsumptionInkW

    } // Fin Class Voltalis
    
