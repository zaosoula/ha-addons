// sensors.ts (Correction Import Sensor et Méthode registerSensor)

import { HomeAssistant } from "./lib/homeassistant"; // Importe HomeAssistant
import { Sensor } from "./lib/sensor";             // Importe Sensor depuis son fichier source
import { ApplianceInfo } from "./lib/voltalis";

interface DynamicSensors {
    // La clé est l'ID numérique de l'appareil, la valeur est l'instance Sensor
    appliancePowerSensors: Map<number, Sensor>;
}

export const registerSensors = (hass: HomeAssistant, appliances: ApplianceInfo[]): DynamicSensors => {
    console.log(`Registering sensors for ${appliances.length} appliances...`);
    const dynamicSensors: DynamicSensors = {
        appliancePowerSensors: new Map()
    };

    appliances.forEach(appliance => {
        const safeName = appliance.name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_{2,}/g, '_');
        // Crée l'ID d'entité pour Home Assistant (ex: sensor.voltalis_chambre_amis_power)
        const entityId = `sensor.voltalis_${safeName}_power`;
        // Crée un ID unique interne basé sur l'ID Voltalis
        const uniqueSensorId = `voltalis_power_${appliance.csApplianceId}`; // Non utilisé directement par registerSensor, mais bon à avoir

        console.log(`Registering sensor: ${entityId} for appliance "${appliance.name}" (ID: ${appliance.csApplianceId})`);

        // Définit les attributs pour ce capteur
        const attributes = {
            friendly_name: `${appliance.name} Power`,
            icon: 'mdi:radiator', // ou mdi:flash pour puissance
            unit_of_measurement: 'W',
            device_class: 'power',
            state_class: 'measurement',
            voltalis_appliance_id: appliance.csApplianceId,
            voltalis_modulator_id: appliance.csModulatorId,
            voltalis_status: appliance.status
        };

        try {
            // Appelle la bonne méthode de la classe HomeAssistant
            hass.registerSensor(entityId, attributes); // Ne retourne rien

            // Récupère l'instance du capteur qui vient d'être créée et stockée dans hass.sensors
            const powerSensorInstance = hass.sensors[entityId];

            if (powerSensorInstance instanceof Sensor) {
                // Stocke l'instance récupérée dans notre Map, en utilisant l'ID numérique de l'appareil comme clé
                dynamicSensors.appliancePowerSensors.set(appliance.csApplianceId, powerSensorInstance);
            } else {
                 console.error(`Failed to retrieve registered sensor instance for ${entityId}.`);
            }

        } catch (registerError) {
            console.error(`Error calling hass.registerSensor for ${entityId}:`, registerError);
        }
    });

    console.log("Sensor registration finished.");
    return dynamicSensors; // Retourne la Map contenant les instances de Sensor
};
