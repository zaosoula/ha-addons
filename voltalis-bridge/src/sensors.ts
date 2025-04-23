// sensors.ts (Ajout Device Info pour lier les entités)

import { HomeAssistant, Sensor } from "./lib/homeassistant";
import { ApplianceInfo, Voltalis } from "./lib/voltalis"; // Importe aussi Voltalis pour accéder au siteId

interface DynamicSensors {
    appliancePowerSensors: Map<number, Sensor>;
}

// La fonction prend maintenant l'instance Voltalis pour accéder aux infos du site
export const registerSensors = (hass: HomeAssistant, voltalis: Voltalis): DynamicSensors => {
    const appliances = voltalis.appliances; // Récupère la liste des appareils
    const siteInfo = voltalis.getMainSite(); // Récupère les infos du site principal

    console.log(`Registering sensors for ${appliances.length} appliances...`);
    const dynamicSensors: DynamicSensors = {
        appliancePowerSensors: new Map()
    };

    // Définit les informations pour l'appareil "parent" dans Home Assistant
    // Utilise l'ID du site Voltalis pour assurer l'unicité
    const deviceInfo = siteInfo ? {
        identifiers: [["voltalis_site_id", siteInfo.id.toString()]], // Identifiant unique
        name: `Voltalis Site ${siteInfo.id}`, // Nom de l'appareil dans HA
        manufacturer: "Voltalis",
        model: `Voltalis Bridge (Site ${siteInfo.id})`,
        // sw_version: "...", // On pourrait ajouter la version du plugin ici
        via_device: ["voltalis_bridge_addon"] // Lie à l'add-on lui-même (optionnel)
    } : undefined; // Ne pas créer de device si les infos du site manquent

    appliances.forEach(appliance => {
        const safeName = appliance.name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_{2,}/g, '_');
        const entityId = `sensor.voltalis_${safeName}_power`;
        const uniqueSensorId = `voltalis_power_${appliance.csApplianceId}`;

        console.log(`Registering sensor: ${entityId} for appliance "${appliance.name}" (ID: ${appliance.csApplianceId})`);

        const attributes = {
            friendly_name: `${appliance.name} Power`,
            icon: 'mdi:radiator',
            unit_of_measurement: 'W',
            device_class: 'power',
            state_class: 'measurement',
            voltalis_appliance_id: appliance.csApplianceId,
            voltalis_modulator_id: appliance.csModulatorId,
            voltalis_status: appliance.status
        };

        try {
            // Appelle registerSensor en passant les attributs ET les infos de l'appareil parent
            hass.registerSensor(entityId, {
                 ...attributes, // Garde les attributs spécifiques au capteur
                 device: deviceInfo // Ajoute les informations de l'appareil parent
             });

            const powerSensorInstance = hass.sensors[entityId];
            if (powerSensorInstance instanceof Sensor) {
                dynamicSensors.appliancePowerSensors.set(appliance.csApplianceId, powerSensorInstance);
            } else {
                 console.error(`Failed to retrieve registered sensor instance for ${entityId}.`);
            }
        } catch (registerError) {
            console.error(`Error calling hass.registerSensor for ${entityId}:`, registerError);
        }
    });

    console.log("Sensor registration finished.");
    return dynamicSensors;
};
