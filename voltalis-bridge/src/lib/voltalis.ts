// voltalis.ts (Version TypeScript - MAJ avec Endpoint /day/.../full-data)

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

export interface ApplianceInfo { name: string; csModulatorId: number; csApplianceId: number; status: string; diagTestEnabled: boolean; }

// Interface pour un point de données dans la réponse /day/.../full-data (simplifiée)
interface DayConsumptionDataPoint {
    stepTimestampOnSite: string; // Format YYYY-MM-DDTHH:mm:ss
    totalConsumptionInWh: number;
    // Ajouter d'autres champs si nécessaire
}

// Interface pour la réponse complète de /day/.../full-data (simplifiée)
interface DayConsumptionResponse {
    summary: Record<string, any>; // On ignore le summary pour l'instant
    dataPoints: DayConsumptionDataPoint[]; // Données globales par pas de temps
    perAppliance: {
        [applianceId: string]: DayConsumptionDataPoint[]; // Clé est l'ID (string), valeur est tableau de points
    };
    // breakdown: Record<string, any>; // On ignore breakdown
}

// Interface pour le retour de notre fonction (ID numérique, puissance en W)
export interface ApplianceRealtimePower {
    csApplianceId: number;
    powerW: number;
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
  // --- fetchAppliances (inchangé, utilise /autodiag) ---
  async fetchAppliances(): Promise<ApplianceInfo[]> { /* ... idem ... */
    this.ensureIsLoggedIn(); const siteId = this.user?.defaultSite?.id; if (!siteId) throw new Error("Site ID is missing."); const endpointPath = `/api/site/${siteId}/autodiag`; console.log(`Fetching appliances from: ${endpointPath}...`); try { const response = await this.api.get<ApplianceInfo[]>(endpointPath); if (Array.isArray(response.data)) { if (response.data.length > 0 && response.data[0].name !== undefined && response.data[0].csApplianceId !== undefined) { this.appliances = response.data; console.log(`Fetched ${this.appliances.length} appliances.`); return this.appliances; } else if (response.data.length === 0) { console.log("Fetched 0 appliances."); this.appliances = []; return this.appliances; } else { throw new Error("Invalid appliance list structure."); } } else { throw new Error("Invalid appliance list response."); } } catch (error) { console.error(`Failed to fetch appliances from ${endpointPath}.`); this.appliances = []; throw error; }
  }


  // *** fetchAppliancesRealtimePower MODIFIÉE pour utiliser /day ***
  // Renomme la méthode pour refléter la source des données
  async fetchAppliancesDayConsumption(): Promise<ApplianceRealtimePower[]> {
      this.ensureIsLoggedIn();
      const siteId = this.user?.defaultSite?.id;
      if (!siteId) throw new Error("Site ID is missing.");

      // Obtient la date d'aujourd'hui au format YYYY-MM-DD
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, '0'); // Mois de 0-11 -> 1-12
      const day = today.getDate().toString().padStart(2, '0');
      const todayDate = `${year}-${month}-${day}`;

      // Construit l'endpoint pour les données du jour
      const endpointPath = `/api/site/${siteId}/consumption/day/${todayDate}/full-data`;
      console.log(`Fetching daily appliance consumption from: ${endpointPath}...`);

      try {
          const response = await this.api.get<DayConsumptionResponse>(endpointPath);

          const results: ApplianceRealtimePower[] = [];

          if (response.data && typeof response.data.perAppliance === 'object' && response.data.perAppliance !== null) {
              const perApplianceData = response.data.perAppliance;

              // Détermine la durée d'un pas de temps (en heures) à partir de dataPoints (suppose qu'ils existent et sont réguliers)
              let stepDurationHours = 0.5; // Défaut à 30 minutes
              if (response.data.dataPoints && response.data.dataPoints.length >= 2) {
                  const time1 = new Date(response.data.dataPoints[0].stepTimestampOnSite).getTime();
                  const time2 = new Date(response.data.dataPoints[1].stepTimestampOnSite).getTime();
                  const durationMillis = Math.abs(time2 - time1);
                  stepDurationHours = durationMillis / (1000 * 60 * 60); // Convertit ms en heures
                  console.log(`Detected step duration: ${stepDurationHours} hours`);
              } else {
                   console.warn("Could not determine step duration from dataPoints, assuming 0.5 hours.");
              }

              // Vérifie si la durée est valide pour éviter division par zéro
              if (stepDurationHours <= 0) {
                  console.error("Invalid step duration detected. Cannot calculate power.");
                  stepDurationHours = 0.5; // Fallback
              }

              // Boucle sur chaque ID d'appareil fourni dans la liste interne (this.appliances)
              // pour s'assurer qu'on traite bien ceux enregistrés
              for (const appliance of this.appliances) {
                  const applianceIdStr = appliance.csApplianceId.toString(); // L'API utilise l'ID comme clé string

                  if (perApplianceData[applianceIdStr] && Array.isArray(perApplianceData[applianceIdStr]) && perApplianceData[applianceIdStr].length > 0) {
                      // Trouve le point de données le plus récent pour cet appareil
                      const appliancePoints = perApplianceData[applianceIdStr];
                      // Trie par date descendante (plus récent en premier)
                      appliancePoints.sort((a, b) => new Date(b.stepTimestampOnSite).getTime() - new Date(a.stepTimestampOnSite).getTime());
                      const latestPoint = appliancePoints[0];

                      if (latestPoint && latestPoint.totalConsumptionInWh !== undefined && latestPoint.totalConsumptionInWh !== null) {
                          const energyWh = latestPoint.totalConsumptionInWh;
                          // Calcule la puissance moyenne en Watts pour cette période
                          const averagePowerW = energyWh / stepDurationHours;
                          console.log(`Appliance ${appliance.csApplianceId} (${appliance.name}): Latest point ${latestPoint.stepTimestampOnSite}, Energy ${energyWh} Wh, Avg Power ${averagePowerW.toFixed(2)} W`);

                          results.push({
                              csApplianceId: appliance.csApplianceId, // ID numérique
                              powerW: Math.round(averagePowerW) // Arrondit à l'entier le plus proche
                          });
                      } else {
                           console.warn(`No valid consumption data found for appliance ${appliance.csApplianceId} in the latest point.`);
                           // Ajoute avec une puissance de 0 ou null si aucune donnée récente
                           results.push({ csApplianceId: appliance.csApplianceId, powerW: 0 });
                      }
                  } else {
                      console.warn(`No consumption data found for appliance ${appliance.csApplianceId} in the daily response.`);
                      // Ajoute avec une puissance de 0 ou null si l'appareil n'est pas dans la réponse
                      results.push({ csApplianceId: appliance.csApplianceId, powerW: 0 });
                  }
              }
              console.log(`Processed power data for ${results.length} appliances.`);
              return results;

          } else {
              console.error("Invalid or missing 'perAppliance' data in response:", response.data);
              throw new Error("Invalid response structure from daily consumption endpoint.");
          }
      } catch (error) {
          console.error(`Failed to fetch from ${endpointPath}.`);
          throw error; // Relance l'erreur
      }
  }
  // --- Fin Méthodes ---

} // Fin Class Voltalis
