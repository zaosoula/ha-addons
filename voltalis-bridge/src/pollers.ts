import { Voltalis } from "./lib/voltalis";
import { poller } from "./lib/poller"; // Garde l'import du poller existant
import { defer, from, Observable, of } from 'rxjs'; // Importe les opérateurs RxJS nécessaires
import { catchError, map } from 'rxjs/operators'; // Importe les opérateurs pipeables

// Fonction pour enregistrer les pollers
export const registerPollers = (voltalis: Voltalis) => {
  return {
    // Clé 'immediateConsumptionInkW' gardée pour la compatibilité avec index.ts
    immediateConsumptionInkW: poller(
      '*/2 * * * *', // Toutes les 2 minutes
      (): Observable<number | null> => { // La fonction retourne maintenant un Observable<number | null>
        console.log("Poller triggered: fetching immediate consumption...");
        // 'defer' s'assure que l'appel async est fait à chaque fois que le poller s'abonne/exécute
        return defer(() =>
          // 'from' convertit la Promise retournée par fetchImmediateConsumptionInkW en Observable
          from(voltalis.fetchImmediateConsumptionInkW())
        ).pipe(
          // Optionnel : map pour transformer la donnée si besoin (ici, on la garde telle quelle)
          // map(valueInWatts => valueInWatts),

          // Gestion d'erreur DANS l'observable pour que le poller ne s'arrête pas
          catchError(error => {
            console.error("Error during fetchImmediateConsumptionInkW execution in poller:", error instanceof Error ? error.message : error);
            // Retourne un observable qui émet 'null' en cas d'erreur pour ne pas planter la suite
            // Le code dans index.ts devra gérer ce cas 'null' s'il arrive.
            return of(null);
          })
        );
      }
    )
    // Ajoutez d'autres pollers ici si nécessaire pour d'autres données
  };
};
