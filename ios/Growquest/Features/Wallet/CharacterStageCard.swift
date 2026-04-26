import SwiftUI

/// Visualizes the child's current Karaktär-stadium (issue #12).
/// Background is the stadium's `himmel` gradient; the accent color
/// borrows from `accentFärg`. Shown on top of WalletView and as
/// a small inline pill on home dashboards.
struct CharacterStageCard: View {
    let stadium: KaraktärStadium
    let approvedMissions: Int

    var body: some View {
        let himmelTop = Color(hex: stadium.himmel.0)
        let himmelBot = Color(hex: stadium.himmel.1)
        let accent = Color(hex: stadium.accentFärg)
        let next = KaraktärStadier.next(after: stadium)

        ZStack(alignment: .bottom) {
            LinearGradient(colors: [himmelTop, himmelBot],
                           startPoint: .top, endPoint: .bottom)

            // Ground strip
            Rectangle()
                .fill(Color(hex: stadium.mark))
                .frame(height: 28)

            VStack(spacing: 4) {
                Text(stadium.namn)
                    .font(.system(size: 18, weight: .heavy, design: .rounded))
                    .foregroundStyle(accent)
                Text(stadium.beskrivning)
                    .font(.caption)
                    .foregroundStyle(Palette.text)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 12)
                if let next {
                    let needed = max(0, next.threshold - approvedMissions)
                    Text(needed > 0
                         ? "Nästa nivå om \(needed) godkända uppdrag"
                         : "Du har nått en ny nivå!")
                        .font(.caption2)
                        .foregroundStyle(Palette.muted)
                } else {
                    Text("🎉 Toppnivå nådd!")
                        .font(.caption2)
                        .foregroundStyle(accent)
                }
            }
            .padding(.vertical, 12)
            .padding(.bottom, 28) // sit above the ground strip
            .frame(maxWidth: .infinity)
        }
        .frame(height: 130)
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(accent.opacity(0.4), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}
