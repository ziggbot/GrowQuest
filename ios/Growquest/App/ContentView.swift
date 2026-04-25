import SwiftUI

struct ContentView: View {
    @Environment(Session.self) private var session

    var body: some View {
        ZStack {
            Palette.bg.ignoresSafeArea()

            VStack(spacing: 24) {
                Text("GrowQuest")
                    .font(.system(size: 36, weight: .heavy, design: .rounded))
                    .foregroundStyle(Palette.gold)

                Text("Phase 0 scaffold")
                    .font(.callout)
                    .foregroundStyle(Palette.muted)

                Knapp(title: "Kom igång", style: .primary) {
                    // Phase 1 wires this to onboarding.
                }
            }
            .padding()
        }
    }
}

#Preview {
    ContentView()
        .environment(Session())
}
