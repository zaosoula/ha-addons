// voltalis.ts (Version TypeScript corrigée et finalisée)

import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
// Supposons que 'axiosObservable' est juste 'axios' ou compatible. Sinon, ajustez l'import.
// import { axios as axiosObservable } from "./poller"; -> Remplacé par axios standard pour simplifier
import fs from "fs";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import path from "path";

// Nouvelle URL de base de l'API
const API_BASE_URL = 'https://api.myvoltalis.com/';

// --- Interfaces pour les nouvelles réponses API ---

// Interface pour la réponse de /api/account/me
interface VoltalisSiteInfo {
  id: number; // L'ID du site est un nombre
  address: string;
  name: string | null;
  postalCode: string;
  city: string;
  country: string;
  timezone: string;
  state: string | null;
  voltalisVersion: string;
  installationDate: string; // Format YYYY-MM-DD
  dataStart: string;      // Format YYYY-MM-DD
  hasGlobalConsumptionMeasure: boolean;
  hasDsoMeasure: boolean;
  contractTarifsHaveChanged: boolean;
  lastContractTarifsUpdateDate: string | null;
  hasBasicOffer: boolean;
  default: boolean;
  // modulatorList n'est plus présent ici
}

interface PhoneInfo {
  phoneType: string | null;
  phoneNumber: string;
  isDefault: boolean;
}

// Structure simplifiée basée sur la réponse fournie
interface VoltalisAccountInfo {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  phones: PhoneInfo[];
  defaultSite: VoltalisSiteInfo;
  otherSites: VoltalisSiteInfo[]; // Même si vide dans l'exemple
  // On ignore displayGroup, resources, operation etc. pour l'instant
  // Ajoutez-les si nécessaire pour d'autres fonctionnalités
}

// Interface pour un point de données de /consumption/realtime
interface RealtimeConsumptionPoint {
  stepTimestampInUtc: string; // Format ISO 8601
  totalConsumptionInWh: number;
  totalConsumptionInCurrency: number; // Peut être 0 si non configuré
}

// Interface pour la réponse de /consumption/realtime
interface RealtimeConsumptionResponse {
  aggregationStepInSeconds: number;
  consumptions: RealtimeConsumptionPoint[];
}

// --- Classe Voltalis ---

export class Voltalis {
  private credentials: Record<string, unknown>;
  private cookiePath: string = process.env.NODE_ENV === 'production' ? '/data/cookies.json' : path.join(__dirname, '../../cookies.json'); // Ajustez le chemin si nécessaire
  public user: VoltalisAccountInfo | null = null; // Type mis à jour
  private jar: CookieJar = new CookieJar();
  private api: AxiosInstance;
  private observableApi: AxiosInstance; // Utilise AxiosInstance standard
  private token: string | null = null; // Pour stocker le token JWT

  constructor(username: string, password: string) {
    // Garde les credentials originaux si d'autres parties du code les utilisent,
    // mais prépare le payload spécifique pour le login API.
    this.credentials = {
      login: username, // Le payload API utilise 'login'
      password: password,
      username: username, // Garde l'original
      // Les autres champs ne sont plus envoyés au login API
      id: "", alternative_email: "", email: "", firstname: "", lastname: "", phone: "", country: "", selectedSiteId: "", stayLoggedIn: "true",
    };
    this.token = null;
    this.user = null;

    // --- Gestion des cookies (inchangée, peut rester utile) ---
    let previousCookieJarJSON: string | undefined;
    const saveCookieJar = (res: AxiosResponse | AxiosError) => {
      let config: InternalAxiosRequestConfig | undefined;
      if (axios.isAxiosError(res)) {
        config = res.config;
      } else {
        config = res.config;
      }

      // Vérifie si config et config.jar existent
      if (config && config.jar) {
        try {
          // tough-cookie v4+ utilise jar.toJSON()
          const cookieJarJSON = JSON.stringify((config.jar as CookieJar).toJSON());
          if (cookieJarJSON !== previousCookieJarJSON) {
            fs.writeFileSync(this.cookiePath, cookieJarJSON);
            previousCookieJarJSON = cookieJarJSON;
          }
        } catch (e) {
          console.error("Failed to save cookie jar:", e);
        }
      }
    };

    if (fs.existsSync(this.cookiePath)) {
      try {
        const cookieJarJSON = fs.readFileSync(this.cookiePath, { encoding: 'utf-8' });
        // Crée le jar à partir du JSON stocké
        this.jar = CookieJar.fromJSON(cookieJarJSON);
        previousCookieJarJSON = cookieJarJSON;
      } catch (readErr) {
         console.error('Error reading cookie file:', readErr);
         this.jar = new CookieJar(); // Continue avec un jar vide
      }
    } else {
       this.jar = new CookieJar();
    }
    // --- Fin Gestion des cookies ---


    // --- Initialisation Axios avec la bonne baseURL ---
    // Utilise l'axios standard importé, enveloppé pour les cookies
    this.api = wrapper(axios.create({
      baseURL: API_BASE_URL,
      jar: this.jar,
      // Optionnel: timeout, etc.
    }));

    // Si observableApi avait une logique spécifique (RxJS?), il faudrait l'adapter.
    // Sinon, on utilise aussi une instance axios standard.
    this.observableApi = wrapper(axios.create({
      baseURL: API_BASE_URL,
      jar: this.jar, // Partage le même jar que this.api
    }));
    // --- Fin Initialisation Axios ---


    // --- Intercepteurs Axios ---
    // Ajoute le token d'authentification si disponible
    const addAuthToken = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      if (this.token) {
        if (!config.headers) {
          config.headers = axios.defaults.headers.common; // Initialise si besoin
        }
        config.headers['Authorization'] = `Bearer ${this.token}`;
      }
      return config;
    };

