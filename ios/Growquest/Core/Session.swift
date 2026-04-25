import Foundation
import Supabase
import Auth
import Observation

/// App-wide auth/session state. Owns one long-running task that subscribes to
/// Supabase auth state changes, hydrates the user's `family_id`, and exposes a
/// minimal `State` for the rest of the app to react to.
@Observable
@MainActor
final class Session {
    enum State: Equatable {
        case loading
        case signedOut
        case signedIn(userId: UUID, familyId: UUID?)
    }

    private(set) var state: State = .loading

    private var stateTask: Task<Void, Never>?

    /// Start listening to auth state changes. Called once from the app entry point.
    func bootstrap() async {
        stateTask?.cancel()
        stateTask = Task { [weak self] in
            for await (_, session) in await supabase.auth.authStateChanges {
                await self?.apply(authSession: session)
            }
        }
    }

    func signOut() async {
        do {
            try await supabase.auth.signOut()
        } catch {
            // We still flip to signedOut: any local session is invalidated
            // and the next refresh will fail. Surfacing the error here would
            // confuse the user — the sign-out completes from their POV.
        }
        state = .signedOut
    }

    private func apply(authSession: Auth.Session?) async {
        guard let authSession else {
            state = .signedOut
            return
        }
        let userId = authSession.user.id
        let familyId = await fetchFamilyId(for: userId)
        state = .signedIn(userId: userId, familyId: familyId)
    }

    private func fetchFamilyId(for userId: UUID) async -> UUID? {
        do {
            let row: FamilyMembershipRow = try await supabase
                .from("family_members")
                .select("family_id")
                .eq("user_id", value: userId)
                .limit(1)
                .single()
                .execute()
                .value
            return row.familyId
        } catch {
            // Trigger races (auth.users insert → trigger fires → row visible)
            // can briefly return zero rows. The next authStateChanges tick
            // (e.g. token refresh) will retry.
            return nil
        }
    }
}

private struct FamilyMembershipRow: Decodable {
    let familyId: UUID

    enum CodingKeys: String, CodingKey {
        case familyId = "family_id"
    }
}
