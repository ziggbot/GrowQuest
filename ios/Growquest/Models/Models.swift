import Foundation

// MARK: - Profile config

enum ProfileId: String, Codable, CaseIterable, Identifiable {
    case stram, balans, fri
    var id: String { rawValue }
}

struct ProfileConfig: Codable, Identifiable {
    let familyId: UUID
    let profileId: ProfileId
    let uppdragMultiplier: Double
    let screenTimeMultiplier: Double
    let dailyLimitMinutes: Int

    var id: UUID { familyId }

    enum CodingKeys: String, CodingKey {
        case familyId = "family_id"
        case profileId = "profile_id"
        case uppdragMultiplier = "uppdrag_multiplier"
        case screenTimeMultiplier = "screen_time_multiplier"
        case dailyLimitMinutes = "daily_limit_minutes"
    }
}

/// Static catalog of the three profiles, mirroring `PROFILER` in design/mockup.jsx.
struct ProfileCatalogEntry: Identifiable {
    let id: ProfileId
    let icon: String
    let namn: String
    let tagline: String
    let beskrivning: String
    let färg: UInt32
    let uppdragMultiplier: Double
    let screenTimeMultiplier: Double
    let dailyLimitMinutes: Int
    let exempelUppdrag: String
    let exempelSkärmtid: String
    let exempelDagsgräns: String
}

enum ProfileCatalog {
    static let all: [ProfileCatalogEntry] = [
        .init(id: .stram, icon: "🛑",
              namn: "Skärmfri start",
              tagline: "Skärmen är ett stort problem hemma",
              beskrivning: "Mynt tjänas långsamt och skärmtid kostar mycket. Barnet behöver verkligen anstränga sig för att förtjäna sin tid.",
              färg: 0xFF6B6B,
              uppdragMultiplier: 0.7, screenTimeMultiplier: 1.6, dailyLimitMinutes: 45,
              exempelUppdrag: "Promenad 20 min → 55 🪙",
              exempelSkärmtid: "30 min Roblox → 128 🪙",
              exempelDagsgräns: "Max 45 min/dag"),
        .init(id: .balans, icon: "⚖️",
              namn: "Balanserad",
              tagline: "Vi vill ha lite mer struktur",
              beskrivning: "Standardinställningar. Barnet tjänar mynt i bra takt och skärmtid kostar ett rättvist pris.",
              färg: 0xA78BFA,
              uppdragMultiplier: 1.0, screenTimeMultiplier: 1.0, dailyLimitMinutes: 90,
              exempelUppdrag: "Promenad 20 min → 80 🪙",
              exempelSkärmtid: "30 min Roblox → 80 🪙",
              exempelDagsgräns: "Max 90 min/dag"),
        .init(id: .fri, icon: "🌿",
              namn: "Fritt barn",
              tagline: "Barnet sköter sig redan bra",
              beskrivning: "Uppdrag ger generöst med mynt och skärmtid är billigare. Fokus på belöning och motivation snarare än begränsning.",
              färg: 0x3DDC84,
              uppdragMultiplier: 1.35, screenTimeMultiplier: 0.65, dailyLimitMinutes: 150,
              exempelUppdrag: "Promenad 20 min → 108 🪙",
              exempelSkärmtid: "30 min Roblox → 52 🪙",
              exempelDagsgräns: "Max 150 min/dag")
    ]

    static func entry(for id: ProfileId) -> ProfileCatalogEntry {
        all.first { $0.id == id } ?? all[1]
    }
}

// MARK: - Children

enum AgeBand: String, Codable, CaseIterable, Identifiable {
    case fourToSix = "4-6"
    case sevenToNine = "7-9"
    case tenToTwelve = "10-12"
    case thirteenPlus = "13+"
    var id: String { rawValue }
}

struct ChildProfile: Codable, Identifiable, Hashable {
    let id: UUID
    let familyId: UUID
    let nickname: String
    let avatarEmoji: String
    let ageBand: AgeBand?

    enum CodingKeys: String, CodingKey {
        case id
        case familyId = "family_id"
        case nickname
        case avatarEmoji = "avatar_emoji"
        case ageBand = "age_band"
    }
}

let AVATARER: [String] = ["🦸","🧙","🐉","🦊","🐺","🦁","🐸","🐼"]

