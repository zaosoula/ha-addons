import { Voltalis } from "./lib/voltalis";
import { HomeAssistant } from "./lib/homeassistant";
import { CONFIG } from "./config";
import { registerSensors } from "./sensors";
import { registerPollers } from "./pollers";

// Crée les instances
const voltalis = new Voltalis(CONFIG.username, CONFIG.password);
const hass = new HomeAssistant(process.env.SUPERVISOR_TOKEN!);

// Fonction principale asynchrone
(async () => {
    try {
        // Tente le login (qui inclut maintenant fetchUserInfo)
        await voltalis.login();
        console.log('Successfully logged in to Voltalis API and fetched user info.');

        // Enregistre les capteurs et les pollers
        const sensors = registerSensors(hass);
        const pollers = registerPollers(voltalis); // Suppose que registerPollers utilise fetchImmediateConsumptionInkW

        // S'abonne aux mises à jour de la consommation "immédiate" (puissance moyenne en W)
        pollers.immediateConsumptionInkW.subscribe({
            next: async (averagePowerW: unknown) => { // La donnée reçue est la puissance moyenne en W
                console.log('[immediateConsumptionInkW Poller] Received data:', averagePowerW);

                // Vérifie que la donnée est un nombre valide
                if (typeof averagePowerW === 'number' && isFinite(averagePowerW)) {

                    // Met à jour le capteur de puissance instantanée (W)
                    try {
                        await sensors.voltalis_immediate_consumption.update({
                            state: averagePowerW, // Utilise directement la valeur en Watts
                        });
                        console.log(`[Sensor Update] voltalis_immediate_consumption updated to: ${averagePowerW} W`);
                    } catch (updateError) {
                         console.error("Error updating immediate consumption sensor:", updateError);
                    }


                    // --- Mise à jour du capteur cumulatif (Wh) ---
                    // L'API /realtime fournit l'énergie des 10 dernières minutes (totalConsumptionInWh).
                    // Mettre à jour un compteur cumulatif (state_class: 'total_increasing')
                    // nécessite soit une valeur toujours croissante, soit un reset périodique.
                    // Utiliser directement l'énergie des 10min n'est pas correct pour un total.
                    // Il faudrait idéalement un endpoint API qui donne le total cumulé du jour/mois/etc.
                    // Ou alors, il faudrait que le plugin calcule lui-même le cumul (complexe).

                    // Option la plus simple pour l'instant : Ne pas mettre à jour ce capteur depuis cette source.
                    console.warn("[Sensor Update] voltalis_consumption (Wh) update skipped - requires dedicated cumulative data or calculation logic.");

                    /* // Ancien code (incorrect avec la nouvelle API)
                    await sensors.voltalis_consumption.update({
                        state: data.immediateConsumptionInkW.consumption * (data.immediateConsumptionInkW.duration / 3600) * 1000,
                    })
                    */

                } else {
                    console.error("[Poller Error] Received invalid data type for immediate consumption:", typeof averagePowerW, averagePowerW);
                }
            },
            error: (e: Error) => {
                // Log l'erreur venant du poller (qui vient probablement de fetchImmediateConsumptionInkW)
                console.error('[immediateConsumptionInkW Poller Error]', e.message, e.stack);
            }
        });

        console.log("Pollers started and subscribed.");

    } catch (error) {
        console.error("Failed to initialize Voltalis plugin:", error instanceof Error ? error.message : error);
        // Gérer l'échec de l'initialisation (peut-être arrêter le script ou réessayer ?)
        // process.exit(1); // Optionnel: arrêter si l'initialisation échoue
    }
})();

