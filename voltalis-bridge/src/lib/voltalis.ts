// voltalis.ts (Version TypeScript - Correction Sélection Point + Calcul Puissance)

import axios, { AxiosError, AxiosInstance, AxiosResponse, AxiosRequestConfig } from "axios";
import fs from "fs";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import path from "path";

const API_BASE_URL = 'https://api.myvoltalis.com/';

// --- Interfaces (inchangées) ---
interface VoltalisSiteInfo { /* ... */ id: number; address: string; name: string | null; postalCode: string; city: string; country: string; timezone: string; state: string | null; voltalisVersion: string; installationDate: string; dataStart: string; hasGlobalConsumptionMeasure: boolean; hasDsoMeasure: boolean; contractTarifsHaveChanged: boolean; lastContractTarifsUpdateDate: string | null; hasBasicOffer: boolean; default: boolean; }
interface PhoneInfo { /* ... */ phoneType: string | null; phoneNumber: string; isDefault: boolean; }
interface VoltalisAccountInfo { /* ... */ id: number; firstname: string; lastname: string; email: string; phones: PhoneInfo[]; defaultSite: VoltalisSiteInfo; otherSites: VoltalisSiteInfo[]; }
export interface ApplianceInfo { name: string; csModulatorId: number; csApplianceId: number; status: string; diagTestEnabled: boolean; }
interface DayConsumptionDataPoint { stepTimestampOnSite: string; totalConsumptionInWh: number; /* ... */ }
interface DayConsumptionResponse { summary: Record<string, any>; dataPoints: DayConsumptionDataPoint[]; perAppliance: { [applianceId: string]: DayConsumptionDataPoint[]; }; /* ... */ }
export interface ApplianceRealtimePower { csApplianceId: number; powerW: number; }
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
    this.api.interceptors.request.use(addAuthToken as any); this.api.interceptors.request.use(addUserSiteId as any);
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

  // --- login() et fetchUserInfo() (inchangées) ---
  async login(): Promise<VoltalisAccountInfo | null> { /* ... idem ... */
     this.token = null; this.user = null; this.appliances = []; const loginPayload = { login: this.credentials.login as string, password: this.credentials.password as string }; console.log("Attempting login to /auth/login..."); try { const res = await this.api.post<{ token: string }>('/auth/login', loginPayload, { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest' } }); if (res.data?.token) { this.token = res.data.token; console.log('Login successful, token received.'); await this.fetchUserInfo(); await this.fetchAppliances(); return this.user; } else { throw new Error('Login failed: Token missing in response.'); } } catch (err) { this.token = null; this.user = null; this.appliances = []; throw err; }
  }
  async fetchUserInfo(): Promise<VoltalisAccountInfo> { /* ... idem ... */
    if (!this.token) throw new Error("Cannot fetch user info: No token."); console.log("Fetching user info..."); try { const res = await this.api.get<VoltalisAccountInfo>('/api/account/me'); if (res.data?.defaultSite?.id) { this.user = res.data; console.log(`User info fetched. Site ID: ${this.user.defaultSite.id}`); return this.user; } else throw new Error("Invalid user info response."); } catch (error) { this.user = null; throw error; }
  }
  // --- fetchAppliances (inchangé) ---
  async fetchAppliances(): Promise<ApplianceInfo[]> { /* ... idem ... */
    this.ensureIsLoggedIn(); const siteId = this.user?.defaultSite?.id; if (!siteId) throw new Error("Site ID is missing."); const endpointPath = `/api/site/${siteId}/autodiag`; console.log(`Fetching appliances from: ${endpointPath}...`); try { const response = await this.api.get<ApplianceInfo[]>(endpointPath); if (Array.isArray(response.data)) { if (response.data.length > 0 && response.data[0].name !== undefined && response.data[0].csApplianceId !== undefined) { this.appliances = response.data; console.log(`Fetched ${this.appliances.length} appliances.`); return this.appliances; } else if (response.data.length === 0) { console.log("Fetched 0 appliances."); this.appliances = []; return this.appliances; } else { throw new Error("Invalid appliance list structure."); } } else { throw new Error("Invalid appliance list response."); } } catch (error) { console.error(`Failed to fetch appliances from ${endpointPath}.`); this.appliances = []; throw error; }
  }


  // *** fetchAppliancesDayConsumption MODIFIÉE ***
  async fetchAppliancesDayConsumption(): Promise<ApplianceRealtimePower[]> {
      this.ensureIsLoggedIn();
      const siteId = this.user?.defaultSite?.id;
      if (!siteId) throw new Error("Site ID is missing.");

      const now = new Date(); // Heure actuelle
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const todayDate = `${year}-${month}-${day}`;

      const endpointPath = `/api/site/${siteId}/consumption/day/${todayDate}/full-data`;
      console.log(`Fetching daily appliance consumption from: ${endpointPath}...`);

      try {
          const response = await this.api.get<DayConsumptionResponse>(endpointPath);
          const results: ApplianceRealtimePower[] = [];

          if (response.data && typeof response.data.perAppliance === 'object' && response.data.perAppliance !== null) {
              const perApplianceData = response.data.perAppliance;

              // *** Hypothèse fixe pour la durée de l'intervalle en heures ***
              // L'API /day semble utiliser des pas variables (parfois 30min, parfois 1h, parfois plus)
              // Utiliser une durée fixe comme 0.5h (30min) est une approximation.
              // Si la granularité est toujours 1h, utiliser 1.0.
              const stepDurationHours = 0.5; // Hypothèse: intervalle de 30 minutes
              console.log(`Using assumed step duration: ${stepDurationHours} hours for power calculation.`);

              for (const appliance of this.appliances) {
                  const applianceIdStr = appliance.csApplianceId.toString();
                  let calculatedPowerW = 0; // Puissance par défaut à 0

                  if (perApplianceData[applianceIdStr] && Array.isArray(perApplianceData[applianceIdStr])) {
                      const appliancePoints = perApplianceData[applianceIdStr];

                      // *** Correction: Filtrer les points pour ne garder que ceux passés ***
                      const pastPoints = appliancePoints.filter(p => new Date(p.stepTimestampOnSite).getTime() <= now.getTime());

                      if (pastPoints.length > 0) {
                          // Trie les points passés par date descendante pour trouver le plus récent
                          pastPoints.sort((a, b) => new Date(b.stepTimestampOnSite).getTime() - new Date(a.stepTimestampOnSite).getTime());
                          const latestValidPoint = pastPoints[0];

                          if (latestValidPoint && latestValidPoint.totalConsumptionInWh !== undefined && latestValidPoint.totalConsumptionInWh !== null) {
                              const energyWh = latestValidPoint.totalConsumptionInWh;
                              // Calcule la puissance moyenne sur l'intervalle supposé
                              calculatedPowerW = energyWh / stepDurationHours;
                              console.log(`Appliance ${appliance.csApplianceId} (${appliance.name}): Latest valid point ${latestValidPoint.stepTimestampOnSite}, Energy ${energyWh} Wh, Avg Power ${calculatedPowerW.toFixed(2)} W`);
                          } else {
                              console.warn(`No valid consumption data found for appliance ${appliance.csApplianceId} in the latest valid point.`);
                          }
                      } else {
                          console.warn(`No past consumption data points found for appliance ${appliance.csApplianceId} today.`);
                      }
                  } else {
                      console.warn(`No consumption data array found for appliance ${appliance.csApplianceId} in the daily response.`);
                  }

                  // Ajoute le résultat (0 W si aucune donnée valide trouvée)
                  results.push({
                      csApplianceId: appliance.csApplianceId,
                      powerW: Math.round(calculatedPowerW) // Arrondit
                  });
              }
              console.log(`Processed power data for ${results.length} appliances.`);
              return results;

          } else {
              console.error("Invalid or missing 'perAppliance' data in response:", response.data);
              throw new Error("Invalid response structure from daily consumption endpoint.");
          }
      } catch (error) {
          console.error(`Failed to fetch from ${endpointPath}.`);
          throw error;
      }
  }
  // --- Fin Méthodes ---

} // Fin Class Voltalis
