import SwiftUI
import AuthenticationServices

struct AuthView: View {
    @State private var viewModel = AuthViewModel()

    var body: some View {
        @Bindable var viewModel = viewModel
        ZStack {
            Palette.bg.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    header

                    modeSwitch

                    formCard

                    dividerWithLabel

                    appleButton

                    if viewModel.mode == .signIn {
                        Button("Glömt lösenord?") {
                            Task { await viewModel.sendPasswordReset() }
                        }
                        .font(.footnote)
                        .foregroundStyle(Palette.muted)
                    }

                    if let info = viewModel.infoMessage {
                        Text(info).foregroundStyle(Palette.green).font(.footnote)
                    }
                    if let err = viewModel.errorMessage {
                        Text(err).foregroundStyle(Palette.red).font(.footnote)
                    }
                }
                .padding(20)
            }
        }
    }

    // MARK: Subviews

    private var header: some View {
        VStack(spacing: 8) {
            Text("GrowQuest")
                .font(.system(size: 36, weight: .heavy, design: .rounded))
                .foregroundStyle(Palette.gold)
            Text(viewModel.mode == .signIn ? "Välkommen tillbaka" : "Skapa ett föräldrakonto")
                .font(.callout)
                .foregroundStyle(Palette.muted)
        }
        .padding(.top, 40)
    }

    private var modeSwitch: some View {
        Picker("", selection: $viewModel.mode) {
            Text("Logga in").tag(AuthViewModel.Mode.signIn)
            Text("Skapa konto").tag(AuthViewModel.Mode.signUp)
        }
        .pickerStyle(.segmented)
    }

    private var formCard: some View {
        Kort {
            VStack(spacing: 14) {
                TextField("E-post", text: $viewModel.email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled(true)
                    .padding(12)
                    .background(Palette.surfaceHov)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                SecureField(viewModel.mode == .signUp ? "Lösenord (minst 10 tecken)" : "Lösenord",
                            text: $viewModel.password)
                    .textContentType(viewModel.mode == .signUp ? .newPassword : .password)
                    .padding(12)
                    .background(Palette.surfaceHov)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                if viewModel.mode == .signUp {
                    SecureField("Bekräfta lösenord", text: $viewModel.passwordConfirm)
                        .textContentType(.newPassword)
                        .padding(12)
                        .background(Palette.surfaceHov)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }

                Knapp(title: viewModel.mode == .signIn ? "Logga in" : "Skapa konto",
                      style: .primary) {
                    Task { await viewModel.submit() }
                }
                .disabled(!viewModel.canSubmit)
                .opacity(viewModel.canSubmit ? 1 : 0.5)
            }
        }
    }

    private var dividerWithLabel: some View {
        HStack(spacing: 8) {
            Rectangle().fill(Palette.border).frame(height: 1)
            Text("eller").foregroundStyle(Palette.muted).font(.caption)
            Rectangle().fill(Palette.border).frame(height: 1)
        }
    }

    private var appleButton: some View {
        SignInWithAppleButton(.continue, onRequest: { request in
            viewModel.configureSignInWithApple(request)
        }, onCompletion: { result in
            Task { await viewModel.handleSignInWithApple(result) }
        })
        .signInWithAppleButtonStyle(.white)
        .frame(height: 50)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

#Preview {
    AuthView()
}
