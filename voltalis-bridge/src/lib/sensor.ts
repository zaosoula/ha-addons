    // lib/sensor.ts (Ajout Log Payload API)

    import { AxiosInstance, AxiosResponse, AxiosError } from "axios";

    export class Sensor {
      public name: string;
      private api: AxiosInstance;
      // Stocke TOUS les attributs passés, y compris potentiellement l'objet 'device'
      public attributes: Record<string, any>; // Utilise 'any' pour permettre l'objet device imbriqué
      public state: Record<string, unknown> | undefined;

      constructor(name: string, attributes: Record<string, any>, api: AxiosInstance) {
        this.name = name;
        this.api = api;
        this.attributes = attributes; // Stocke tout ce qui est passé
        this.state = undefined;

        console.log(`[hass] Initialized Sensor object for: ${this.name}`, { attributes });
      }

      getState() {
        // ... (code getState inchangé) ...
        console.log(`[hass] Getting state for: ${this.name}`);
        const apiUrl = `states/${this.name}`;
        return this.api.get(apiUrl)
          .then(({ data }: AxiosResponse) => { this.state = data; console.log(`[hass] State received for ${this.name}:`, data); return data; })
          .catch((error: AxiosError) => { if (error.response) { console.error(`Error getting state for ${this.name}: ${error.response.status} ${error.response.statusText}`, error.response.data); } else { console.error(`Error getting state for ${this.name}:`, error.message); } return null; });
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

        const apiUrl = `states/${this.name}`;

        return this.api.post(apiUrl, finalPayload)
          .then(({ data }: AxiosResponse) => {
            this.state = data;
            console.log(`[hass] Successfully updated state for ${this.name}. Response:`, data);
            return data;
          })
          .catch((error: AxiosError) => {
            if (error.response) { console.error(`Error updating state for ${this.name}: ${error.response.status} ${error.response.statusText}`, error.response.data); }
            else { console.error(`Error updating state for ${this.name}:`, error.message); }
            throw error;
          });
      }
    }
    ```
    **Modification clé :** Ajout de `console.log(JSON.stringify(finalPayload, null, 2));` dans la méthode `update`.

2.  **Vérifier la structure passée dans `sensors.ts` :** Assurons-nous que l'objet `deviceInfo` est bien passé *dans* les attributs lors de l'appel à `hass.registerSensor`. Le code précédent (dans l'immersive `voltalis_plugin_sensors_ts`) le faisait correctement en passant `{ ...attributes, device: deviceInfo }`. Vérifiez que votre fichier `sensors.ts` local correspond bien à cette version.

**Prochaines étapes :**

1.  Appliquez la modification (ajout du `console.log`) dans `lib/sensor.ts`.
2.  Vérifiez que `sensors.ts` passe bien `device: deviceInfo` dans le deuxième argument de `hass.registerSensor`.
3.  Recompilez (`yarn build`).
4.  Déployez et redémarrez l'add-on.
5.  **Regardez attentivement les logs de l'add-on :**
    * Vous verrez toujours les logs `[hass] Initialized Sensor object...`.
    * Ensuite, pour chaque appel à `update`, vous verrez le log `[hass] Updating state for: sensor.voltalis_..._power. Sending payload to HA API:` suivi du JSON complet.
    * **Vérifiez ce JSON :** Est-ce que la clé `device` avec toutes les informations (`identifiers`, `name`, `manufacturer`, etc.) est bien présente à l'intérieur de la clé `attributes` ?
        * **Si oui :** La liaison devrait fonctionner. Le problème pourrait être ailleurs (cache HA, identifiants de l'appareil "Voltalis Bridge" différents).
        * **Si non :** Il y a un problème dans la façon dont les attributs sont stockés ou fusionnés entre `sensors.ts` et `sensor.ts`.

Partagez un extrait de ce nouveau log (la partie avec `Sending payload to HA API:` et le JSON qui suit) si les capteurs ne sont toujours pas li
