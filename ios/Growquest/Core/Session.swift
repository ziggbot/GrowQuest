import Foundation
import Observation

/// App-wide auth/session state. Phase 0: stub only.
/// Phase 1 wires this to `supabase.auth` and persists tokens via Keychain.
@Observable
final class Session {
    enum State {
        case loading
        case signedOut
        case signedIn(userId: UUID, familyId: UUID?)
    }

    private(set) var state: State = .loading

    func bootstrap() async {
        // Phase 1: read refresh token from Keychain, hydrate auth.user, fetch family_id.
        state = .signedOut
    }

    func signOut() async {
        // Phase 1: supabase.auth.signOut + Keychain.clear.
        state = .signedOut
    }
}
