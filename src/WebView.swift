import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {

    private let healthHandler = HealthMessageHandler()

    func makeUIView(
        context: Context
    ) -> WKWebView {

        let configuration = WKWebViewConfiguration()

        let contentController =
            configuration.userContentController

        // Registra il bridge:
        //
        // window.webkit.messageHandlers.avenHealth
        //
        contentController.add(
            healthHandler,
            name: "avenHealth"
        )

        let webView = WKWebView(
            frame: .zero,
            configuration: configuration
        )

        healthHandler.webView = webView

        let url = URL(
            string: "https://giallumigliet.github.io/AVEN/"
        )!

        webView.load(
            URLRequest(url: url)
        )

        return webView
    }

    func updateUIView(
        _ webView: WKWebView,
        context: Context
    ) {
    }
}

