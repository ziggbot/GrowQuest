import Foundation
import Supabase
import Auth
import AuthenticationServices
import Observation

/// View model for the auth flow. One per AuthView instance — lives only while
/// the user is signed out. Owns transient input + an in-flight task.
@Observable
@MainActor
final class AuthViewModel {
    enum Mode { case signIn, signUp }

    var mode: Mode = .signIn
    var email: String = ""
    var password: String = ""
    var passwordConfirm: String = ""
    var isWorking: Bool = false
    var errorMessage: String?
    var infoMessage: String?

    private var siwaNonce: String?

    var canSubmit: Bool {
        guard !isWorking, email.contains("@"), password.count >= 10 else { return false }
        if mode == .signUp { return password == passwordConfirm }
        return true
    }

    func submit() async {
        guard canSubmit else { return }
        errorMessage = nil
        infoMessage = nil
        isWorking = true
        defer { isWorking = false }

        do {
            switch mode {
            case .signIn:
                try await supabase.auth.signIn(email: email, password: password)
            case .signUp:
                _ = try await supabase.auth.signUp(email: email, password: password)
                infoMessage = "Vi har skickat en bekräftelse till din e-post."
            }
        } catch {
            errorMessage = humanReadable(error)
        }
    }

    func sendPasswordReset() async {
        guard email.contains("@") else {
            errorMessage = "Skriv din e-postadress först."
            return
        }
        errorMessage = nil
        isWorking = true
        defer { isWorking = false }

        do {
            try await supabase.auth.resetPasswordForEmail(email)
            infoMessage = "Återställningslänk skickad till \(email)."
        } catch {
            errorMessage = humanReadable(error)
        }
    }

    // MARK: Sign in with Apple

    /// Configure the request before Apple presents it. Generates a nonce,
    /// hands the SHA256 to Apple, and stashes the raw nonce for later.
    func configureSignInWithApple(_ request: ASAuthorizationAppleIDRequest) {
        let raw = NonceFactory.random()
        siwaNonce = raw
        request.requestedScopes = [.fullName, .email]
        request.nonce = NonceFactory.sha256(raw)
    }

    /// Handle the Apple result: extract the identity token and exchange it
    /// with Supabase for a session. The trigger from migration 0002 then
    /// creates the family + family_members rows on first login.
    func handleSignInWithApple(_ result: Result<ASAuthorization, Error>) async {
        errorMessage = nil
        isWorking = true
        defer { isWorking = false }

        switch result {
        case .failure(let error):
            errorMessage = humanReadable(error)

        case .success(let authorization):
            guard
                let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                let idTokenData = credential.identityToken,
                let idToken = String(data: idTokenData, encoding: .utf8),
                let nonce = siwaNonce
            else {
                errorMessage = "Kunde inte läsa Apple-uppgifterna."
                return
            }

            do {
                try await supabase.auth.signInWithIdToken(
                    credentials: OpenIDConnectCredentials(
                        provider: .apple,
                        idToken: idToken,
                        nonce: nonce
                    )
                )
            } catch {
                errorMessage = humanReadable(error)
            }
        }
    }

    private func humanReadable(_ error: Error) -> String {
        // We map a few common cases to Swedish; the rest fall back to localizedDescription.
        let raw = (error as NSError).localizedDescription
        if raw.localizedCaseInsensitiveContains("invalid login") { return "Fel e-post eller lösenord." }
        if raw.localizedCaseInsensitiveContains("already registered") { return "E-postadressen är redan registrerad." }
        if raw.localizedCaseInsensitiveContains("password") && raw.localizedCaseInsensitiveContains("short") {
            return "Lösenordet måste vara minst 10 tecken."
        }
        return raw
    }
}
