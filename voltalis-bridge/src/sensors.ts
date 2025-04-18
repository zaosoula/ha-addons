// sensors.ts (Correction Import Type Sensor)

// Importe HomeAssistant ET le type Sensor (si exporté par le module)
import { HomeAssistant, Sensor } from "./lib/homeassistant";
import { ApplianceInfo } from "./lib/voltalis";

interface DynamicSensors {
    // Utilise le type Sensor importé
    appliancePowerSensors: Map<number, Sensor>; // Utilise l'ID numérique comme clé
}

export const registerSensors = (hass: HomeAssistant, appliances: ApplianceInfo[]): DynamicSensors => {
    console.log(`Registering sensors for ${appliances.length} appliances...`);
    const dynamicSensors: DynamicSensors = {
        appliancePowerSensors: new Map()
    };

    appliances.forEach(appliance => {
        const safeName = appliance.name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_{2,}/g, '_');
        const entityId = `sensor.voltalis_${safeName}_power`;
        const uniqueSensorId = `voltalis_power_${appliance.csApplianceId}`;

        console.log(`Registering sensor: ${entityId} (Unique ID: ${uniqueSensorId}) for appliance "${appliance.name}" (ID: ${appliance.csApplianceId})`);

        try {
            // !! ATTENTION: Si l'erreur TS2339 persiste sur .register,
            // il faut vérifier le nom réel de la méthode dans la classe HomeAssistant de lib/homeassistant.ts !!
            const powerSensor = hass.register(entityId, { // Appel gardé, en espérant que le type Sensor corrige l'inférence
                attributes: {
                    friendly_name: `${appliance.name} Power`,
                    icon: 'mdi:radiator',
                    unit_of_measurement: 'W',
                    device_class: 'power',
                    state_class: 'measurement',
                    voltalis_appliance_id: appliance.csApplianceId,
                    voltalis_modulator_id: appliance.csModulatorId,
                    voltalis_status: appliance.status
                }
            });

            // Vérifie si powerSensor est bien du type attendu (ou au moins non null/undefined)
             if (powerSensor) {
                dynamicSensors.appliancePowerSensors.set(appliance.csApplianceId, powerSensor);
             } else {
                 console.error(`Failed to register sensor for appliance ${appliance.csApplianceId}. 'hass.register' returned invalid value.`);
             }

        } catch (registerError) {
            console.error(`Error calling hass.register for appliance ${appliance.csApplianceId}:`, registerError);
            // Continue avec le prochain appareil si un enregistrement échoue
        }
    });

    console.log("Sensor registration finished.");
    return dynamicSensors;
};
