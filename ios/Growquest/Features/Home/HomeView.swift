import SwiftUI

/// Placeholder home screen for the signed-in state. Phase 1 only proves the
/// auth + family bootstrap loop end-to-end; the real home (mockup) is wired
/// up in Phase 2 alongside missions.
struct HomeView: View {
    @Environment(Session.self) private var session

    var body: some View {
        ZStack {
            Palette.bg.ignoresSafeArea()

            VStack(spacing: 20) {
                Text("Välkommen till GrowQuest")
                    .font(.system(size: 26, weight: .heavy, design: .rounded))
                    .foregroundStyle(Palette.text)

                if case .signedIn(_, let familyId) = session.state {
                    Pill(familyId.map { "Familj: \($0.uuidString.prefix(8))…" } ?? "Familj: laddar…",
                         icon: "👪",
                         tint: Palette.purple)
                }

                Text("Phase 1 — auth fungerar. Nästa: lägga till barn och uppdrag.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Palette.muted)
                    .font(.footnote)
                    .padding(.horizontal, 32)

                Knapp(title: "Logga ut", style: .secondary) {
                    Task { await session.signOut() }
                }
                .padding(.horizontal, 40)
            }
            .padding()
        }
    }
}
