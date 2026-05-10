# AGENTS.md

This file gives AI coding agents the project context and guardrails needed to work on ArkVault safely.

## Project Overview

ArkVault is a HarmonyOS NEXT native, local-first password manager built with ArkTS, ArkUI, and hardware-backed encryption.

## Technical Stack

- **HarmonyOS NEXT:** Use the Stage model for new app work.
- **ArkTS:** Strict, statically checked application language.
- **ArkUI:** Declarative UI framework for pages and reusable components.
- **RDB:** Local relational database for encrypted vault records and non-sensitive indexes.
- **Asset Store Kit:** Secure storage for protected key material and secret metadata.
- **Crypto Architecture Kit:** Cryptographic primitives, including KDF, AES, HMAC, and random generation.
- **Universal Keystore Kit:** Hardware-backed key generation, wrapping, and usage constraints.
- **User Authentication Kit:** Fingerprint and face authentication gates.
- **ohpm/Hvigor:** Dependency and build tooling through DevEco Studio.

## Coding Standards

Follow Huawei HarmonyOS and ArkTS conventions.

- Use 2-space indentation and no tabs.
- Keep lines at or below 120 characters.
- Use single quotes for strings.
- Always use braces for `if`, `for`, `while`, and `do` blocks.
- Keep `build()` methods declarative; do I/O and service calls in lifecycle handlers or services.
- Prefer explicit types and interfaces over dynamic object shapes.
- Avoid `any`, `unknown`, `ESObject`, dynamic property mutation, and untyped dictionaries.
- Prefer `T[]` over `Array<T>`.
- Prefer array methods such as `map`, `filter`, and `forEach` where readable.
- Use access modifiers on class properties and methods.

## Naming Conventions

| Target | Convention | Example |
| --- | --- | --- |
| Components, classes, enums, namespaces | PascalCase / UpperCamelCase | `VaultListPage`, `PasswordEntry` |
| Variables, methods, parameters | camelCase / lowerCamelCase | `vaultService`, `deriveMasterKey()` |
| Constants and enum values | UPPER_SNAKE_CASE | `PBKDF2_MIN_ITERATIONS` |
| Booleans | `is`, `has`, `can`, or `should` prefix | `isUnlocked`, `hasBiometricAuth` |

Use real English words in code identifiers. Do not use pinyin or single-letter identifiers except for very small local transforms where the meaning is obvious.

## File Organization

Application code should use this layout under `entry/src/main/ets/`:

```text
entry/src/main/ets/
├─ entryability/
├─ pages/
├─ components/
├─ services/
├─ models/
├─ dao/
├─ crypto/
└─ utils/
```

- Each route-level page should have its own folder under `pages/` when it has supporting state, components, or styles.
- Shared UI belongs in `components/`.
- Business workflows belong in `services/`.
- RDB access belongs in `dao/`; UI and services must not write raw SQL directly.
- Cryptographic operations belong in `crypto/`; UI code must never call platform crypto APIs directly.
- Models should be typed ArkTS interfaces or classes with stable field names.

## Language Policy

- Code comments must be written in English.
- Developer documentation must be written in English unless a task explicitly asks otherwise.
- User-facing UI text must be written in Chinese.
- Test names and test descriptions should be in English.

## Security Red Lines

These rules are mandatory.

- Never store or transmit the master password in plaintext.
- Never persist derived master keys, stretched keys, decrypted vault keys, raw item keys, access tokens, refresh tokens, TOTP secrets, or copied passwords outside the approved secure storage flow.
- All sensitive data must be encrypted before it is written to RDB.
- Protected key material and unlock metadata must go through Asset Store Kit.
- Hardware-backed keys must be created and constrained through Universal Keystore Kit.
- Do not store software-only encryption keys in preferences, JSON files, RDB, logs, or resources.
- Do not print sensitive data with `console.log`, traces, analytics, crash reports, or test snapshots.
- Do not add network access to Phase 1 features.
- Do not add export of unencrypted vault data unless the task explicitly asks for it and the design documents the warning flow.

## Architecture Conventions

Use a layered architecture:

```text
ArkUI pages/components
        ↓
Service layer
        ↓
DAO and platform adapters
        ↓
RDB, Asset Store Kit, Universal Keystore Kit, User Authentication Kit
```

- UI components should render state and delegate actions to services.
- Services own workflows such as unlock, lock, import, copy-to-clipboard, and sync.
- DAO classes own database reads/writes and schema migrations.
- `crypto/` owns KDF, encryption, decryption, secure random generation, and key wrapping.
- Sync code for Phase 2 must be isolated from local Phase 1 vault operations.
- Bitwarden-compatible sync must preserve the Bitwarden protocol where required, even if local storage uses a different cipher mode.

## Build and Run

Use DevEco Studio as the primary workflow.

```bash
ohpm install
./hvigorw assembleHap --mode module -p module=entry@default
```

If the HarmonyOS scaffold has not been created yet, document-only tasks should not invent generated project files. Add scaffolding only when explicitly requested.

## Testing Expectations

- Crypto modules need deterministic unit tests with fixed vectors where possible.
- Import parsers need fixture tests for Bitwarden CSV, Bitwarden JSON, 1Password 1PUX, LastPass CSV, Chrome CSV, and generic CSV.
- DAO code needs migration and round-trip tests.
- Service tests should cover lock/unlock, clipboard clearing, import validation, and error handling.
- UI tests should cover navigation, validation messages, empty states, and disabled states.

## Common Pitfalls

- HarmonyOS permissions must be declared in `module.json5` before platform APIs can be used.
- User Authentication Kit behavior depends on biometric enrollment and device lock configuration; handle unavailable and changed-enrollment states.
- Asset Store Kit access control must match vault lock policy. Do not create items that remain accessible after lock when they protect vault data.
- Clipboard content can outlive the app process; always schedule clearing after copying secrets.
- ArkUI state should be minimal and non-sensitive. Do not keep plaintext passwords in component state longer than needed.
- RDB is not a secure store by itself. Treat it as ciphertext storage.
- Avoid side effects in ArkUI `build()` functions.
- Avoid storing server URLs or sync state in the same encrypted payload as local vault keys when the setting is non-sensitive and needed before unlock.
