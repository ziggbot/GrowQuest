import SwiftUI

@main
struct GrowquestApp: App {
    @State private var session = Session()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(session)
                .preferredColorScheme(.dark)
                .task { await session.bootstrap() }
        }
    }
}
