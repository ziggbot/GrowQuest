import SwiftUI

/// Top-level router. Switches between the auth flow and the signed-in home
/// based on `Session.state`. Loading state shows a brief spinner so the user
/// never sees a flash of the wrong screen on cold launch.
struct ContentView: View {
    @Environment(Session.self) private var session

    var body: some View {
        ZStack {
            Palette.bg.ignoresSafeArea()

            switch session.state {
            case .loading:
                ProgressView()
                    .tint(Palette.gold)
            case .signedOut:
                AuthView()
                    .transition(.opacity)
            case .signedIn:
                HomeView()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: stateKey)
    }

    private var stateKey: String {
        switch session.state {
        case .loading: return "loading"
        case .signedOut: return "signedOut"
        case .signedIn: return "signedIn"
        }
    }
}

#Preview("Signed out") {
    ContentView().environment(Session())
}
