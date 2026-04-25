import SwiftUI
import Supabase

@Observable
@MainActor
final class ApprovalQueueViewModel {
    struct Item: Identifiable, Hashable {
        let id: UUID
        let submission: MissionSubmission
        let mission: Mission
        let child: ChildProfile
    }

    var items: [Item] = []
    var isLoading: Bool = false
    var errorMessage: String?
    var lastResult: String?

    let familyId: UUID

    init(familyId: UUID) { self.familyId = familyId }

    func reload() async {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil

        do {
            // Fetch in parallel: pending submissions + missions + children — small lists, simpler than a server-side join.
            async let subs: [MissionSubmission] = supabase
                .from("mission_submissions")
                .select()
                .eq("family_id", value: familyId)
                .eq("status", value: "pending")
                .order("submitted_at", ascending: true)
                .execute()
                .value
            async let missions: [Mission] = supabase
                .from("missions")
                .select()
                .eq("family_id", value: familyId)
                .execute()
                .value
            async let children: [ChildProfile] = supabase
                .from("child_profiles")
                .select()
                .eq("family_id", value: familyId)
                .execute()
                .value

            let (s, m, c) = try await (subs, missions, children)
            let mDict = Dictionary(uniqueKeysWithValues: m.map { ($0.id, $0) })
            let cDict = Dictionary(uniqueKeysWithValues: c.map { ($0.id, $0) })

            items = s.compactMap { sub in
                guard let mi = mDict[sub.missionId], let ch = cDict[sub.childId] else { return nil }
                return Item(id: sub.id, submission: sub, mission: mi, child: ch)
            }
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }

    func review(_ item: Item, action: String, note: String? = nil) async {
        errorMessage = nil
        lastResult = nil

        struct Params: Encodable {
            let pSubmissionId: UUID
            let pAction: String
            let pNote: String?

            enum CodingKeys: String, CodingKey {
                case pSubmissionId = "p_submission_id"
                case pAction = "p_action"
                case pNote = "p_note"
            }
        }

        do {
            try await supabase
                .rpc("approve_mission",
                     params: Params(pSubmissionId: item.id, pAction: action, pNote: note))
                .execute()
            items.removeAll { $0.id == item.id }
            lastResult = action == "approve" ? "Godkänt — mynt utdelade." : "Avvisat."
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }
}

struct ApprovalQueueView: View {
    @State var viewModel: ApprovalQueueViewModel

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if viewModel.items.isEmpty && !viewModel.isLoading {
                    Kort {
                        Text("Inga uppdrag att granska just nu.")
                            .foregroundStyle(Palette.muted)
                            .multilineTextAlignment(.center)
                            .padding(.vertical, 20)
                            .frame(maxWidth: .infinity)
                    }
                }

                ForEach(viewModel.items) { item in
                    ApprovalRow(
                        item: item,
                        onApprove: { Task { await viewModel.review(item, action: "approve") } },
                        onReject: { Task { await viewModel.review(item, action: "reject") } }
                    )
                }

                if let s = viewModel.lastResult {
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
}

private struct ApprovalRow: View {
    let item: ApprovalQueueViewModel.Item
    let onApprove: () -> Void
    let onReject: () -> Void

    var body: some View {
        Kort {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 10) {
                    Text(item.child.avatarEmoji).font(.system(size: 28))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.child.nickname)
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundStyle(Palette.text)
                        Text(item.mission.title)
                            .font(.callout)
                            .foregroundStyle(Palette.text)
                    }
                    Spacer()
                    Pill("\(item.mission.rewardMynt) 🪙", tint: Palette.gold)
                }
                if let desc = item.mission.description, !desc.isEmpty {
                    Text(desc).font(.caption).foregroundStyle(Palette.muted)
                }
                HStack(spacing: 10) {
                    Knapp(title: "Avvisa", style: .secondary, action: onReject)
                    Knapp(title: "Godkänn", style: .primary, action: onApprove)
                }
            }
        }
    }
}
