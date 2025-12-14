# Auth Module Flow

> Auto-generated from `auth.graph.jsonld`
> Compression: ~150x vs raw code

```mermaid
sequenceDiagram
    participant C as Client
    participant A as auth
    participant D as db
    participant J as jwt
    participant CR as crypto
    participant M as mailer

    Note over A: Authentication Module
    Note over A: 7 functions, 3 entities

    rect rgb(200, 230, 200)
        Note right of C: LOGIN FLOW
        C->>A: login(email, pass)
        A->>D: User.find(email)
        D-->>A: User | null
        A->>CR: verify_hash(pass)
        alt Valid + No 2FA
            A->>J: sign_jwt(user)
            J-->>A: Token
            A-->>C: 200 + Token
            Note over A: emit(AuthSuccess)
        else Valid + 2FA Required
            A-->>C: 202 Requires2FA
            Note over A: emit(Requires2FA)
        else Invalid
            A-->>C: 401 InvalidCredentials
            Note over A: emit(AuthFailed)
        end
    end

    rect rgb(200, 200, 230)
        Note right of C: REGISTER FLOW
        C->>A: register(data)
        A->>A: validate(data)
        A->>D: check_unique(email)
        A->>CR: hash_password
        A->>D: User.create
        A->>M: send_verification_email
        alt Success
            A-->>C: 201 User
            Note over A: emit(UserCreated)
        else Email Exists
            A-->>C: 409 EmailExists
        else Validation Failed
            A-->>C: 400 ValidationFailed
        end
    end

    rect rgb(230, 200, 200)
        Note right of C: VERIFY TOKEN
        C->>A: verify(token)
        A->>J: jwt.decode(token)
        A->>A: check_expiry
        A->>D: User.find(payload.id)
        alt Valid
            A-->>C: 200 User
        else Invalid/Expired
            A-->>C: 401 TokenError
        end
    end

    rect rgb(230, 230, 200)
        Note right of C: REFRESH TOKEN
        C->>A: refresh(refreshToken)
        A->>J: jwt.decode(refreshToken)
        A->>D: Session.find
        A->>J: sign_jwt(new)
        alt Valid
            A-->>C: 200 NewToken
            Note over A: emit(TokenRefreshed)
        else Invalid
            A-->>C: 401 SessionExpired
        end
    end

    rect rgb(200, 230, 230)
        Note right of C: LOGOUT
        C->>A: logout(token)
        A->>D: Session.revoke
        A-->>C: 200 OK
        Note over A: emit(LogoutSuccess)
    end

    rect rgb(230, 200, 230)
        Note right of C: PASSWORD RESET
        C->>A: resetPassword(email)
        A->>D: User.find(email)
        A->>CR: generate_reset_token
        A->>M: send_reset_email
        alt User Found
            A-->>C: 200 OK
            Note over A: emit(ResetEmailSent)
        else Not Found
            A-->>C: 404 UserNotFound
        end
    end

    rect rgb(220, 220, 220)
        Note right of C: ENABLE 2FA
        C->>A: enable2FA(userId)
        A->>D: User.find(userId)
        A->>CR: generate_totp_secret
        A->>D: User.update(mfa=true)
        A->>A: generate_qr(secret)
        alt Success
            A-->>C: 200 QRCode
            Note over A: emit(2FAEnabled)
        else Already Enabled
            A-->>C: 409 AlreadyEnabled
        end
    end
```

## Entities

```mermaid
classDiagram
    class User {
        +uuid id
        +string email
        +string hash
        +enum role
        +bool verified
        +bool mfa
    }

    class Token {
        +string jwt
        +timestamp exp
        +enum type
    }

    class Session {
        +uuid id
        +uuid userId
        +string ip
        +string agent
        +timestamp created
    }

    User "1" --> "*" Session : has
    User "1" --> "*" Token : owns
```

## Compression Stats

| Metric | Value |
|--------|-------|
| Original Code (est.) | ~1500 lines |
| ARCH.spec | 45 lines |
| Compression Ratio | **33x** |
| Token Savings | ~95% |
