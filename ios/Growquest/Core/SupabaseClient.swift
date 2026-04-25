import Foundation
import Supabase

/// Single Supabase client for the app. Reads URL + anon key from Info.plist
/// (which xcconfig populates from `.env`). Service-role key MUST NOT be present.
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

let supabase = SupabaseClient(
    supabaseURL: SupabaseEnvironment.url,
    supabaseKey: SupabaseEnvironment.anonKey
)
