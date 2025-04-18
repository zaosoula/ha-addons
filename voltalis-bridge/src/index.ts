// index.ts (Corrigé v2 - Appel correct registerSensors et nouveau poller)

import { Voltalis, ApplianceRealtimePower, ApplianceInfo } from "./lib/voltalis"; // Importe les types nécessaires
import { HomeAssistant } from "./lib/homeassistant";
import { CONFIG } from "./config";
import { registerSensors } from "./sensors";
import { registerPollers } from "./pollers";

const voltalis = new Voltalis(CONFIG.username, CONFIG.password);
const hass = new HomeAssistant(process.env.SUPERVISOR_TOKEN!);

(async () => {
    try {
        // 1. Login (inclut fetchUserInfo et fetchAppliances)
        // La méthode login retourne maintenant les infos user, mais on a aussi accès à voltalis.appliances
        await voltalis.login();
        console.log('Successfully logged in and fetched user info and appliance list.');

        // Récupère la liste des appareils après le login
        const appliances: ApplianceInfo[] = voltalis.appliances;

        if (!appliances || appliances.length === 0) {
            console.warn("No appliances found for this site. No individual sensors will be created.");
        }

        // 2. Enregistre les capteurs dynamiquement en passant la liste des appareils
        // L'appel est maintenant correct avec les deux arguments
        const sensors = registerSensors(hass, appliances);

        // 3. Enregistre et démarre les pollers (utilise le nouveau poller)
        const pollers = registerPollers(voltalis);

        // 4. S'abonne aux mises à jour de la puissance des appareils
        // Utilise le bon nom de poller 'appliancesRealtimePower'
        pollers.appliancesRealtimePower.subscribe({
            next: async (appliancePowerData: ApplianceRealtimePower[] | null) => {
                console.log('[Appliances Poller] Received data:', appliancePowerData);

                if (appliancePowerData && Array.isArray(appliancePowerData)) {
                    appliancePowerData.forEach(async (applianceData) => {
                        // Utilise csApplianceId (numérique) pour chercher dans la Map
                        const targetSensor = sensors.appliancePowerSensors.get(applianceData.csApplianceId);

                        if (targetSensor) {
                            // Vérifie si powerW existe et est valide
                            if (applianceData.powerW !== undefined && typeof applianceData.powerW === 'number' && isFinite(applianceData.powerW)) {
                                try {
                                    // Met à jour le capteur spécifique
                                    // !! Attention: la méthode s'appelle peut-être autrement que '.update' !!
                                    // Cela dépend de ce que retourne réellement `hass.register` (voir erreur 6)
                                    await targetSensor.update({
                                        state: applianceData.powerW,
                                    });
                                    // console.log(`[Sensor Update] Sensor for ${applianceData.csApplianceId} updated to ${applianceData.powerW} W`);
                                } catch (updateError) {
                                     console.error(`Error updating sensor for appliance ${applianceData.csApplianceId}:`, updateError);
                                }
                            } else {
                                console.warn(`Invalid or missing power data for appliance ${applianceData.csApplianceId}:`, applianceData.powerW);
                            }
                        } else {
                            console.warn(`Received data for unknown appliance ID: ${applianceData.csApplianceId}`);
                        }
                    });
                    console.log(`[Sensor Update] Processed updates for ${appliancePowerData.length} appliances.`);
                } else if (appliancePowerData === null) {
                    console.warn("[Appliances Poller] Received null data, likely due to a fetch error. Skipping update cycle.");
                } else {
                    console.error("[Appliances Poller] Received invalid data type:", typeof appliancePowerData, appliancePowerData);
                }
            },
            error: (e: Error) => {
                console.error('[Appliances Poller Error]', e.message, e.stack);
            }
        });

        console.log("Pollers started and subscribed for individual appliances.");

    } catch (error) {
        console.error("Failed to initialize Voltalis plugin:", error instanceof Error ? error.message : error);
    }
})();
