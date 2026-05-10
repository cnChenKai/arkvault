# ArkVault

> A HarmonyOS NEXT native password manager built with ArkTS, ArkUI, and hardware-backed local encryption.

> Logo placeholder: add the final ArkVault mark here when visual identity assets are available.

ArkVault is designed as a local-first password vault for HarmonyOS NEXT. Phase 1 focuses on offline vault management with biometric and master-password unlock. Phase 2 adds optional Vaultwarden and Bitwarden-compatible end-to-end encrypted sync.

## Features

### Phase 1: Local Vault MVP

- Fully local vault storage with no network dependency.
- Password entry CRUD: create, read, update, delete, search, and favorite entries.
- Folder, category, and tag organization.
- Import from Bitwarden, 1Password, LastPass, Chrome, and generic CSV exports.
- Master password unlock with optional fingerprint or face authentication.
- Secure clipboard behavior with automatic clearing after a short timeout.
- Password generator with length, character set, and readability options.
- HarmonyOS security APIs:
  - Asset Store Kit for encrypted secret storage.
  - Crypto Architecture Kit for key derivation and encryption primitives.
  - Universal Keystore Kit for hardware-backed key handling.
  - User Authentication Kit for biometric authentication gates.
  - RDB for local relational data storage.

### Phase 2: Optional Cloud Sync

- Configurable self-hosted Vaultwarden or Bitwarden server URL.
- Bitwarden-compatible end-to-end encryption flow.
- PBKDF2/HKDF-based key derivation for Bitwarden interoperability.
- AES-256-CBC with HMAC where required by the Bitwarden protocol.
- OAuth token authentication against `/identity/connect/token`.
- Full vault sync through `/api/sync` and cipher updates through `/api/ciphers`.
- Local diffing, offline queueing, and conflict handling.
- TOTP-based two-factor authentication support.

## Screenshots

| Vault | Entry Detail | Generator | Import |
| --- | --- | --- | --- |
| Screenshot placeholder | Screenshot placeholder | Screenshot placeholder | Screenshot placeholder |

## Tech Stack

- **Platform:** HarmonyOS NEXT, Stage model.
- **Language:** ArkTS.
- **UI:** ArkUI declarative components.
- **Local database:** RDB.
- **Secure storage:** Asset Store Kit.
- **Cryptography:** Crypto Architecture Kit.
- **Hardware key management:** Universal Keystore Kit.
- **Authentication:** User Authentication Kit.
- **Package/build tooling:** ohpm, Hvigor, DevEco Studio.

## Quick Start

### Prerequisites

- DevEco Studio 6.0.2 Release or newer.
- HarmonyOS NEXT SDK, preferably API 22.
- A HarmonyOS NEXT device or emulator.
- ohpm and Hvigor configured through DevEco Studio.

### Clone

```bash
git clone <repo-url> arkvault
cd arkvault
```

### Build

1. Open the project in DevEco Studio.
2. Let DevEco Studio sync the HarmonyOS SDK, ohpm dependencies, and Hvigor configuration.
3. Configure signing for the `entry` module.
4. Build the app with **Build > Make Project**.

For command-line builds after the HarmonyOS project scaffold is present:

```bash
ohpm install
./hvigorw assembleHap --mode module -p module=entry@default
```

### Run

1. Connect a HarmonyOS NEXT device or start an emulator.
2. Select the `entry` module run configuration.
3. Run from DevEco Studio.

## Project Structure

ArkVault follows the HarmonyOS Stage model. Application code should live under `entry/src/main/ets/`.

```text
ArkVault/
├─ AppScope/
│  ├─ app.json5
│  └─ resources/
├─ entry/
│  ├─ src/main/
│  │  ├─ ets/
│  │  │  ├─ entryability/
│  │  │  ├─ pages/
│  │  │  ├─ components/
│  │  │  ├─ services/
│  │  │  ├─ models/
│  │  │  ├─ dao/
│  │  │  ├─ utils/
│  │  │  └─ crypto/
│  │  ├─ resources/
│  │  └─ module.json5
│  └─ build-profile.json5
├─ docs/
│  └─ DESIGN.md
├─ AGENTS.md
└─ README.md
```

Recommended responsibilities:

- `pages/`: route-level ArkUI screens.
- `components/`: reusable ArkUI components.
- `services/`: business workflows such as vault unlock, import, clipboard, and sync.
- `models/`: typed ArkTS entities and DTOs.
- `dao/`: RDB access objects.
- `crypto/`: key derivation, encryption, decryption, and secure random helpers.
- `utils/`: non-security utility functions.

## Import Support

| Source | Format | Phase | Notes |
| --- | --- | --- | --- |
| Bitwarden | CSV | Phase 1 | Maps login fields, folders, notes, and favorites where available. |
| Bitwarden | JSON | Phase 1 | Preferred Bitwarden local import format. |
| 1Password | 1PUX | Phase 1 | Parse export archive and normalize login items. |
| LastPass | CSV | Phase 1 | Supports common URL, username, password, notes, and group fields. |
| Chrome | CSV | Phase 1 | Supports browser-saved login export. |
| Generic CSV | CSV | Phase 1 | Requires user-confirmed field mapping. |

## Security Overview

ArkVault is designed around zero-knowledge local storage:

- The master password is never stored or transmitted.
- Sensitive vault data is encrypted before it reaches RDB.
- PBKDF2-HMAC-SHA256 uses at least 600,000 iterations when PBKDF2 is used.
- Local vault encryption uses authenticated encryption, with AES-256-GCM as the default.
- Hardware-backed keys are generated and protected through Universal Keystore Kit.
- Asset Store Kit stores protected key material and security metadata.
- UI code never calls raw cryptographic APIs directly; it calls service-layer methods.
- The clipboard service clears copied secrets automatically and avoids logging secret values.

## Roadmap

| Milestone | Scope |
| --- | --- |
| Phase 1 Alpha | Local data model, encrypted storage, lock/unlock, and basic CRUD. |
| Phase 1 Beta | Import wizard, password generator, folders, tags, and secure clipboard. |
| Phase 1 Release | UX polish, security review, integration tests, AppGallery-ready signing. |
| Phase 2 Alpha | Configurable Vaultwarden/Bitwarden endpoint and authentication. |
| Phase 2 Beta | Full sync, local diffing, conflict handling, offline queue, and 2FA. |
| Phase 2 Release | Sync hardening, protocol compatibility tests, and migration tooling. |

## Contributing

1. Keep changes small and security-focused.
2. Follow HarmonyOS ArkTS coding conventions: 2-space indentation, single quotes, explicit types, and no `any` as a shortcut.
3. Put UI text in Chinese and code comments in English.
4. Do not log secrets, derived keys, ciphertext keys, passwords, TOTP codes, tokens, or full import rows.
5. Add or update tests for crypto, import parsing, database access, and sync behavior.
6. Document security-sensitive design changes in `docs/DESIGN.md`.

## License

MIT

## Acknowledgements

- Bitwarden for its open protocol documentation and security architecture references.
- Vaultwarden for the self-hosted Bitwarden-compatible ecosystem.
- The HarmonyOS developer community for ArkTS, ArkUI, and native HarmonyOS guidance.
