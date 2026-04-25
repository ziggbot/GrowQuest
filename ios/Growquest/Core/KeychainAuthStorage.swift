import Foundation
import Auth

/// Adapts our `Keychain` wrapper to Supabase's `AuthLocalStorage` protocol.
/// All of Supabase's auth state (access + refresh tokens, expiry, user record)
/// lives in Keychain instead of `UserDefaults`.
struct KeychainAuthStorage: AuthLocalStorage {
    let keychain: Keychain

    func store(key: String, value: Data) throws {
        try keychain.save(value, key: key)
    }

    func retrieve(key: String) throws -> Data? {
        keychain.read(key: key)
    }

    func remove(key: String) throws {
        keychain.delete(key: key)
    }
}
