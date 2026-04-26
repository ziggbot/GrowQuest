import SwiftUI
import Supabase

@Observable
@MainActor
final class RedeemScreenTimeViewModel {
    var minutes: Int = 30
    var isWorking: Bool = false
    var errorMessage: String?
    var lastResult: Redemption?

    let child: ChildProfile
    let multiplier: Double
    let dailyLimitMinutes: Int
    let usedTodayMinutes: Int

    let options: [Int] = [15, 30, 60]

    var onRedeemed: (Redemption) -> Void = { _ in }

    init(child: ChildProfile,
         multiplier: Double,
         dailyLimitMinutes: Int,
         usedTodayMinutes: Int) {
        self.child = child
        self.multiplier = multiplier
        self.dailyLimitMinutes = dailyLimitMinutes
        self.usedTodayMinutes = usedTodayMinutes
    }

    var estimatedCost: Int {
        RedemptionPricing.estimatedCost(minutes: minutes, multiplier: multiplier)
    }

    var minutesLeftToday: Int {
        max(0, dailyLimitMinutes - usedTodayMinutes)
    }

    var fitsDailyLimit: Bool { minutes <= minutesLeftToday }

    func redeem() async {
        guard !isWorking else { return }
        errorMessage = nil
        isWorking = true
        defer { isWorking = false }

        struct Params: Encodable {
            let pChildId: UUID
            let pMinutes: Int

            enum CodingKeys: String, CodingKey {
                case pChildId = "p_child_id"
                case pMinutes = "p_minutes"
            }
        }

        struct RPCResult: Decodable {
            let redemptionId: UUID
            let minutes: Int
            let myntCost: Int
            let endsAt: Date

            enum CodingKeys: String, CodingKey {
                case redemptionId = "redemption_id"
                case minutes
                case myntCost = "mynt_cost"
                case endsAt = "ends_at"
            }
        }

        do {
            let result: RPCResult = try await supabase
                .rpc("redeem_screen_time",
                     params: Params(pChildId: child.id, pMinutes: minutes))
                .execute()
                .value

            let redemption = Redemption(
                id: result.redemptionId,
                familyId: child.familyId,
                childId: child.id,
                kind: "screen_time_minutes",
                minutes: result.minutes,
                myntCost: result.myntCost,
                startedAt: Date(),
                endsAt: result.endsAt
            )
            lastResult = redemption
            onRedeemed(redemption)
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }
}

struct RedeemScreenTimeSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State var viewModel: RedeemScreenTimeViewModel

    var body: some View {
        @Bindable var viewModel = viewModel
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    Kort {
                        VStack(spacing: 8) {
                            Text("Lös in skärmtid")
                                .font(.system(size: 22, weight: .heavy, design: .rounded))
                                .foregroundStyle(Palette.text)
                            Text("\(viewModel.child.avatarEmoji) \(viewModel.child.nickname) väljer hur länge.")
                                .font(.footnote)
                                .foregroundStyle(Palette.muted)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 4)
                    }

                    Kort {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Hur länge?").font(.headline).foregroundStyle(Palette.text)
                            HStack(spacing: 8) {
                                ForEach(viewModel.options, id: \.self) { opt in
                                    Button {
                                        viewModel.minutes = opt
                                    } label: {
                                        VStack(spacing: 4) {
                                            Text("\(opt)").font(.system(size: 22, weight: .heavy, design: .rounded))
                                            Text("min").font(.caption2)
                                        }
                                        .frame(maxWidth: .infinity, minHeight: 64)
                                        .background(viewModel.minutes == opt
                                                    ? Palette.purple.opacity(0.2)
                                                    : Palette.surfaceHov)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                                .stroke(viewModel.minutes == opt ? Palette.purple : Palette.border,
                                                        lineWidth: viewModel.minutes == opt ? 2 : 1)
                                        )
                                        .foregroundStyle(viewModel.minutes == opt ? Palette.purple : Palette.text)
                                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }

                    Kort {
                        VStack(spacing: 6) {
                            Text("Kostnad")
                                .font(.caption)
                                .foregroundStyle(Palette.muted)
                            Text("\(viewModel.estimatedCost) 🪙")
                                .font(.system(size: 32, weight: .heavy, design: .rounded))
                                .foregroundStyle(Palette.gold)
                            Text("Kvar idag: \(viewModel.minutesLeftToday) min")
                                .font(.caption2)
                                .foregroundStyle(Palette.muted)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 4)
                    }

                    if !viewModel.fitsDailyLimit {
                        Text("Den valda tiden överskrider dagens gräns.")
                            .foregroundStyle(Palette.red)
                            .font(.footnote)
                    }
                    if let err = viewModel.errorMessage {
                        Text(err).foregroundStyle(Palette.red).font(.footnote)
                    }
                    if let r = viewModel.lastResult {
                        Text("✅ Skärmtid upplåst — slutar \(r.endsAt.formatted(date: .omitted, time: .shortened))")
                            .foregroundStyle(Palette.green)
                            .font(.footnote)
                    }

                    Knapp(title: viewModel.isWorking ? "Löser in…" : "Lös in",
                          style: .primary) {
                        Task {
                            await viewModel.redeem()
                            if viewModel.errorMessage == nil { dismiss() }
                        }
                    }
                    .disabled(viewModel.isWorking || !viewModel.fitsDailyLimit)
                    .opacity(viewModel.isWorking || !viewModel.fitsDailyLimit ? 0.5 : 1)
                }
                .padding(20)
            }
            .background(Palette.bg.ignoresSafeArea())
            .navigationTitle("Lös in mynt")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Avbryt") { dismiss() }.tint(Palette.muted)
                }
            }
        }
    }
}
