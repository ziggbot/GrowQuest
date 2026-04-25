import Foundation
import CryptoKit

/// Helpers for the Sign-in-with-Apple nonce flow.
/// Apple requires a SHA256 nonce on the auth request; Supabase's verifier
/// re-hashes the raw nonce we hand it and matches it against Apple's response.
enum NonceFactory {
    /// Cryptographically random alphanumeric nonce. 32 chars is plenty.
    static func random(length: Int = 32) -> String {
        precondition(length > 0)
        let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        result.reserveCapacity(length)
        var remaining = length

        while remaining > 0 {
            var random: UInt8 = 0
            let status = withUnsafeMutableBytes(of: &random) { buf in
                SecRandomCopyBytes(kSecRandomDefault, 1, buf.baseAddress!)
            }
            guard status == errSecSuccess else {
                fatalError("Unable to generate secure random bytes (status \(status))")
            }
            if random < charset.count {
                result.append(charset[Int(random) % charset.count])
                remaining -= 1
            }
        }
        return result
    }

    /// SHA256 hex digest of `input`, lowercase, no separators.
    static func sha256(_ input: String) -> String {
        let digest = SHA256.hash(data: Data(input.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}
