# ArkVault Technical Design

## Architecture Overview

ArkVault uses a local-first layered architecture. UI code renders state and delegates work to services. Services coordinate platform adapters, DAO classes, and cryptographic helpers. Sensitive data is encrypted before it reaches RDB.

```text
┌────────────────────────────────────────────┐
│ ArkUI Layer                                │
│ pages/ and components/                     │
└─────────────────────┬──────────────────────┘
                      │ user actions, view state
┌─────────────────────▼──────────────────────┐
│ Service Layer                              │
│ vault, import, generator, clipboard, sync  │
└───────────────┬───────────────┬────────────┘
                │               │
┌───────────────▼──────┐ ┌──────▼────────────┐
│ Data Layer           │ │ Crypto Layer       │
│ models/ and dao/     │ │ crypto/            │
└───────────────┬──────┘ └──────┬────────────┘
                │               │
┌───────────────▼───────────────▼────────────┐
│ HarmonyOS Platform Kits                    │
│ RDB, Asset Store, Crypto Architecture,     │
│ Universal Keystore, User Authentication    │
└────────────────────────────────────────────┘
```

### Module Dependencies

- `pages/` depends on `components/`, `models/`, and service interfaces.
- `components/` depends on simple models and UI-only helpers.
- `services/` depends on `dao/`, `crypto/`, platform adapters, and models.
- `dao/` depends on RDB adapters and models.
- `crypto/` depends on Crypto Architecture Kit and Universal Keystore Kit wrappers.
- `sync/` in Phase 2 depends on network clients, Bitwarden DTOs, local DAOs, and crypto protocol helpers.

The dependency direction must not be inverted. In particular, `crypto/` must not import UI modules, and UI modules must not call raw crypto platform APIs.

## Data Model

### PasswordEntry

`PasswordEntry` represents a decrypted in-memory view. RDB should store encrypted payloads and only the minimum non-sensitive metadata needed for indexing and display.

```ts
interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  folder: string | null;
  tags: string[];
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  passwordHistory: PasswordHistoryItem[];
}

interface PasswordHistoryItem {
  password: string;
  changedAt: number;
}
```

Recommended encrypted RDB shape:

| Field | Storage | Notes |
| --- | --- | --- |
| `id` | Plain | Random UUID or equivalent stable identifier. |
| `titleIndex` | Plain or protected index | Use only if search requires it; avoid storing sensitive titles when possible. |
| `folderId` | Plain nullable | Non-secret organizational metadata. |
| `favorite` | Plain boolean | Non-secret convenience flag. |
| `createdAt` | Plain integer | Unix epoch milliseconds. |
| `updatedAt` | Plain integer | Unix epoch milliseconds. |
| `encryptedPayload` | Ciphertext | Contains username, password, URL, notes, tags, and password history. |
| `payloadNonce` | Plain bytes | AES-GCM nonce. |
| `payloadKeyRef` | Plain string | Reference to wrapped per-record key material. |
| `payloadMac` | Optional | Only needed for protocol modes without AEAD. |

### Folder

```ts
interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}
```

Folders are local organizational metadata in Phase 1. Phase 2 must map Bitwarden folders to local folder IDs while preserving remote IDs in sync metadata.

### Tag

```ts
interface Tag {
  id: string;
  name: string;
  color: string | null;
  createdAt: number;
  updatedAt: number;
}
```

Tags are stored in the encrypted payload when tag names could reveal sensitive context. If plaintext tag indexing is later required, document the privacy tradeoff before implementation.

### VaultConfig

```ts
interface VaultConfig {
  id: string;
  kdfAlgorithm: 'PBKDF2_HMAC_SHA256';
  kdfIterations: number;
  kdfSaltRef: string;
  localCipher: 'AES_256_GCM';
  vaultKeyRef: string;
  autoLockSeconds: number;
  biometricUnlockEnabled: boolean;
  serverUrl: string | null;
  syncEnabled: boolean;
  createdAt: number;
  updatedAt: number;
}
```

`kdfIterations` must be at least `600000` for PBKDF2-HMAC-SHA256. `serverUrl` is reserved for Phase 2 and may be stored outside the encrypted payload because it is needed before remote login.

### ER Relationship

