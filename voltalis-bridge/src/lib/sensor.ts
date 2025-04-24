// lib/sensor.ts (Nettoyé + Log Payload API)

import { AxiosInstance, AxiosResponse, AxiosError } from "axios";

export class Sensor {
  public name: string; // Contient l'entity_id complet (ex: "sensor.voltalis_cuisine_power")
  private api: AxiosInstance;
  // Stocke TOUS les attributs passés, y compris potentiellement l'objet 'device'
  public attributes: Record<string, any>; // Utilise 'any' pour permettre l'objet device imbriqué
  public state: Record<string, unknown> | undefined; // Stocke la dernière réponse de l'API HA

  constructor(name: string, attributes: Record<string, any>, api: AxiosInstance) {
    this.name = name;
    this.api = api;
    this.attributes = attributes; // Stocke tout ce qui est passé
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
    attributes?: Record<string, unknown> // Attributs spécifiques à cette mise à jour
  }) {
    // Prépare le payload final pour l'API HA
    const finalPayload = {
      state: payload.state,
      attributes: {
        // Fusionne les attributs de base (qui DOIVENT inclure l'objet 'device' maintenant)
        ...(this.attributes ?? {}),
        // Fusionne les attributs spécifiques à cette mise à jour (s'il y en a)
        ...(payload.attributes ?? {})
      }
    };

    // *** AJOUT LOG DETAILLE DU PAYLOAD ***
    console.log(`[hass] Updating state for: ${this.name}. Sending payload to HA API:`);
    console.log(JSON.stringify(finalPayload, null, 2)); // Affiche le JSON complet qui sera envoyé

    const apiUrl = `states/${this.name}`; // CORRECTION ICI (utilise this.name directement)

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
} // Fin de la classe Sensor
