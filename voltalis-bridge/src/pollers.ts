// pollers.ts (Correction Appel Méthode)

import { Voltalis, ApplianceRealtimePower } from "./lib/voltalis";
import { poller } from "./lib/poller";
// Assurez-vous que rxjs est bien installé: yarn add rxjs
import { defer, from, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const registerPollers = (voltalis: Voltalis) => {
  return {
    appliancesRealtimePower: poller(
      '*/2 * * * *', // Toutes les 2 minutes
      // La fonction appelle maintenant fetchAppliancesRealtimePower
      (): Observable<ApplianceRealtimePower[] | null> => {
        console.log("Poller triggered: fetching real-time appliance power...");
        return defer(() =>
          // Appelle la bonne méthode qui retourne Promise<ApplianceRealtimePower[]>
          from(voltalis.fetchAppliancesRealtimePower()) // CORRECTION ICI
        ).pipe(
          catchError(error => {
            console.error("Error during fetchAppliancesRealtimePower execution in poller:", error instanceof Error ? error.message : error);
            // Retourne null en cas d'erreur
            return of(null); // Le type est correct: Observable<null> est assignable à Observable<T[] | null>
          })
        );
      }
    )
  };
};