```text
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│ Folder       │ 1   * │ PasswordEntry    │ *   * │ Tag          │
│ id           │───────│ id               │───────│ id           │
│ name         │       │ folderId         │       │ name         │
│ parentId     │       │ encryptedPayload │       │ color        │
└──────────────┘       └──────────────────┘       └──────────────┘
                              │
                              │ 1
                              │
                       ┌──────▼───────┐
                       │ EntryKey     │
                       │ entryId      │
                       │ wrappedKey   │
                       │ wrappingRef  │
                       └──────────────┘
```

## Security Design

### Master Password Handling

Initial vault setup:

1. User enters a master password.
2. Generate a random salt with a cryptographically secure random source.
3. Derive a 256-bit master key with PBKDF2-HMAC-SHA256 and at least 600,000 iterations.
4. Stretch or separate key purposes with HKDF-SHA256.
5. Generate a random vault encryption key.
6. Encrypt the vault encryption key with AES-256-GCM using the derived key-encryption key.
7. Store the protected vault key, salt reference, iteration count, and unlock metadata through Asset Store Kit.
8. Purge password and intermediate key buffers as aggressively as the runtime allows.

Unlock:

1. User authenticates with master password or an approved biometric unlock path.
2. Master-password unlock repeats PBKDF2 and unwraps the vault encryption key.
3. Biometric unlock uses User Authentication Kit to authorize a Universal Keystore Kit key operation that unwraps a protected local unlock key.
4. The plaintext vault key is held in memory only while the vault is unlocked.
5. Lock clears in-memory keys, decrypted entries, copied secrets, and pending sensitive UI state.

### Key Hierarchy

```text
Master Password
   ↓ PBKDF2-HMAC-SHA256, iterations >= 600000
Master Key
   ↓ HKDF-SHA256 domain separation
Stretched / Key-Encryption Key
   ↓ AES-256-GCM unwrap
Vault Encryption Key
   ↓ wraps per-record keys
Per-Record Encryption Key
   ↓ AES-256-GCM
Encrypted PasswordEntry Payload
```

Per-record keys limit blast radius and allow future item-level sharing or rotation. The vault encryption key wraps per-record keys. The database stores only ciphertext, nonces, key references, and non-sensitive metadata.

### Asset Store Kit Strategy

- Store protected vault key blobs, KDF salt references, KDF iteration metadata, key aliases, and biometric unlock metadata.
- Configure access control so vault key material is unavailable after device lock when policy requires lock-on-screen-off.
- Disable cloud backup for local-only key material unless a future encrypted backup design explicitly allows it.
- Treat Asset Store values as sensitive even when encrypted; never mirror them into RDB or preferences.

### Universal Keystore Kit Strategy

- Generate hardware-backed keys with non-exportable private key material.
- Require user authentication for keys used by biometric unlock.
- Use key aliases with explicit purpose names such as `arkvault.vault.unwrap`.
- Rotate wrapping keys when biometric enrollment changes, device security settings change, or key validity fails.
- Do not use Universal Keystore Kit as a replacement for the master password. It is an unlock convenience and local protection layer.

### Clipboard Security

- Copy only the requested field and never the full entry.
- Clear the clipboard automatically after a configurable timeout, defaulting to 30 seconds.
- Clear copied secrets immediately when the vault locks or the app backgrounds.
- Do not show copied passwords in notifications, logs, analytics, or crash reports.
- Warn users that other apps may read clipboard contents while the secret is present.

## Import and Export Design

### Supported Import Formats

| Source | Format | Phase | Parser Strategy |
| --- | --- | --- | --- |
| Bitwarden | CSV | Phase 1 | Header-based mapping for login, URI, notes, folder, favorite. |
| Bitwarden | JSON | Phase 1 | Structured parser for folders, items, notes, cards where supported. |
| 1Password | 1PUX | Phase 1 | Archive reader plus JSON item normalization. |
| LastPass | CSV | Phase 1 | Header-based parser for URL, username, password, extra, grouping. |
| Chrome | CSV | Phase 1 | Fixed columns: name, URL, username, password. |
| Generic CSV | CSV | Phase 1 | User-confirmed field mapping. |

### Import Flow

```text
File selection
   ↓
Format detection
   ↓
Field mapping
   ↓
Validation and preview
   ↓
Duplicate detection
   ↓
Encrypt each accepted item
   ↓
Persist through DAO
   ↓
Show summary and skipped rows
```

Validation rules:

