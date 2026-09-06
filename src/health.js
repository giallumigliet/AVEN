/**
 * AVEN - HealthKit Bridge
 *
 * Questo file NON accede direttamente a Apple Health.
 * Prepara il collegamento tra la web app AVEN e la parte
 * nativa iOS che utilizzerà HealthKit.
 *
 * Funziona anche normalmente da browser:
 * se HealthKit non è disponibile, restituisce un errore
 * controllabile invece di rompere AVEN.
 */

window.AVENHealth = (() => {

    /**
     * Verifica se AVEN è aperto dentro la versione iOS
     * che contiene il bridge nativo HealthKit.
     */
    function isAvailable() {
        return (
            window.webkit &&
            window.webkit.messageHandlers &&
            window.webkit.messageHandlers.avenHealth
        );
    }

    /**
     * Richiede all'app iOS il permesso di leggere:
     * - passi
     * - distanza percorsa
     */
    function requestPermission() {
        return new Promise((resolve, reject) => {

            if (!isAvailable()) {
                reject(
                    new Error(
                        "HealthKit non disponibile: AVEN è aperto nel browser."
                    )
                );
                return;
            }

            const requestId = crypto.randomUUID();

            window.addEventListener(
                `aven-health-permission-${requestId}`,
                (event) => {
                    window.removeEventListener(
                        `aven-health-permission-${requestId}`,
                        arguments.callee
                    );

                    if (event.detail?.success) {
                        resolve(true);
                    } else {
                        reject(
                            new Error(
                                event.detail?.error ||
                                "Permesso HealthKit non concesso."
                            )
                        );
                    }
                },
                { once: true }
            );

            window.webkit.messageHandlers.avenHealth.postMessage({
                action: "requestPermission",
                requestId
            });
        });
    }

    /**
     * Richiede i dati relativi alla giornata corrente.
     *
     * Risultato atteso:
     *
     * {
     *   steps: 8432,
     *   distanceKm: 6.21,
     *   date: "2026-09-06"
     * }
     */
    function getToday() {
        return new Promise((resolve, reject) => {

            if (!isAvailable()) {
                reject(
                    new Error(
                        "HealthKit non disponibile: AVEN è aperto nel browser."
                    )
                );
                return;
            }

            const requestId = crypto.randomUUID();

            function handleResult(event) {
                const data = event.detail;

                if (data?.requestId !== requestId) {
                    return;
                }

                window.removeEventListener(
                    "aven-health-result",
                    handleResult
                );

                if (data.success) {
                    resolve(data.data);
                } else {
                    reject(
                        new Error(
                            data.error ||
                            "Impossibile leggere i dati HealthKit."
                        )
                    );
                }
            }

            window.addEventListener(
                "aven-health-result",
                handleResult
            );

            window.webkit.messageHandlers.avenHealth.postMessage({
                action: "getToday",
                requestId
            });
        });
    }

    /**
     * Funzione comoda:
     * chiede i dati e restituisce un oggetto pronto
     * per essere salvato su Firebase.
     */
    async function syncToday() {

        const health = await getToday();

        return {
            steps: health.steps ?? 0,
            distanceKm: health.distanceKm ?? 0,
            date: health.date,
            source: "apple-health"
        };
    }

    return {
        isAvailable,
        requestPermission,
        getToday,
        syncToday
    };

})();