// MARK: - Missions

enum Recurrence: String, Codable, CaseIterable, Identifiable {
    case once, daily, weekly
    var id: String { rawValue }
    var label: String {
        switch self {
        case .once:   return "En gång"
        case .daily:  return "Dagligen"
        case .weekly: return "Varje vecka"
        }
    }
}

struct Mission: Codable, Identifiable, Hashable {
    let id: UUID
    let familyId: UUID
    let title: String
    let description: String?
    let rewardMynt: Int
    let recurrence: Recurrence
    let active: Bool
    let assignedChildId: UUID?

    enum CodingKeys: String, CodingKey {
        case id
        case familyId = "family_id"
        case title
        case description
        case rewardMynt = "reward_mynt"
        case recurrence
        case active
        case assignedChildId = "assigned_child_id"
    }
}

/// Hardcoded starter templates ported from design/mockup.jsx (`uppdrag` example).
struct MissionTemplate: Identifiable, Hashable {
    let id: String
    let title: String
    let description: String
    let icon: String
    let baseRewardMynt: Int
    let recurrence: Recurrence
}

enum MissionTemplates {
    static let all: [MissionTemplate] = [
        .init(id: "drak", title: "Drakarnas Vandring",
              description: "Gå utomhus i 20 minuter",
              icon: "🐉", baseRewardMynt: 80, recurrence: .daily),
        .init(id: "kock", title: "Kockens Lärling",
              description: "Hjälp till att laga mat",
              icon: "🍳", baseRewardMynt: 60, recurrence: .once),
        .init(id: "bok", title: "Bokens Trollkarl",
              description: "Läs i 30 minuter",
              icon: "📚", baseRewardMynt: 70, recurrence: .daily),
        .init(id: "hopp", title: "Hoppande Hjälten",
              description: "Gör 20 stjärnhopp",
              icon: "⚡", baseRewardMynt: 40, recurrence: .daily),
        .init(id: "konst", title: "Konstnärens Resa",
              description: "Rita eller måla något",
              icon: "🎨", baseRewardMynt: 50, recurrence: .once),
        .init(id: "natur", title: "Naturutforskaren",
              description: "Hitta 5 olika växter utomhus",
              icon: "🌿", baseRewardMynt: 90, recurrence: .once),
        .init(id: "bädd", title: "Bädda sängen",
              description: "Bädda din säng på morgonen",
              icon: "🛏", baseRewardMynt: 25, recurrence: .daily),
        .init(id: "disk", title: "Diskmaskinens Vän",
              description: "Töm eller fyll diskmaskinen",
              icon: "🍽", baseRewardMynt: 35, recurrence: .daily)
    ]
}

// MARK: - Submissions + ledger

enum SubmissionStatus: String, Codable {
    case pending, approved, rejected
}

struct MissionSubmission: Codable, Identifiable, Hashable {
    let id: UUID
    let familyId: UUID
    let missionId: UUID
    let childId: UUID
    let submittedAt: Date
    let status: SubmissionStatus
    let reviewedBy: UUID?
    let reviewedAt: Date?
    let note: String?

    enum CodingKeys: String, CodingKey {
        case id
        case familyId = "family_id"
        case missionId = "mission_id"
        case childId = "child_id"
        case submittedAt = "submitted_at"
        case status
        case reviewedBy = "reviewed_by"
        case reviewedAt = "reviewed_at"
        case note
    }
}

struct CoinLedgerEntry: Codable, Identifiable {
    let id: UUID
    let familyId: UUID
    let childId: UUID
    let amountMynt: Int
    let reason: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case familyId = "family_id"
        case childId = "child_id"
        case amountMynt = "amount_mynt"
        case reason
        case createdAt = "created_at"
    }
}

struct ChildBalance: Codable, Identifiable, Hashable {
    let childId: UUID
    let familyId: UUID
    let balance: Int

    var id: UUID { childId }

    enum CodingKeys: String, CodingKey {
        case childId = "child_id"
        case familyId = "family_id"
        case balance
    }
}

// MARK: - Redemptions

struct Redemption: Codable, Identifiable, Hashable {
    let id: UUID
    let familyId: UUID
    let childId: UUID
    let kind: String
    let minutes: Int
    let myntCost: Int
    let startedAt: Date
    let endsAt: Date