- Reject rows without a title and without a URL.
- Accept empty usernames or notes.
- Normalize URLs without changing the stored original value.
- Preserve original folders and tags where possible.
- Never log raw import rows.
- Keep imported plaintext only in memory until encryption succeeds or the import is canceled.

### Export Flow

Export is not implemented in Phase 1. Reserve a service interface so Phase 2 or a later Phase 1 minor release can add it behind explicit warnings.

Required export safeguards:

- Require an unlocked vault and a fresh authentication challenge.
- Show a clear warning for unencrypted exports.
- Prefer encrypted export formats when available.
- Never export without a user-selected destination.

## Sync Design (Phase 2)

Phase 2 adds optional sync with Vaultwarden and Bitwarden-compatible servers. Sync must be isolated from the Phase 1 local vault so the app remains fully usable offline.

### Bitwarden Authentication Flow

```text
User enters server URL, email, and master password
   ↓
Derive Bitwarden master key using server-compatible KDF settings
   ↓
POST /identity/connect/token
   ↓
Handle 2FA challenge when required
   ↓
Receive access token and refresh token
   ↓
GET /api/sync
   ↓
Decrypt protected symmetric key locally
   ↓
Decrypt remote ciphers locally
   ↓
Merge into local encrypted store
```

### E2EE Compatibility

Local ArkVault storage uses AES-256-GCM. Bitwarden-compatible sync must preserve Bitwarden protocol behavior for remote data:

- PBKDF2-HMAC-SHA256 or the server-provided KDF settings for account key derivation.
- HKDF where required by the Bitwarden key hierarchy.
- AES-CBC-256 with HMAC authentication for Bitwarden cipher compatibility where required.
- Local-only conversion from remote decrypted cipher objects into ArkVault encrypted local payloads.

Never upload local plaintext. All remote encryption and decryption happens client-side.

### Sync State Machine

```text
idle
  ↓ start
syncing
  ↓ conflicts
resolving
  ↓ resolved
done

syncing ── error ──▶ error
resolving ─ error ─▶ error
error ─ retry ────▶ syncing
```

State meanings:

- `idle`: no sync in progress.
- `syncing`: downloading remote changes, applying local queue, or uploading local changes.
- `resolving`: conflict records require deterministic merge behavior or user review.
- `done`: local and remote state reached a consistent checkpoint.
- `error`: sync stopped with retryable or terminal failure.

### Conflict Resolution

Default strategy:

- Use last-write-wins for simple field conflicts.
- Preserve both versions when local and remote changes modify sensitive payload fields.
- Mark preserved duplicates with sync metadata so the user can review them later.
- Never drop password history during conflict resolution.

### Offline Queue

Queue local mutations while offline:

```ts
interface OfflineSyncOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  localEntryId: string;
  remoteCipherId: string | null;
  encryptedPayloadRef: string;
  createdAt: number;
  retryCount: number;
}
```

Queue entries must not contain plaintext. They reference encrypted local payloads and are replayed only after token refresh and server capability checks succeed.

## API Reference (Phase 2)

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/identity/connect/token` | `POST` | Login, token refresh, and 2FA challenge handling. |
| `/api/sync` | `GET` | Download full account sync payload. |
| `/api/ciphers` | `POST` | Create a remote cipher. |
| `/api/ciphers/{id}` | `PUT` | Update a remote cipher. |
| `/api/ciphers/{id}` | `DELETE` | Delete a remote cipher. |
| `/api/folders` | `POST` | Create a remote folder. |
| `/api/folders/{id}` | `PUT` | Update a remote folder. |
| `/api/folders/{id}` | `DELETE` | Delete a remote folder. |

### Token Request Example

```http
POST /identity/connect/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=password&
username=user@example.com&
password=<master-password-hash>&
scope=api offline_access&
client_id=mobile
```

The concrete request shape must follow the target Bitwarden/Vaultwarden server version. Do not send the raw master password.

### Cipher Update Example

```json
{
  "type": 1,
  "folderId": "remote-folder-id",
  "organizationId": null,
  "name": "<encrypted-string>",
  "notes": "<encrypted-string>",
  "favorite": false,
  "login": {
    "username": "<encrypted-string>",
    "password": "<encrypted-string>",
    "uris": [
      {
        "uri": "<encrypted-string>",
        "match": null
      }
    ],
    "totp": null
  }
}
```

### Error Handling

- `400`: validate request shape, KDF settings, and 2FA fields.
- `401`: refresh token once, then lock remote session if refresh fails.
- `403`: stop sync and show an authorization error.
- `404`: mark remote item deleted and reconcile local metadata.
- `409`: enter conflict resolution.
- `429`: back off and retry later.
- Network timeout: keep offline queue and return to `idle` with a retry marker.

## UI/UX Design

### Pages and Navigation

```text
LockPage
   ↓ unlock
