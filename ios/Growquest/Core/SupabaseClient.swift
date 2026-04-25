import Foundation
import Supabase
import Auth

/// Single Supabase client for the app. URL + anon key come from Info.plist
/// (populated by xcconfig from `.env`). Auth state persists in Keychain.
enum SupabaseEnvironment {
    static let url: URL = {
        guard let raw = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
              let url = URL(string: raw) else {
            fatalError("SUPABASE_URL missing from Info.plist — see ios/README.md")
        }
        return url
    }()

    static let anonKey: String = {
        guard let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
              !key.isEmpty else {
            fatalError("SUPABASE_ANON_KEY missing from Info.plist — see ios/README.md")
        }
        return key
    }()
}

let supabase: SupabaseClient = {
    let keychain = Keychain(service: Bundle.main.bundleIdentifier ?? "com.growquest.app")
    let storage = KeychainAuthStorage(keychain: keychain)
    return SupabaseClient(
        supabaseURL: SupabaseEnvironment.url,
        supabaseKey: SupabaseEnvironment.anonKey,
        options: SupabaseClientOptions(
            auth: SupabaseClientOptions.AuthOptions(
                storage: storage,
                autoRefreshToken: true
            )
        )
    )
}()
