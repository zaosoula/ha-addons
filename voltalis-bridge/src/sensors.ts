    // sensors.ts (MAJ avec csApplianceId)

    import { HomeAssistant } from "./lib/homeassistant";
    import { ApplianceInfo } from "./lib/voltalis"; // Utilise l'interface mise à jour

    interface DynamicSensors {
        appliancePowerSensors: Map<number, HomeAssistant.Sensor>; // Utilise l'ID numérique comme clé
    }

    export const registerSensors = (hass: HomeAssistant, appliances: ApplianceInfo[]): DynamicSensors => {
        console.log(`Registering sensors for ${appliances.length} appliances...`);
        const dynamicSensors: DynamicSensors = {
            appliancePowerSensors: new Map()
        };

        appliances.forEach(appliance => {
            // Utilise le nom de l'appareil pour l'ID d'entité (nettoyé)
            const safeName = appliance.name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_{2,}/g, '_');
            const entityId = `sensor.voltalis_${safeName}_power`;
            // Utilise csApplianceId (numérique) pour l'ID unique interne
            const uniqueSensorId = `voltalis_power_${appliance.csApplianceId}`;

            console.log(`Registering sensor: ${entityId} (Unique ID: ${uniqueSensorId}) for appliance "${appliance.name}" (ID: ${appliance.csApplianceId})`);

            const powerSensor = hass.register(entityId, {
                attributes: {
                    friendly_name: `${appliance.name} Power`,
                    icon: 'mdi:radiator',
                    unit_of_measurement: 'W',
                    device_class: 'power',
                    state_class: 'measurement',
                    voltalis_appliance_id: appliance.csApplianceId, // Garde l'ID numérique
                    voltalis_modulator_id: appliance.csModulatorId, // Ajoute l'ID modulateur
                    voltalis_status: appliance.status // Ajoute le statut
                }
            });
            // Utilise l'ID numérique comme clé de la Map
            dynamicSensors.appliancePowerSensors.set(appliance.csApplianceId, powerSensor);
        });

        console.log("Sensor registration finished.");
        return dynamicSensors;
    };