VaultListPage
   ├─ EntryDetailPage
   ├─ GeneratorPage
   ├─ ImportPage
   └─ SettingsPage
```

- `LockPage`: master password entry, biometric unlock, lockout state, and recovery guidance.
- `VaultListPage`: main vault list with search, folder filter, tag filter, favorites, and empty state.
- `EntryDetailPage`: view, edit, copy username, copy password, reveal password, delete, and password history.
- `GeneratorPage`: password length, character classes, ambiguous character toggle, and generated password copy action.
- `ImportPage`: file selection, format detection, mapping, preview, validation errors, and import summary.
- `SettingsPage`: biometric unlock, auto-lock timeout, clipboard timeout, server configuration, and sync status.

### Interaction Flows

Add entry:

```text
VaultListPage → Add → EntryDetailPage(edit mode) → Save → Encrypt → Persist → VaultListPage
```

Copy password:

```text
EntryDetailPage → Copy password → ClipboardService → Timer starts → Clipboard cleared
```

Import:

```text
ImportPage → Pick file → Detect format → Preview mapping → Confirm → Encrypt rows → Summary
```

### Design Rules

- Follow HarmonyOS Design System colors, typography, spacing, and motion.
- Prefer native ArkUI components and system symbols.
- Keep security actions explicit: reveal, copy, delete, export, and sync should be deliberate.
- Use Chinese for user-facing UI strings.
- Do not keep plaintext passwords in ArkUI component state longer than the visible interaction requires.
- Support phone, tablet, and 2-in-1 layouts.
- Respect dark mode and system font scaling.

## Testing Strategy

### Unit Tests

- KDF parameter validation.
- AES-256-GCM encrypt/decrypt round trips.
- Key wrapping and unwrap failure cases.
- Password generator character policy.
- Import parsers and field mapping.
- Data model serialization.

### Integration Tests

- Asset Store Kit read/write and ACL behavior.
- Universal Keystore Kit key generation, authentication requirement, and invalidation.
- RDB DAO migration and encrypted payload round trips.
- Lock/unlock service behavior.
- Clipboard clearing behavior.

### UI Tests

- Lock and unlock flows.
- Vault empty state and populated list.
- Entry create/edit/delete.
- Password reveal and copy actions.
- Import wizard validation.
- Settings toggles and server URL validation.

### Sync Tests (Phase 2)

- Token login and refresh.
- 2FA challenge handling.
- `/api/sync` mapping.
- Conflict resolution.
- Offline queue replay.
- Vaultwarden compatibility smoke tests.

## Build and Release

### DevEco Studio

- Use DevEco Studio 6.0.2 Release or newer.
- Target HarmonyOS NEXT with API 22 where possible.
- Use the Stage model and an `entry` HAP module.
- Keep `module.json5` permissions minimal.
- Configure signing profiles per environment.

### AppGallery Release

Release checklist:

- Enable release signing.
- Run unit, integration, and UI tests.
- Verify no debug logging of sensitive data.
- Verify lock-on-background and clipboard clearing.
- Confirm privacy policy and permission descriptions.
- Build release HAP or AppGallery package through DevEco Studio.

### Versioning

Use semantic versioning:

- Patch: bug fixes, parser corrections, UI polish.
- Minor: new local features, importers, settings, or compatible sync improvements.
- Major: storage format changes, cryptographic migration, or incompatible sync behavior.

Cryptographic or schema migrations must include:

- A migration plan.
- Backward compatibility notes.
- Failure recovery behavior.
- Tests for old and new vault metadata.

## References

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): PBKDF2-HMAC-SHA256 should use at least 600,000 iterations when PBKDF2 is selected.
- [Bitwarden Security Whitepaper](https://bitwarden.com/help/bitwarden-security-white-paper/): Bitwarden-compatible sync uses client-side zero-knowledge encryption and protocol-specific key derivation.
- [Bitwarden Encryption Protocols](https://bitwarden.com/help/what-encryption-is-used/): remote Bitwarden cipher compatibility requires AES-CBC-256 with HMAC where the protocol expects it.
