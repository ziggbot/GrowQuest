import SwiftUI
import Supabase

@Observable
@MainActor
final class LeaderboardViewModel {
    var rows: [ChildProgress] = []
    var isLoading: Bool = false
    var errorMessage: String?

    let familyId: UUID

    init(familyId: UUID) { self.familyId = familyId }

    func reload() async {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil

        do {
            let progress: [ChildProgress] = try await supabase
                .from("child_progress")
                .select()
                .eq("family_id", value: familyId)
                .order("mynt_today", ascending: false)
                .execute()
                .value
            rows = progress
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }
}

struct LeaderboardView: View {
    @State var viewModel: LeaderboardViewModel

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Kort {
                    VStack(spacing: 4) {
                        Text("🏆")
                            .font(.system(size: 36))
                        Text("Superäventyrare")
                            .font(.system(size: 22, weight: .heavy, design: .rounded))
                            .foregroundStyle(Palette.gold)
                        Text("Mest mynt idag")
                            .font(.caption)
                            .foregroundStyle(Palette.muted)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 4)
                }

                if viewModel.rows.isEmpty && !viewModel.isLoading {
                    Kort {
                        Text("Inga barn än. Lägg till ett barn för att starta tävlingen!")
                            .foregroundStyle(Palette.muted)
                            .multilineTextAlignment(.center)
                            .padding(.vertical, 16)
                            .frame(maxWidth: .infinity)
                    }
                }

                ForEach(Array(viewModel.rows.enumerated()), id: \.element.id) { index, row in
                    LeaderboardRow(rank: index + 1, progress: row)
                }

                if let e = viewModel.errorMessage {
                    Text(e).foregroundStyle(Palette.red).font(.footnote)
                }
            }
            .padding(16)
        }
        .background(Palette.bg.ignoresSafeArea())
        .task { await viewModel.reload() }
        .refreshable { await viewModel.reload() }
    }
}

private struct LeaderboardRow: View {
    let rank: Int
    let progress: ChildProgress

    private var rankBadge: String {
        switch rank {
        case 1: return "🥇"
        case 2: return "🥈"
        case 3: return "🥉"
        default: return "\(rank)"
        }
    }

    private var rankTint: Color {
        switch rank {
        case 1: return Palette.gold
        case 2: return Color(hex: 0xC0C0C0)
        case 3: return Color(hex: 0xCD7F32)
        default: return Palette.muted
        }
    }

    var body: some View {
        let stadium = KaraktärStadier.current(for: progress.approvedMissions)
        Kort {
            HStack(spacing: 12) {
                Text(rankBadge)
                    .font(.system(size: 26, weight: .heavy, design: .rounded))
                    .foregroundStyle(rankTint)
                    .frame(width: 38)
                Text(progress.avatarEmoji).font(.system(size: 32))
                VStack(alignment: .leading, spacing: 2) {
                    Text(progress.nickname)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .foregroundStyle(Palette.text)
                    Text(stadium.namn)
                        .font(.caption)
                        .foregroundStyle(Color(hex: stadium.accentFärg))
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(progress.myntToday) 🪙")
                        .font(.system(size: 18, weight: .heavy, design: .rounded))
                        .foregroundStyle(Palette.gold)
                    Text("idag")
                        .font(.caption2)
                        .foregroundStyle(Palette.muted)
                }
            }
        }
    }
}
