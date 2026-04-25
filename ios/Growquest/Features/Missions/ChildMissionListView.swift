import SwiftUI

@Observable
@MainActor
final class ChildMissionsViewModel {
    var missions: [Mission] = []
    var pendingForToday: Set<UUID> = []   // mission_id values already submitted today
    var isLoading: Bool = false
    var errorMessage: String?
    var lastSuccess: String?

    let familyId: UUID
    let child: ChildProfile

    init(familyId: UUID, child: ChildProfile) {
        self.familyId = familyId
        self.child = child
    }

    func reload() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let allMissions: [Mission] = try await supabase
                .from("missions")
                .select()
                .eq("family_id", value: familyId)
                .eq("active", value: true)
                .order("created_at", ascending: false)
                .execute()
                .value

            missions = allMissions

            // Find today's submissions (any status) so we don't allow double-submit on dailies.
            let cal = Calendar(identifier: .iso8601)
            let startOfToday = cal.startOfDay(for: Date())
            let iso = ISO8601DateFormatter()
            iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            let startStr = iso.string(from: startOfToday)

            let todays: [MissionSubmission] = try await supabase
                .from("mission_submissions")
                .select()
                .eq("child_id", value: child.id)
                .gte("submitted_at", value: startStr)
                .execute()
                .value

            pendingForToday = Set(todays.map(\.missionId))
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }

    func submit(_ mission: Mission) async {
        guard !pendingForToday.contains(mission.id) else { return }
        errorMessage = nil
        lastSuccess = nil

        struct InsertRow: Encodable {
            let familyId: UUID
            let missionId: UUID
            let childId: UUID

            enum CodingKeys: String, CodingKey {
                case familyId = "family_id"
                case missionId = "mission_id"
                case childId = "child_id"
            }
        }

        let row = InsertRow(familyId: familyId, missionId: mission.id, childId: child.id)
        do {
            try await supabase.from("mission_submissions").insert(row).execute()
            pendingForToday.insert(mission.id)
            lastSuccess = "Skickat in! Väntar på förälder."
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }
}

struct ChildMissionListView: View {
    @State var viewModel: ChildMissionsViewModel

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                header
                if viewModel.missions.isEmpty {
                    Kort {
                        Text("Inga uppdrag idag. Be en förälder skapa ett!")
                            .foregroundStyle(Palette.muted)
                            .multilineTextAlignment(.center)
                            .padding(.vertical, 12)
                            .frame(maxWidth: .infinity)
                    }
                } else {
                    ForEach(viewModel.missions) { mission in
                        MissionRow(
                            mission: mission,
                            isSubmitted: viewModel.pendingForToday.contains(mission.id),
                            onTap: { Task { await viewModel.submit(mission) } }
                        )
                    }
                }
                if let s = viewModel.lastSuccess {
                    Text(s).foregroundStyle(Palette.green).font(.footnote)
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

    private var header: some View {
        HStack(spacing: 10) {
            Text(viewModel.child.avatarEmoji).font(.system(size: 36))
            VStack(alignment: .leading, spacing: 2) {
                Text("Hej \(viewModel.child.nickname)!")
                    .font(.system(size: 22, weight: .heavy, design: .rounded))
                    .foregroundStyle(Palette.text)
                Text("Dagens uppdrag")
                    .font(.caption)
                    .foregroundStyle(Palette.muted)
            }
            Spacer()
        }
    }
}

private struct MissionRow: View {
    let mission: Mission
    let isSubmitted: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                Text("🎯").font(.system(size: 28))
                VStack(alignment: .leading, spacing: 2) {
                    Text(mission.title)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .foregroundStyle(Palette.text)
                    if let desc = mission.description, !desc.isEmpty {
                        Text(desc).font(.caption).foregroundStyle(Palette.muted)
                    }
                }
                Spacer()
                Pill("\(mission.rewardMynt) 🪙", tint: Palette.gold)
                if isSubmitted {
                    Pill("Inskickat", icon: "⏳", tint: Palette.purple)
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
        .buttonStyle(.plain)
        .disabled(isSubmitted)
        .opacity(isSubmitted ? 0.7 : 1)
    }
}
