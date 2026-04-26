import SwiftUI
import Supabase

@Observable
@MainActor
final class WalletViewModel {
    var balance: Int = 0
    var entries: [CoinLedgerEntry] = []
    var activeRedemption: Redemption?
    var minutesUsedToday: Int = 0
    var isLoading: Bool = false
    var errorMessage: String?

    let child: ChildProfile
    let profileConfig: ProfileConfig?

    init(child: ChildProfile, profileConfig: ProfileConfig? = nil) {
        self.child = child
        self.profileConfig = profileConfig
    }

    func reload() async {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil

        do {
            let bal: ChildBalance? = try await supabase
                .from("child_balances")
                .select()
                .eq("child_id", value: child.id)
                .limit(1)
                .single()
                .execute()
                .value
            balance = Int(bal?.balance ?? 0)

            entries = try await supabase
                .from("coin_ledger")
                .select()
                .eq("child_id", value: child.id)
                .order("created_at", ascending: false)
                .limit(20)
                .execute()
                .value

            let cal = Calendar(identifier: .iso8601)
            let startOfToday = cal.startOfDay(for: Date())
            let iso = ISO8601DateFormatter()
            iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            let startStr = iso.string(from: startOfToday)

            let todays: [Redemption] = try await supabase
                .from("redemptions")
                .select()
                .eq("child_id", value: child.id)
                .gte("started_at", value: startStr)
                .order("started_at", ascending: false)
                .execute()
                .value

            minutesUsedToday = todays.reduce(0) { $0 + $1.minutes }
            activeRedemption = todays.first(where: \.isActive)
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }
}

struct WalletView: View {
    @State var viewModel: WalletViewModel
    @State private var showRedeem = false

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                Kort {
                    VStack(spacing: 6) {
                        Text(viewModel.child.avatarEmoji).font(.system(size: 36))
                        Text(viewModel.child.nickname)
                            .font(.headline)
                            .foregroundStyle(Palette.text)
                        Text("\(viewModel.balance) 🪙")
                            .font(.system(size: 40, weight: .heavy, design: .rounded))
                            .foregroundStyle(Palette.gold)
                            .padding(.top, 4)
                    }
                    .frame(maxWidth: .infinity)
                }

                if let active = viewModel.activeRedemption {
                    Kort {
                        HStack(spacing: 12) {
                            Text("🔓").font(.system(size: 28))
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Skärmtid upplåst")
                                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                                    .foregroundStyle(Palette.purple)
                                Text("\(active.minutesRemaining) min kvar")
                                    .font(.caption)
                                    .foregroundStyle(Palette.muted)
                            }
                            Spacer()
                        }
                    }
                }

                if viewModel.profileConfig != nil && viewModel.balance > 0 {
                    Knapp(title: "Lös in skärmtid", style: .primary) {
                        showRedeem = true
                    }
                }

                if viewModel.entries.isEmpty {
                    Kort {
                        Text("Inga transaktioner än.")
                            .foregroundStyle(Palette.muted)
                            .multilineTextAlignment(.center)
                            .padding(.vertical, 16)
                            .frame(maxWidth: .infinity)
                    }
                } else {
                    Kort {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Senaste transaktioner")
                                .font(.headline)
                                .foregroundStyle(Palette.text)
                            ForEach(viewModel.entries) { entry in
                                HStack {
                                    Text(reasonLabel(entry.reason))
                                        .font(.callout)
                                        .foregroundStyle(Palette.text)
                                    Spacer()
                                    Text(signedAmount(entry.amountMynt))
                                        .font(.callout.bold())
                                        .foregroundStyle(entry.amountMynt >= 0 ? Palette.green : Palette.red)
                                }
                                .padding(.vertical, 4)
                            }
                        }
                    }
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
        .sheet(isPresented: $showRedeem) {
            if let pc = viewModel.profileConfig {
                RedeemScreenTimeSheet(viewModel: makeRedeemViewModel(pc: pc))
            }
        }
    }

    private func makeRedeemViewModel(pc: ProfileConfig) -> RedeemScreenTimeViewModel {
        let vm = RedeemScreenTimeViewModel(
            child: viewModel.child,
            multiplier: pc.screenTimeMultiplier,
            dailyLimitMinutes: pc.dailyLimitMinutes,
            usedTodayMinutes: viewModel.minutesUsedToday
        )
        vm.onRedeemed = { _ in
            Task { await viewModel.reload() }
        }
        return vm
    }

    private func reasonLabel(_ raw: String) -> String {
        switch raw {
        case "mission_approved": return "Godkänt uppdrag"
        case "redemption":       return "Inlöst skärmtid"
        case "adjustment":       return "Justering"
        case "refund":           return "Återbetalning"
        default:                 return raw
        }
    }

    private func signedAmount(_ n: Int) -> String {
        n >= 0 ? "+\(n) 🪙" : "\(n) 🪙"
    }
}
