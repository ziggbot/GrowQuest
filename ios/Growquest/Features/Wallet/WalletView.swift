import SwiftUI

@Observable
@MainActor
final class WalletViewModel {
    var balance: Int = 0
    var entries: [CoinLedgerEntry] = []
    var isLoading: Bool = false
    var errorMessage: String?

    let child: ChildProfile

    init(child: ChildProfile) { self.child = child }

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
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }
}

struct WalletView: View {
    @State var viewModel: WalletViewModel

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
