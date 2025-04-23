// pollers.ts (Correction Appel Méthode v2)

import { Voltalis, ApplianceRealtimePower } from "./lib/voltalis";
import { poller } from "./lib/poller";
import { defer, from, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const registerPollers = (voltalis: Voltalis) => {
  return {
    appliancesRealtimePower: poller(
      '*/2 * * * *', // Intervalle de polling
      (): Observable<ApplianceRealtimePower[] | null> => {
        console.log("Poller triggered: fetching latest daily appliance consumption...");
        return defer(() =>
          // Utilise le nom de méthode correct: fetchAppliancesDayConsumption
          from(voltalis.fetchAppliancesDayConsumption()) // CORRECTION ICI
        ).pipe(
          catchError((error: unknown) => { // Type explicite pour l'erreur
            console.error("Error during fetchAppliancesDayConsumption execution in poller:", error instanceof Error ? error.message : error);
            // Retourne null en cas d'erreur
            return of(null);
          })
        );
      }
    )
  };
};
