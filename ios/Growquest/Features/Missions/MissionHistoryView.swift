import SwiftUI
import Supabase

struct HistoryEntry: Identifiable {
    let id: UUID
    let missionTitle: String
    let rewardMynt: Int
    let status: SubmissionStatus
    let date: Date
}

@Observable
@MainActor
final class MissionHistoryViewModel {
    var entries: [HistoryEntry] = []
    var isLoading: Bool = false
    var errorMessage: String?

    let familyId: UUID
    let child: ChildProfile

    init(familyId: UUID, child: ChildProfile) {
        self.familyId = familyId
        self.child = child
    }

    func reload() async {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil

        do {
            // Fetch submissions with embedded mission data
            struct SubWithMission: Decodable {
                let id: UUID
                let status: SubmissionStatus
                let submittedAt: Date
                let reviewedAt: Date?
                let missions: MissionInfo

                struct MissionInfo: Decodable {
                    let title: String
                    let rewardMynt: Int

                    enum CodingKeys: String, CodingKey {
                        case title
                        case rewardMynt = "reward_mynt"
                    }
                }

                enum CodingKeys: String, CodingKey {
                    case id
                    case status
                    case submittedAt = "submitted_at"
                    case reviewedAt = "reviewed_at"
                    case missions
                }
            }

            let subs: [SubWithMission] = try await supabase
                .from("mission_submissions")
                .select("id, status, submitted_at, reviewed_at, missions(title, reward_mynt)")
                .eq("family_id", value: familyId)
                .eq("child_id", value: child.id)
                .in("status", values: ["approved", "rejected"])
                .order("submitted_at", ascending: false)
                .limit(100)
                .execute()
                .value

            entries = subs.map { sub in
                HistoryEntry(
                    id: sub.id,
                    missionTitle: sub.missions.title,
                    rewardMynt: sub.missions.rewardMynt,
                    status: sub.status,
                    date: sub.reviewedAt ?? sub.submittedAt
                )
            }
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }
}

struct MissionHistoryView: View {
    @Environment(\.dismiss) private var dismiss
    @State var viewModel: MissionHistoryViewModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 10) {
                    if viewModel.isLoading {
                        ProgressView().padding(.top, 40)
                    } else if viewModel.entries.isEmpty {
                        Text("Inga avklarade uppdrag ännu.")
                            .foregroundStyle(Palette.muted)
                            .padding(.top, 40)
                    } else {
                        ForEach(viewModel.entries) { entry in
                            entryRow(entry)
                        }
                    }
                    if let err = viewModel.errorMessage {
                        Text(err).foregroundStyle(Palette.red).font(.footnote)
                    }
                }
                .padding(16)
            }
            .background(Palette.bg.ignoresSafeArea())
            .navigationTitle("\(viewModel.child.avatarEmoji) Historik")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Stäng") { dismiss() }.tint(Palette.muted)
                }
            }
            .task { await viewModel.reload() }
            .refreshable { await viewModel.reload() }
        }
    }

    private func entryRow(_ entry: HistoryEntry) -> some View {
        HStack(spacing: 12) {
            Text(entry.status == .approved ? "✅" : "❌")
                .font(.system(size: 22))
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.missionTitle)
                    .font(.callout.weight(.semibold))
                    .foregroundStyle(Palette.text)
                Text(entry.date.formatted(.dateTime.day().month()))
                    .font(.caption)
                    .foregroundStyle(Palette.muted)
            }
            Spacer()
            if entry.status == .approved {
                Pill("+\(entry.rewardMynt) 🪙", tint: Palette.gold)
            } else {
                Pill("Nekad", tint: Palette.red)
            }
        }
        .padding(14)
        .background(Palette.surface)
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Palette.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}
