# Security Specification & Threat Model - Transportes Ravel

## 1. Data Invariants
- An account (`cuentas/{cuentaId}`) cannot be created or updated without an authenticated user whose `request.auth.uid` matches `incoming().userId` (or administrator).
- User email `ravelescolar@gmail.com` is granted administrative access if authenticated.
- String boundaries: ID fields <= 128 characters, Names <= 200 chars, Concepts/Observations <= 2000 chars.
- Consecutive must be a positive number.
- Status values can only be one of `['emitida', 'radicada', 'pagada', 'anulada']`.
- Once an account is in a terminal status like `anulada` or `pagada`, regular users cannot alter financial or consecutive fields.
- Drivers directory can only be modified by authenticated users, with `userId == request.auth.uid`.
- Global settings document (`/settings/global`) can only be modified by authenticated team members, preserving company data integrity.

## 2. The "Dirty Dozen" Threat Payloads (Rejected by Rules)
1. **Unauthenticated Read of Accounts**: Attempt to list `/cuentas` without an auth token. (Must be denied)
2. **Identity Spoofing on Create**: Authenticated user 'user-a' submits `userId: 'user-b'`. (Must be denied)
3. **Ghost Field Injection**: Adding an unpermitted field `isSuperAdmin: true` to a Cuenta or Driver. (Must be denied)
4. **Invalid Status Transition**: Updating `status` to `destruida` (not in enum). (Must be denied)
5. **Path ID Poisoning**: Document ID with junk characters or length > 128 characters. (Must be denied)
6. **Negative Monetary Amount**: `totalAmount: -500000`. (Must be denied)
7. **Giant String / Denial-of-Wallet Attack**: `concept` with 100,000 characters payload. (Must be denied)
8. **Malicious Driver Tampering**: Modifying another user's driver record without ownership. (Must be denied)
9. **Unauthenticated Settings Write**: Changing consecutive number anonymously. (Must be denied)
10. **Immutability Breach**: Overwriting `id` or `createdAt` on an existing cuenta. (Must be denied)
11. **Client Delegation Bypass**: Attempting to query accounts without proper auth filter. (Must be denied)
12. **Unverified Email Spoofing**: Simulating admin email with `email_verified: false`. (Must be denied)
