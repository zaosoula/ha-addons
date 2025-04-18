    // voltalis.ts (Version TypeScript - MAJ Endpoint /autodiag)

    import axios, { AxiosError, AxiosInstance, AxiosResponse, AxiosRequestConfig } from "axios";
    import fs from "fs";
    import { wrapper } from "axios-cookiejar-support";
    import { CookieJar } from "tough-cookie";
    import path from "path";

    const API_BASE_URL = 'https://api.myvoltalis.com/';

    // --- Interfaces ---
    interface VoltalisSiteInfo { /* ... */ id: number; address: string; name: string | null; postalCode: string; city: string; country: string; timezone: string; state: string | null; voltalisVersion: string; installationDate: string; dataStart: string; hasGlobalConsumptionMeasure: boolean; hasDsoMeasure: boolean; contractTarifsHaveChanged: boolean; lastContractTarifsUpdateDate: string | null; hasBasicOffer: boolean; default: boolean; }
    interface PhoneInfo { /* ... */ phoneType: string | null; phoneNumber: string; isDefault: boolean; }
    interface VoltalisAccountInfo { /* ... */ id: number; firstname: string; lastname: string; email: string; phones: PhoneInfo[]; defaultSite: VoltalisSiteInfo; otherSites: VoltalisSiteInfo[]; }

    // Interface MISE A JOUR pour correspondre à /autodiag
    export interface ApplianceInfo {
      name: string;
      csModulatorId: number;
      csApplianceId: number; // Utilise cet ID numérique
      status: string;
      diagTestEnabled: boolean;
      // 'type' n'est pas présent dans /autodiag
    }

    // !! INTERFACE TOUJOURS HYPOTHETIQUE !! Structure de la conso temps réel d'un appareil
    // Adaptée pour utiliser csApplianceId par cohérence (à vérifier !)
    export interface ApplianceRealtimePower {
        csApplianceId: number; // ID de l'appareil correspondant (supposé numérique)
        powerW?: number; // Puissance instantanée/récente en Watts (nom de champ à vérifier !)
        // Ajouter d'autres états si disponibles (ex: online, heating_status)
    }
    // --- Fin Interfaces ---


    export class Voltalis {
      private credentials: Record<string, unknown>;
      private cookiePath: string = process.env.NODE_ENV === 'production' ? '/data/cookies.json' : path.join(__dirname, '../../cookies.json');
      public user: VoltalisAccountInfo | null = null;
      private jar: CookieJar = new CookieJar();
      private api: AxiosInstance;
      private token: string | null = null;
      public appliances: ApplianceInfo[] = [];

      constructor(username: string, password: string) {
        this.credentials = { login: username, password: password, username: username, /* ... */ };
        this.token = null; this.user = null; this.appliances = [];
        // --- Gestion Cookies ---
        /* ... idem ... */
        let previousCookieJarJSON: string | undefined; const saveCookieJar = (res: AxiosResponse | AxiosError) => { /* ... */ }; if (fs.existsSync(this.cookiePath)) { /* ... */ } else { this.jar = new CookieJar(); }
        // --- Initialisation Axios ---
        this.api = wrapper(axios.create({ baseURL: API_BASE_URL, jar: this.jar }));
        // --- Intercepteurs Axios ---
        const addAuthToken = (config: AxiosRequestConfig): AxiosRequestConfig => { /* ... */ if (this.token) { if (!config.headers) { config.headers = axios.defaults.headers.common; } config.headers['Authorization'] = `Bearer ${this.token}`; } return config; };
        const addUserSiteId = (config: AxiosRequestConfig): AxiosRequestConfig => { /* ... */ if (this.user?.defaultSite?.id) { if (!config.headers) { config.headers = axios.defaults.headers.common; } config.headers['User-Site-Id'] = this.user.defaultSite.id; } return config; };
        this.api.interceptors.request.use(addAuthToken as any);
        this.api.interceptors.request.use(addUserSiteId as any);
        const responseInterceptor = (response: AxiosResponse): AxiosResponse => { saveCookieJar(response); return response; };
        const errorInterceptor = (error: AxiosError): Promise<AxiosError> => { saveCookieJar(error); /* ... log ... */ return Promise.reject(error); };
        this.api.interceptors.response.use(responseInterceptor, errorInterceptor);
      } // Fin constructor

      // --- Méthodes (isLoggedIn, ensureIsLoggedIn, getMainSite, getModulators inchangées) ---
      /* ... idem ... */
      isLoggedIn(): boolean { return this.token !== null && this.user !== null; }
      ensureIsLoggedIn(): void { if (!this.isLoggedIn()) { throw new Error('Login and fetching user info required'); } }
      getMainSite(): VoltalisSiteInfo | null { return this.user?.defaultSite ?? null; }
      getModulators(): unknown[] { return []; }
      // --- Fin Méthodes ---

      // --- login() (inchangé, appelle fetchUserInfo et fetchAppliances) ---
      async login(): Promise<VoltalisAccountInfo | null> { /* ... idem ... */
         this.token = null; this.user = null; this.appliances = []; const loginPayload = { login: this.credentials.login as string, password: this.credentials.password as string }; console.log("Attempting login to /auth/login..."); try { const res = await this.api.post<{ token: string }>('/auth/login', loginPayload, { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest' } }); if (res.data?.token) { this.token = res.data.token; console.log('Login successful, token received.'); await this.fetchUserInfo(); await this.fetchAppliances(); return this.user; } else { throw new Error('Login failed: Token missing in response.'); } } catch (err) { this.token = null; this.user = null; this.appliances = []; throw err; }
      }

      // --- fetchUserInfo (inchangé) ---
      async fetchUserInfo(): Promise<VoltalisAccountInfo> { /* ... idem ... */
        if (!this.token) throw new Error("Cannot fetch user info: No token."); console.log("Fetching user info..."); try { const res = await this.api.get<VoltalisAccountInfo>('/api/account/me'); if (res.data?.defaultSite?.id) { this.user = res.data; console.log(`User info fetched. Site ID: ${this.user.defaultSite.id}`); return this.user; } else throw new Error("Invalid user info response."); } catch (error) { this.user = null; throw error; }
      }

      // --- fetchAppliances (MISE A JOUR avec le bon endpoint) ---
      async fetchAppliances(): Promise<ApplianceInfo[]> {
          this.ensureIsLoggedIn();
          const siteId = this.user?.defaultSite?.id;
          if (!siteId) throw new Error("Site ID is missing, cannot fetch appliances.");

          // Utilise le bon endpoint trouvé par l'utilisateur
          const endpointPath = `/api/site/${siteId}/autodiag`; // MISE A JOUR ICI
          console.log(`Fetching appliances from: ${endpointPath}...`);

          try {
              // Attend un tableau d'objets correspondant à la nouvelle interface ApplianceInfo
              const response = await this.api.get<ApplianceInfo[]>(endpointPath);
              if (Array.isArray(response.data)) {
                  // Vérifie si les objets ont les propriétés attendues (au moins name et csApplianceId)
                  if (response.data.length > 0 && response.data[0].name !== undefined && response.data[0].csApplianceId !== undefined) {
                      this.appliances = response.data;
                      console.log(`Fetched ${this.appliances.length} appliances.`);
                      return this.appliances;
                  } else if (response.data.length === 0) {
                      console.log("Fetched 0 appliances.");
                      this.appliances = [];
                      return this.appliances;
                  } else {
                      // La structure ne correspond pas même si c'est un tableau
                      console.error("Invalid structure for appliances in array:", response.data);
                      this.appliances = [];
                      throw new Error("Invalid appliance list structure.");
                  }
              } else {
                  console.error("Invalid response structure for appliances (not an array):", response.data);
                  this.appliances = [];
                  throw new Error("Invalid appliance list response.");
              }
          } catch (error) {
              console.error(`Failed to fetch appliances from ${endpointPath}.`);
              this.appliances = [];
              throw error;
          }
      }

      // !! fetchAppliancesRealtimePower (TOUJOURS HYPOTHETIQUE) !!
      async fetchAppliancesRealtimePower(): Promise<ApplianceRealtimePower[]> {
          this.ensureIsLoggedIn();
          const siteId = this.user?.defaultSite?.id;
          if (!siteId) throw new Error("Site ID is missing.");

          // !! Remplacer par le VRAI endpoint temps réel par appareil !!
          const endpointPath = `/api/site/${siteId}/appliances/realtime_placeholder`;
          console.warn(`Executing HYPOTHETICAL fetchAppliancesRealtimePower to ${endpointPath}...`);
          console.warn("You MUST find the correct endpoint and response structure for real-time power per appliance!");

          // Simule une réponse vide pour éviter une erreur 404 pendant les tests,
          // mais il faudra remplacer par le vrai appel et la vraie gestion de réponse.
          // return Promise.resolve([]); // Retourne un tableau vide pour l'instant

          // OU tente un appel vers un endpoint supposé (échouera probablement)
           try {
               const response = await this.api.get<ApplianceRealtimePower[]>(endpointPath);
               if (Array.isArray(response.data)) {
                   console.log(`Received data from hypothetical endpoint ${endpointPath}. Structure:`, response.data.length > 0 ? response.data[0] : 'Empty array');
                   // !! Adapter la vérification aux vraies données !!
                   // Exemple : if (response.data.length > 0 && response.data[0].csApplianceId !== undefined && response.data[0].powerW !== undefined)
                   return response.data;
               } else {
                   throw new Error("Invalid response structure from hypothetical endpoint.");
               }
           } catch (error) {
               console.error(`Failed to fetch from hypothetical endpoint ${endpointPath}. This is expected until the correct endpoint is found.`);
               // Retourne un tableau vide pour permettre au reste du code de continuer sans planter
               return [];
               // throw error; // Alternative: relancer l'erreur si on préfère bloquer
           }
      }
      // --- Fin Méthodes ---

    } // Fin Class Voltalis
    