    var isActive: Bool { endsAt > Date() }

    var minutesRemaining: Int {
        max(0, Int(endsAt.timeIntervalSinceNow / 60))
    }

    enum CodingKeys: String, CodingKey {
        case id
        case familyId = "family_id"
        case childId = "child_id"
        case kind
        case minutes
        case myntCost = "mynt_cost"
        case startedAt = "started_at"
        case endsAt = "ends_at"
    }
}

/// Predicts the cost for a screen-time redemption client-side, so we can show
/// it in the redeem sheet before calling the RPC. Server is the source of
/// truth — this preview must match the SQL formula in 20260425110000.
enum RedemptionPricing {
    static let baseMyntPer30Min: Double = 80.0

    static func estimatedCost(minutes: Int, multiplier: Double) -> Int {
        Int((((Double(minutes) / 30.0) * baseMyntPer30Min * multiplier) / 5.0).rounded()) * 5
    }
}

// MARK: - Progress (leaderboard + character stages)

struct ChildProgress: Codable, Identifiable, Hashable {
    let childId: UUID
    let familyId: UUID
    let nickname: String
    let avatarEmoji: String
    let myntToday: Int
    let approvedMissions: Int

    var id: UUID { childId }

    enum CodingKeys: String, CodingKey {
        case childId = "child_id"
        case familyId = "family_id"
        case nickname
        case avatarEmoji = "avatar_emoji"
        case myntToday = "mynt_today"
        case approvedMissions = "approved_missions"
    }
}

/// Mirrors KARAKTÄR_STADIER + UPPDRAG_PER_NIVÅ from design/mockup.jsx.
/// Stage = highest threshold ≤ approvedMissions count (cumulative all-time).
struct KaraktärStadium: Identifiable, Hashable {
    let level: Int          // 0…4 — index into the catalog
    let threshold: Int      // approvedMissions needed to reach this stage
    let namn: String
    let beskrivning: String
    let humör: String
    let himmel: (UInt32, UInt32)
    let mark: UInt32
    let accentFärg: UInt32

    var id: Int { level }

    static func == (lhs: KaraktärStadium, rhs: KaraktärStadium) -> Bool {
        lhs.level == rhs.level
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(level)
    }
}

enum KaraktärStadier {
    static let all: [KaraktärStadium] = [
        .init(level: 0, threshold: 0,
              namn: "Soffpotatisen",
              beskrivning: "Sitter och gapar... dags att röra på sig!",
              humör: "trött",
              himmel: (0x1A1A2E, 0x16213E),
              mark: 0x1A1A2E,
              accentFärg: 0x64748B),
        .init(level: 1, threshold: 1,
              namn: "Nyfikna utforskaren",
              beskrivning: "Sitter upprätt och tittar nyfiket ut i världen!",
              humör: "nyfiken",
              himmel: (0x1E2D3D, 0x243447),
              mark: 0x1A2A1A,
              accentFärg: 0x60A5FA),
        .init(level: 2, threshold: 2,
              namn: "Aktiva äventyraren",
              beskrivning: "Står upp med ett leende — rörlig och redo!",
              humör: "aktiv",
              himmel: (0x1A3A2A, 0x1E4D35),
              mark: 0x1A3015,
              accentFärg: 0x3DDC84),
        .init(level: 3, threshold: 4,
              namn: "Snabba löparen",
              beskrivning: "Springer fritt i naturen — full av energi!",
              humör: "energisk",
              himmel: (0x0D3320, 0x1A5030),
              mark: 0x1A3A18,
              accentFärg: 0xF5C842),
        .init(level: 4, threshold: 6,
              namn: "Naturhjälten",
              beskrivning: "Hoppar av glädje — stark, pigg och oslagbar!",
              humör: "euforisk",
              himmel: (0x0A2040, 0x1A3860),
              mark: 0x1A3020,
              accentFärg: 0xF472B6)
    ]

    static func current(for approvedMissions: Int) -> KaraktärStadium {
        all.last { $0.threshold <= approvedMissions } ?? all[0]
    }

    /// Returns the next stage if any, or nil when already at the top.
    static func next(after current: KaraktärStadium) -> KaraktärStadium? {
        all.first { $0.level == current.level + 1 }
    }
}

