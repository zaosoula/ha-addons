// sensors.ts (Correction Import Sensor v2)

import { HomeAssistant } from "./lib/homeassistant"; // Importe HomeAssistant
import { Sensor } from "./lib/sensor";             // Importe Sensor depuis son fichier source
import { ApplianceInfo, Voltalis } from "./lib/voltalis"; // Importe aussi Voltalis pour accéder au siteId

interface DynamicSensors {
    // Utilise le type Sensor importé
    appliancePowerSensors: Map<number, Sensor>; // Utilise l'ID numérique comme clé
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
    const deviceInfo = siteInfo ? {
        identifiers: [["voltalis_site_id", siteInfo.id.toString()]],
        name: `Voltalis Site ${siteInfo.id}`,
        manufacturer: "Voltalis",
        model: `Voltalis Bridge (Site ${siteInfo.id})`,
        // via_device: ... // Optionnel
    } : undefined;

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
            // Note: le payload complet est { ...attributes, device: deviceInfo }
            hass.registerSensor(entityId, {
                 ...attributes,
                 device: deviceInfo // Ajoute les informations de l'appareil parent
             });

            // Récupère l'instance du capteur qui a été stockée dans hass.sensors
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