    // Ajoute l'ID du site si disponible (après fetchUserInfo)
    const addUserSiteId = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      if (this.user?.defaultSite?.id) { // Utilise optional chaining
         if (!config.headers) {
           config.headers = axios.defaults.headers.common;
         }
         config.headers['User-Site-Id'] = this.user.defaultSite.id;
      }
      return config;
     };

    // Applique les intercepteurs aux deux instances
    this.api.interceptors.request.use(addAuthToken);
    this.observableApi.interceptors.request.use(addAuthToken);
    this.api.interceptors.request.use(addUserSiteId);
    this.observableApi.interceptors.request.use(addUserSiteId);

    // Intercepteurs de réponse (pour sauvegarde cookies et log erreurs)
    const responseInterceptor = (response: AxiosResponse): AxiosResponse => {
        saveCookieJar(response);
        return response;
    };
    const errorInterceptor = (error: AxiosError): Promise<AxiosError> => {
        saveCookieJar(error); // Tente de sauvegarder même en cas d'erreur
        if (error.response) {
            console.error(`API Error: ${error.response.status} ${error.response.statusText} on ${error.config?.url}`, error.response.data);
        } else if (error.request) {
            console.error(`API Error: No response received for ${error.config?.url}`, error.message);
        } else {
            console.error('API Error: Request setup failed', error.message);
        }
        return Promise.reject(error);
    };

    this.api.interceptors.response.use(responseInterceptor, errorInterceptor);
    this.observableApi.interceptors.response.use(responseInterceptor, errorInterceptor);
    // --- Fin Intercepteurs Axios ---

    // Le bind n'est plus nécessaire si on appelle directement la méthode
    // this.fetchImmediateConsumptionInkW = this.fetchImmediateConsumptionInkW.bind(this);

  } // Fin constructor


  // --- Méthodes ---

  isLoggedIn(): boolean {
    // Considère loggué si on a un token ET les infos utilisateur
    return this.token !== null && this.user !== null;
  }

  ensureIsLoggedIn(): void {
    if (!this.isLoggedIn()) {
      throw new Error('Login and fetching user info required');
    }
  }

  // Renvoie les infos du site par défaut, type mis à jour
  getMainSite(): VoltalisSiteInfo | null {
    return this.user?.defaultSite ?? null;
  }

  // modulatorList n'est plus disponible via /api/account/me
  getModulators(): unknown[] {
    console.warn("getModulators() called, but modulatorList is not available in the current API response.");
    return [];
  }

  // Méthode de login mise à jour
  async login(): Promise<VoltalisAccountInfo | null> {
    this.token = null; // Réinitialise
    this.user = null;

    const loginPayload = {
      login: this.credentials.login as string, // Accède via l'objet credentials
      password: this.credentials.password as string
    };

    console.log("Attempting login to /auth/login...");
    try {
      const res = await this.api.post<{ token: string }>('/auth/login', loginPayload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (res.data && res.data.token) {
        this.token = res.data.token;
        console.log('Login successful, token received.');

        // Appelle fetchUserInfo pour récupérer les détails du compte
        await this.fetchUserInfo(); // fetchUserInfo gère sa propre erreur et met à jour this.user
        return this.user; // Retourne les infos utilisateur si tout a réussi

      } else {
        console.error('Login response received, but token is missing.', res.data);
        throw new Error('Login failed: Token missing in response.');
      }
    } catch (err) {
      this.token = null; // Assure que token est null en cas d'erreur
      this.user = null;
      console.error("Login process failed.", err instanceof Error ? err.message : err);
      // Relance l'erreur pour que l'appelant puisse la gérer
      // L'intercepteur d'erreur a déjà loggué les détails de l'API si disponibles
      if (err instanceof Error) {
         throw err; // Relance l'erreur originale si c'est une instance d'Error
      } else {
         throw new Error('An unknown error occurred during login.'); // Lance une nouvelle erreur générique
      }
    }
  }

  // Nouvelle méthode pour récupérer les infos utilisateur
  async fetchUserInfo(): Promise<VoltalisAccountInfo> {
    if (!this.token) {
      throw new Error("Cannot fetch user info without a token. Login first.");
    }
    console.log("Fetching user info from /api/account/me...");
    try {
      // L'intercepteur ajoute le token automatiquement
      const res = await this.api.get<VoltalisAccountInfo>('/api/account/me');

      if (res.data && res.data.defaultSite?.id) { // Vérifie la présence de defaultSite et son id
        this.user = res.data; // Stocke la réponse
        console.log(`User info fetched successfully. Site ID: ${this.user.defaultSite.id}`);
        return this.user;
      } else {
        console.error("User info response received, but structure is invalid or defaultSite is missing.", res.data);
        throw new Error("Failed to fetch user info: Invalid response structure.");
      }
    } catch (error) {
      console.error('Failed to fetch user info.'); // L'intercepteur a déjà loggué les détails
      this.user = null; // Assure que user est null en cas d'échec
      throw error; // Relance l'erreur pour la gestion dans login()
    }
  }


  // Méthode pour récupérer la puissance "instantanée" (moyenne sur 10 min)
  // Renvoie directement la puissance en Watts (nombre)
  async fetchImmediateConsumptionInkW(): Promise<number> {
     this.ensureIsLoggedIn(); // S'assure qu'on a token + user info

     const siteId = this.user?.defaultSite?.id; // Utilise optional chaining
     if (!siteId) {
        throw new Error("Site ID is missing, cannot fetch consumption.");
     }

     const endpointPath = `/api/site/${siteId}/consumption/realtime`;
     const queryParams = {
         mode: 'TEN_MINUTES',
         numPoints: 1
     };

     console.log(`Fetching real-time consumption from: ${endpointPath} with params:`, queryParams);

     try {
       // Utilise l'instance API standard (le token/siteId sont ajoutés par les intercepteurs)
       const response = await this.api.get<RealtimeConsumptionResponse>(endpointPath, { params: queryParams });

       if (response.data?.consumptions?.length > 0) {
         const latestPoint = response.data.consumptions[response.data.consumptions.length - 1];

         if (latestPoint?.totalConsumptionInWh !== undefined && latestPoint?.totalConsumptionInWh !== null) {
           const energyWh = latestPoint.totalConsumptionInWh;
           const averagePowerW = energyWh * 6; // Calcul de la puissance moyenne en W
           console.log(`Latest consumption point: ${energyWh} Wh. Calculated average power: ${averagePowerW} W`);
           return averagePowerW; // Retourne la valeur en Watts
         } else {
           console.error("Latest consumption point is invalid or missing 'totalConsumptionInWh'.", latestPoint);
           throw new Error("Invalid data received from real-time consumption endpoint.");
         }
       } else {
         console.error("Invalid or empty 'consumptions' array in response.", response.data);
         throw new Error("No consumption data received from real-time endpoint.");
       }
     } catch (error) {
        console.error(`Failed to fetch from ${endpointPath}.`); // L'intercepteur a loggué les détails
        throw error; // Relance l'erreur
     }
  } // Fin fetchImmediateConsumptionInkW

} // Fin Class Voltalis
