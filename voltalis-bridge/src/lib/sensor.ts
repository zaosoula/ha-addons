// lib/sensor.ts (Correction URL API)

import { AxiosInstance, AxiosResponse, AxiosError } from "axios"; // Importe AxiosError

export class Sensor {
  public name: string; // Contient l'entity_id complet (ex: "sensor.voltalis_cuisine_power")
  private api: AxiosInstance;
  public attributes: Record<string, unknown>;
  public state: Record<string, unknown> | undefined; // Stocke la dernière réponse de l'API HA

  constructor(name: string, attributes: Record<string, unknown>, api: AxiosInstance) {
    this.name = name;
    this.api = api;
    this.attributes = attributes;
    this.state = undefined;

    // Ce log est juste indicatif de la création de l'objet JS
    console.log(`[hass] Initialized Sensor object for: ${this.name}`, { attributes });
  }

  getState() {
    console.log(`[hass] Getting state for: ${this.name}`);

    // Utilise directement this.name (l'entity_id complet) dans l'URL
    const apiUrl = `states/${this.name}`; // CORRECTION ICI

    return this.api.get(apiUrl)
      .then(({ data }: AxiosResponse) => { // Type explicite pour la réponse
        this.state = data;
        console.log(`[hass] State received for ${this.name}:`, data);
        return data;
      })
      .catch((error: AxiosError) => { // Type explicite pour l'erreur
        // Log plus détaillé en cas d'erreur (ex: 404 si l'entité n'existe pas encore)
        if (error.response) {
            console.error(`Error getting state for ${this.name}: ${error.response.status} ${error.response.statusText}`, error.response.data);
        } else {
            console.error(`Error getting state for ${this.name}:`, error.message);
        }
        // Retourne null ou une erreur pour indiquer l'échec
        return null; // Ou throw error; si on veut que l'appelant gère
      });
  }

  update(payload: {
    state: unknown,
    attributes?: Record<string, unknown>
  }) {
    // Prépare le payload final pour l'API HA
    const finalPayload = {
      state: payload.state, // L'état à définir
      attributes: {
        ...(this.attributes ?? {}),    // Attributs définis à la création
        ...(payload.attributes ?? {}) // Attributs spécifiques à cette mise à jour (s'il y en a)
      }
    };

    console.log(`[hass] Updating state for: ${this.name} with payload:`, finalPayload);

    // Utilise directement this.name (l'entity_id complet) dans l'URL
    const apiUrl = `states/${this.name}`; // CORRECTION ICI

    return this.api.post(apiUrl, finalPayload) // Fait l'appel POST pour créer/mettre à jour
      .then(({ data }: AxiosResponse) => {
        this.state = data; // Met à jour l'état local avec la réponse de HA
        console.log(`[hass] Successfully updated state for ${this.name}. Response:`, data);
        return data;
      })
      .catch((error: AxiosError) => {
        // Log détaillé de l'erreur 400 ou autre
        if (error.response) {
            console.error(`Error updating state for ${this.name}: ${error.response.status} ${error.response.statusText}`, error.response.data);
        } else {
            console.error(`Error updating state for ${this.name}:`, error.message);
        }
        // Relance l'erreur pour que l'appelant (dans index.ts) puisse la voir
        throw error;
      });
  }
}
