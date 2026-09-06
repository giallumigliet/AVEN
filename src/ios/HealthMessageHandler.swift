import Foundation
import WebKit

final class HealthMessageHandler: NSObject, WKScriptMessageHandler {

    private let healthManager = HealthManager()

    weak var webView: WKWebView?

    // MARK: - Receive JavaScript messages
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {

        guard message.name == "avenHealth" else {
            return
        }

        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String,
              let requestId = body["requestId"] as? String else {
            return
        }

        switch action {

        case "requestPermission":
            requestPermission(
                requestId: requestId
            )

        case "getToday":
            getToday(
                requestId: requestId
            )

        default:
            sendError(
                event: "aven-health-result",
                requestId: requestId,
                message: "Azione non riconosciuta."
            )
        }
    }

    // MARK: - Permission
    private func requestPermission(
        requestId: String
    ) {

        Task {

            do {

                try await healthManager.requestAuthorization()

                sendEvent(
                    name: "aven-health-permission",
                    data: [
                        "requestId": requestId,
                        "success": true
                    ]
                )

            } catch {

                sendEvent(
                    name: "aven-health-permission",
                    data: [
                        "requestId": requestId,
                        "success": false,
                        "error": error.localizedDescription
                    ]
                )
            }
        }
    }

    // MARK: - Today's data
    private func getToday(
        requestId: String
    ) {

        Task {

            do {

                let health = try await healthManager.getToday()

                sendEvent(
                    name: "aven-health-result",
                    data: [
                        "requestId": requestId,
                        "success": true,
                        "data": [
                            "steps": health.steps,
                            "distanceKm": health.distanceKm,
                            "date": health.date
                        ]
                    ]
                )

            } catch {

                sendEvent(
                    name: "aven-health-result",
                    data: [
                        "requestId": requestId,
                        "success": false,
                        "error": error.localizedDescription
                    ]
                )
            }
        }
    }

    // MARK: - JavaScript event
    private func sendEvent(
        name: String,
        data: [String: Any]
    ) {

        guard let webView else {
            return
        }

        guard JSONSerialization.isValidJSONObject(data),
              let jsonData = try? JSONSerialization.data(
                withJSONObject: data
              ),
              let jsonString = String(
                data: jsonData,
                encoding: .utf8
              ) else {
            return
        }

        let script = """
        window.dispatchEvent(
            new CustomEvent(
                '\(name)',
                {
                    detail: \(jsonString)
                }
            )
        );
        """

        DispatchQueue.main.async {
            webView.evaluateJavaScript(script)
        }
    }

    private func sendError(
        event: String,
        requestId: String,
        message: String
    ) {

        sendEvent(
            name: event,
            data: [
                "requestId": requestId,
                "success": false,
                "error": message
            ]
        )
    }
}
