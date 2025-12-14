// MODULE: auth
// DEPS: ['db', 'jwt', 'crypto', 'mailer']
// EXPORTS: ['login', 'register', 'verify', 'refresh', 'logout', 'resetPassword', 'enable2FA']

entity User { id: uuid, email: string, hash: string, role: enum, verified: bool, mfa: bool }
entity Token { jwt: string, exp: timestamp, type: enum }
entity Session { id: uuid, userId: uuid, ip: string, agent: string, created: timestamp }

fn login(email: string, pass: string) -> Result<Token, AuthError> {
  User.find(email)
    |> verify_hash(pass)
    |> check_verified
    |> check_2fa ? require_otp : skip
    |> Session.create(ip, agent)
    |> sign_jwt(user, session)
    -> emit(AuthSuccess)
    : raise(InvalidCredentials | UserNotFound | NotVerified | Requires2FA)
}

fn register(data: UserData) -> Result<User, ValidationError> {
  validate(data)
    |> check_unique(email)
    |> hash_password
    |> User.create
    |> send_verification_email
    -> emit(UserCreated)
    : raise(ValidationFailed | EmailExists)
}

fn verify(token: JWT) -> Result<User, TokenError> {
  jwt.decode(token)
    |> check_expiry
    |> User.find(payload.id)
    |> check_session_valid
    -> user
    : raise(InvalidToken | Expired | SessionRevoked)
}

fn refresh(refreshToken: JWT) -> Result<Token, TokenError> {
  jwt.decode(refreshToken, type=refresh)
    |> check_expiry
    |> Session.find(payload.sessionId)
    |> sign_jwt(session.user, session)
    -> emit(TokenRefreshed)
    : raise(InvalidRefresh | SessionExpired)
}

fn logout(token: JWT) -> Result<void, TokenError> {
  jwt.decode(token)
    |> Session.revoke(payload.sessionId)
    -> emit(LogoutSuccess)
    : raise(InvalidToken)
}

fn resetPassword(email: string) -> Result<void, UserError> {
  User.find(email)
    |> generate_reset_token
    |> send_reset_email
    -> emit(ResetEmailSent)
    : raise(UserNotFound)
}

fn enable2FA(userId: uuid) -> Result<QRCode, AuthError> {
  User.find(userId)
    |> generate_totp_secret
    |> User.update(mfa=true, secret)
    |> generate_qr(secret)
    -> emit(2FAEnabled)
    : raise(UserNotFound | AlreadyEnabled)
}
