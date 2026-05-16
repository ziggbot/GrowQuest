import Foundation
import Supabase

struct ParentMissionRow: Identifiable {
    var id: UUID { mission.id }
    let mission: Mission
    let status: SubmissionStatus?
}

@Observable
@MainActor
final class ParentMissionsViewModel {
    private var missions: [Mission] = []
    private var submissionsByChildAndMission: [UUID: [UUID: SubmissionStatus]] = [:]

    let familyId: UUID

    init(familyId: UUID) {
        self.familyId = familyId
    }

    func reload(children: [ChildProfile], missions: [Mission]) async {
        self.missions = missions

        guard !children.isEmpty, !missions.isEmpty else {
            submissionsByChildAndMission = [:]
            return
        }

        let cal = Calendar(identifier: .iso8601)
        let startOfToday = cal.startOfDay(for: Date())
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let startStr = iso.string(from: startOfToday)

        do {
            let subs: [MissionSubmission] = try await supabase
                .from("mission_submissions")
                .select()
                .eq("family_id", value: familyId)
                .gte("submitted_at", value: startStr)
                .execute()
                .value

            var map: [UUID: [UUID: SubmissionStatus]] = [:]
            for sub in subs {
                if map[sub.childId] == nil { map[sub.childId] = [:] }
                let existing = map[sub.childId]?[sub.missionId]
                // Prefer approved > pending > rejected when multiple submissions exist
                if existing == nil || existing == .rejected
                    || (existing == .pending && sub.status == .approved) {
                    map[sub.childId]?[sub.missionId] = sub.status
                }
            }
            submissionsByChildAndMission = map
        } catch {
            // Non-fatal; parent can pull-to-refresh to retry
        }
    }

    /// Missions explicitly assigned to this child.
    func rows(for child: ChildProfile) -> [ParentMissionRow] {
        missions
            .filter { $0.assignedChildId == child.id }
            .map { mission in
                ParentMissionRow(
                    mission: mission,
                    status: submissionsByChildAndMission[child.id]?[mission.id]
                )
            }
    }

    /// Missions with no specific child assignment (broadcast to all).
    func broadcastRows() -> [ParentMissionRow] {
        missions
            .filter { $0.assignedChildId == nil }
            .map { ParentMissionRow(mission: $0, status: nil) }
    }
}
