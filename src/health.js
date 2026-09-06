/**
 * AVEN - HealthKit bridge
 *
 * Questo modulo gestisce la comunicazione tra AVEN Web
 * e la parte nativa iOS che, in futuro, parlerà con HealthKit.
 *
 * In un normale browser (PC, Safari, GitHub Pages) HealthKit
 * non è disponibile: le funzioni restituiscono un errore.
 *
 * In AVEN iOS, il codice Swift registrerà il message handler:
 *
 * window.webkit.messageHandlers.avenHealth
 */



/** Controlla se AVEN sta girando dentro una WebView iOS che espone il bridge HealthKit.*/
export function isHealthKitAvailable() {
    return Boolean(
        window.webkit?.messageHandlers?.avenHealth
    );
}

/**Richiede all'app iOS il permesso di leggere i dati di salute necessari ad AVEN.
 * Sarà il codice Swift a gestire realmente la richiesta dei permessi HealthKit.*/
export function requestHealthPermission() {
    return new Promise((resolve, reject) => {

        if (!isHealthKitAvailable()) {
            reject(
                new Error(
                    "HealthKit non disponibile in questo ambiente."
                )
            );
            return;
        }

        const requestId = crypto.randomUUID();

        function handlePermission(event) {
            const data = event.detail;

            if (data?.requestId !== requestId) {
                return;
            }

            window.removeEventListener(
                "aven-health-permission",
                handlePermission
            );

            if (data.success) {
                resolve(true);
            } else {
                reject(
                    new Error(
                        data.error ||
                        "Permesso HealthKit non concesso."
                    )
                );
            }
        }

        window.addEventListener(
            "aven-health-permission",
            handlePermission
        );

        window.webkit.messageHandlers.avenHealth.postMessage({
            action: "requestPermission",
            requestId
        });
    });
}

/**Recupera i dati della giornata corrente.
 * Risultato previsto:
 * {
 *     steps: 8432,
 *     distanceKm: 6.21,
 *     date: "2026-09-06"
 * }
 * Sarà il codice Swift a interrogare HealthKit e a restituire questi valori.*/
export function getTodayHealth() {
    return new Promise((resolve, reject) => {

        if (!isHealthKitAvailable()) {
            reject(
                new Error(
                    "HealthKit non disponibile in questo ambiente."
                )
            );
            return;
        }

        const requestId = crypto.randomUUID();

        function handleHealthResult(event) {
            const data = event.detail;

            if (data?.requestId !== requestId) {
                return;
            }

            window.removeEventListener(
                "aven-health-result",
                handleHealthResult
            );

            if (data.success) {
                resolve(data.data);
            } else {
                reject(
                    new Error(
                        data.error ||
                        "Impossibile recuperare i dati HealthKit."
                    )
                );
            }
        }

        window.addEventListener(
            "aven-health-result",
            handleHealthResult
        );

        window.webkit.messageHandlers.avenHealth.postMessage({
            action: "getToday",
            requestId
        });
    });
}

/**Recupera i dati di oggi e li prepara nel formato che AVEN potrà eventualmente salvare su Firebase. */
export async function syncTodayHealth() {

    const health = await getTodayHealth();

    return {
        date: health.date,
        steps: health.steps ?? 0,
        distanceKm: health.distanceKm ?? 0,
        source: "apple-health"
    };
}
