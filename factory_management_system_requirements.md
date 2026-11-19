# Factory Management Application — System Requirements

**Document type:** Technical system requirements  
**Status:** Proposed architecture for discussion; not an implementation plan  
**Version:** 1.0  
**Date:** 19 November 2026

---

## 1. Purpose

This document defines the proposed technical requirements and architecture for the factory management application.

The application is intended for a small plastic-manufacturing factory operated by a single owner. The owner primarily uses a mobile phone and may have little or unreliable internet access.

The system must therefore be **offline-first**: the owner can operate the factory without an internet connection, while the app synchronizes saved information to a cloud service whenever connectivity becomes available.

A major requirement is protection against phone loss, damage, replacement, or app reinstallation. The owner must be able to restore the factory's cloud-backed-up data on another phone using a recovery process.

This document records proposed requirements only. It does not authorize or describe implementation work.

## 2. Architecture decisions and current recommendations

| Area | Proposed choice |
|---|---|
| Mobile framework | React Native with Expo |
| Programming language | TypeScript |
| Local operational database | SQLite |
| SQLite integration | Expo SQLite |
| Cloud database | Supabase PostgreSQL |
| Backend | Secure server-side API / Supabase Edge Functions or equivalent |
| Authentication | Owner account authentication plus a separate factory recovery credential |
| File storage | Supabase Storage or equivalent object storage |
| Local secure storage | Expo SecureStore for secrets and credentials |
| Network status | Expo Network |
| Synchronization | Custom offline-first synchronization service |
| Local notifications | Expo Notifications, subject to platform permissions and Expo capabilities |

**Cloud provider status:** Supabase PostgreSQL is the preferred recommendation, not an irreversible decision. Provider pricing, free-tier limitations, backup retention, availability, and deployment requirements must be reviewed before production launch.

## 3. Core system principles

1. The mobile app must remain usable when the phone has no internet connection.
2. SQLite is the primary operational database on the phone.
3. A business transaction must be saved locally before the app reports it as successfully saved.
4. The app must not require a cloud request for every purchase, sale, production entry, expense, or inventory operation.
5. Cloud synchronization must happen when connectivity is available, without requiring the owner to manually re-enter transactions.
6. Cloud synchronization must be retryable and must not create duplicate records.
7. The cloud copy must be independent of the original phone.
8. The owner must be able to restore backed-up data to a replacement phone.
9. The app must clearly distinguish data saved locally from data successfully backed up to the cloud.
10. The system must preserve financial, stock, exchange-rate, and production history.
11. No local or cloud data may be silently overwritten during setup, synchronization, or restoration.
12. Important financial and inventory changes must be auditable.

## 4. Mobile application requirements

### 4.1 Framework

- Build the mobile application using React Native and Expo.
- Use TypeScript.
- Target Android first, while avoiding unnecessary architecture choices that prevent future iOS support.
- Use Expo-compatible libraries and development workflows.
- The app must be designed for phone-sized screens and one-person operation.
- Forms and common actions should be simple, quick, and usable with limited technical experience.

### 4.2 Local database

- Use SQLite through Expo SQLite as the local operational database.
- Store business records locally, including:
  - Business profile and application settings.
  - Raw-material definitions and stock thresholds.
  - Finished-product configuration.
  - Suppliers and customers.
  - Purchases and purchase items.
  - Purchase payments and payment status.
  - Production batches and material consumption.
  - Finished-product stock movements.
  - Sales and sale items.
  - Customer payments and outstanding balances.
  - Business expenses and categories.
  - Cash accounts and cash movements.
  - Currency rates and transaction rate snapshots.
  - Owner contributions and withdrawals.
  - Personal finance records, if included in the agreed application scope.
  - Notification settings and relevant notification history.
  - Synchronization metadata and audit records.
- Use database migrations so the local schema can evolve safely between app versions.
- Use SQLite transactions for operations that update multiple related records.
- Use appropriate indexes for commonly searched dates, IDs, customers, suppliers, and transaction types.
- Use foreign keys and integrity constraints where appropriate.
- Store timestamps consistently, while displaying dates and times using the factory's configured local time zone.
- Use stable unique IDs generated on the device for records created offline.

### 4.3 Local data protection

- Store authentication tokens and sensitive secrets using secure device storage such as Expo SecureStore.
- Do not store cloud database administrator credentials or service-role keys in the mobile app.
- Protect sensitive local data using platform-appropriate secure storage and encryption measures. If database-file encryption is required, select and validate a compatible solution before implementation; ordinary SQLite should not be assumed to encrypt the database file automatically.
- Do not write recovery credentials, passwords, access tokens, or sensitive financial details to ordinary logs.
- Consider an optional app lock or biometric unlock, subject to device support.
- The app must explain that local-only records can be lost if the phone is destroyed before they synchronize.

## 5. Cloud architecture

### 5.1 Preferred cloud provider

Supabase with PostgreSQL is the preferred cloud database recommendation.

Reasons:
- The business data is highly relational.
- Purchases, purchase items, suppliers, payments, inventory movements, production batches, sales, customers, and cash movements have clear relationships.
- PostgreSQL supports relational constraints and transactions useful for financial and inventory consistency.
- Supabase provides managed PostgreSQL and related services such as authentication, storage, and server-side functions.

MongoDB Atlas remains a possible alternative, but the application would still require a secure backend and carefully designed transaction and synchronization logic.

### 5.2 Backend/API requirement

- The mobile app must communicate with the cloud database through a secure backend API or appropriately secured server-side functions.
- The mobile app must never contain a database administrator password, PostgreSQL connection secret, or Supabase service-role key.
- The backend must authenticate and authorize requests.
- The backend must validate factory ownership and access rights for every operation.
- The backend must validate recovery credentials and enforce rate limits.
- The backend must validate synchronization payloads and reject malformed or unauthorized data.
- The backend must enforce idempotency so retries do not create duplicate records.
- Server-side operations that affect multiple related cloud records must use database transactions where appropriate.
- Use row-level security and server-side authorization as defense in depth. Client-supplied factory IDs must never be treated as proof of access.

### 5.3 Cloud data organization

- Every factory/business must have a unique, stable factory identity.
- Cloud records must be associated with the correct factory.
- The backend must prevent one factory from reading or modifying another factory's data.
- Cloud records must retain their original local record IDs or stable synchronization IDs.
- Store original transaction currency, amount, transaction date, applied exchange-rate snapshot, and AFN equivalent where relevant.
- Store creation/update metadata and synchronization metadata.
- Preserve historical records when current settings, exchange rates, or expected production yields change.

### 5.4 Cloud file storage

If the app supports receipt or other attachment uploads:
- Store files in managed object storage, not as large binary objects in ordinary transaction rows unless there is a specific reason.
- Associate each file with its factory and relevant record.
- Apply access controls so files are only available to authorized users.
- Support upload retries and verify successful uploads.
- Track whether an attachment is local-only, pending upload, or backed up.

## 6. First launch, factory creation, and restoration

### 6.1 First-launch choices

When no local factory is configured, show clear choices:

1. **Create a new factory** — start a new business data set.
2. **Restore an existing factory** — recover a previously cloud-backed-up business.
3. **Continue on this phone** — available only if a valid local factory database already exists.

Do not create a second factory silently if local data already exists.

### 6.2 Create a new factory

Proposed flow:
1. Owner selects Create a new factory.
2. App creates a new local factory identity and SQLite database.
3. Owner can begin setup and use the app offline.
4. When internet is available, the app securely registers the factory with the backend.
5. The backend creates the cloud factory record and recovery credential.
6. The app displays the recovery credential and instructs the owner to save it securely.
7. The app begins synchronizing local records.
8. The app shows cloud-backup status and the time of the last successful synchronization.

The exact timing of cloud registration and recovery-code generation must be designed carefully for an owner who may not have internet during first use. The app must allow local setup without falsely claiming that cloud recovery is already available.

### 6.3 Restore an existing factory

Proposed flow:
1. Owner installs the app on a replacement phone.
2. Owner selects Restore an existing factory.
3. Owner enters the recovery credential and completes any additional ownership verification required.
4. Backend validates the credential and authorizes access.
5. App downloads a consistent cloud snapshot and any required changes after that snapshot.
6. App rebuilds the local SQLite database.
7. App validates record counts, relationships, and integrity checks.
8. App confirms restoration and displays the cloud backup timestamp.
9. Owner can continue working offline.

Restoration must not overwrite an existing local factory without an explicit, clearly explained confirmation and a safe backup/export opportunity.

### 6.4 Recovery credential security

A recovery code is a sensitive credential, not merely a public factory identifier.

Requirements:
- Generate it using a cryptographically secure random generator.
- Make it sufficiently long and unpredictable to resist guessing.
- Display it in readable groups to reduce entry mistakes.
- Store only a secure verifier/hash on the server where practical; do not store the raw recovery secret unnecessarily.
- Never include it in analytics, ordinary logs, crash reports, or notifications.
- Rate-limit failed attempts and monitor suspicious recovery attempts.
- Support rotating/replacing a recovery credential.
- Support revoking a compromised credential.
- Explain to the owner that anyone who obtains a valid recovery credential may be able to gain access, depending on the chosen verification design.
- Provide a safe way to save or print the credential, without automatically exposing it to insecure channels.

**Open security decision:** Decide whether restoration requires (A) recovery credential only, (B) recovery credential plus a separate owner PIN, or (C) recovery credential plus account login/another ownership verification step. The recommended direction is recovery credential plus a separate authentication factor, but the final choice must balance usability and security.

## 7. Offline-first synchronization

### 7.1 General behavior

- All normal factory operations must work offline after the local factory has been initialized.
- A successful local database commit is the point at which an offline transaction is considered saved.
- The app must queue unsynchronized changes.
- The app must attempt synchronization when connectivity becomes available and at suitable app lifecycle points.
- Synchronization must not block normal local work.
- The owner must be able to request **Sync Now**.
- The app must show the last successful synchronization time and the number of pending records.
- Failed synchronization must not delete or invalidate local records.
- The app must retry safely after temporary network or server failures.
- The app must avoid excessive battery and data use.

### 7.2 Synchronization record metadata

Each synchronizable record should have suitable metadata, such as:
- Stable record ID.
- Factory ID.
- Record type.
- Created timestamp.
- Updated timestamp, where applicable.
- Local change/version number.
- Synchronization status.
- Last attempted synchronization time.
- Successful cloud synchronization time, where applicable.
- Deletion/reversal marker if applicable.

The exact schema is an implementation design decision. Prefer explicit synchronization/outbox records over relying only on a single status flag when that improves reliability.

### 7.3 Upload process

1. Identify pending local changes.
2. Group changes into safe batches.
3. Send them to the authenticated backend.
4. Backend validates ownership, payload, and relationships.
5. Backend saves accepted changes idempotently.
6. Backend returns explicit acknowledgments for accepted records and any validation failures.
7. App marks only acknowledged records as synchronized.
8. Failed records remain pending and can be retried.
9. Log a useful, non-sensitive error state for the owner when intervention is needed.

### 7.4 Download process

- Download cloud changes that belong to the authorized factory.
- Use a reliable cursor, version, or change sequence to avoid gaps.
- Apply changes in a consistent order.
- Use local SQLite transactions when applying related changes.
- Record the last successfully applied cloud cursor/version.
- Make repeated downloads safe.
- Do not overwrite newer local changes without a defined conflict policy.

### 7.5 Duplicate prevention and idempotency

- Every locally created record must receive a stable unique ID before upload.
- Repeating an upload after a timeout must not create another purchase, sale, payment, expense, or production batch.
- Backend requests that create or apply changes must use idempotency keys or equivalent unique constraints.
- The app must process server acknowledgments safely even if it restarts during synchronization.

### 7.6 Conflict handling

The initial product is expected to have one owner and one primary phone. Nevertheless, the system must define behavior for:
- The same record being changed locally and in the cloud.
- A restore being performed while another phone is still active.
- Repeated or delayed uploads.
- A partially completed upload.
- A schema/app version mismatch.

Do not use blind last-write-wins for financial or inventory records. Prefer immutable posted transactions and explicit adjustment/reversal records. If multi-device editing is later supported, define record-specific conflict rules before enabling it.

### 7.7 Sync status shown to owner

The app should display clear statuses such as:
- Saved on this phone — waiting for backup.
- Synchronizing.
- Backed up.
- Synchronization failed — local data remains saved.
- Cloud backup not yet set up.
- Last successful backup was X days ago.

Example status information:
- Connection: Online/Offline.
- Pending records: count.
- Last successful cloud sync: date and time.
- Last sync error: short understandable explanation, if applicable.

Do not display “All data backed up” unless all required records and attachments have been acknowledged by the cloud service.

## 8. Backup and disaster recovery

### 8.1 Important limitation

If the phone is lost or destroyed before locally created records have synchronized, those unsynchronized records cannot be recovered from the cloud. This limitation must be clearly communicated.

Example:
- Last successful sync: Monday.
- Owner creates new transactions Tuesday through Thursday while offline.
- Phone is lost Thursday before reconnecting.
- Cloud recovery can restore data only up to the last successful synchronization, plus anything previously uploaded.

The app must not promise recovery of data that never reached the cloud.

### 8.2 Backup requirements

- Maintain cloud-side backups independently of the phone.
- Define snapshot frequency and retention before production launch.
- Consider periodic logical exports in addition to provider-level backups.
- Preserve transaction history needed to restore from a snapshot to a later point.
- Protect backups with appropriate access controls and encryption.
- Monitor backup jobs and report failures.
- Test restoration periodically.
- Display the most recent confirmed cloud backup/synchronization time to the owner.
- Allow export of business data in practical formats where supported.

### 8.3 Restore verification

After restoration:
- Verify that the snapshot and change history were completely downloaded.
- Verify key record counts and relationships.
- Verify stock and cash ledger consistency.
- Verify that the restored local database opens successfully.
- Show the timestamp of the cloud data restored.
- Do not silently report success if validation fails.

### 8.4 Provider backup limitations

Do not assume a free cloud plan includes sufficient automatic backups, point-in-time recovery, or long-term retention. Confirm the selected provider's current plan limits and backup guarantees before production deployment. A separate backup/export process may be required.

## 9. Data integrity and business rules

These requirements apply to the factory data stored locally and in the cloud.

### 9.1 Inventory

- Stock movements must be recorded in a ledger.
- Stock balances should be derived from or reconciled against stock movements.
- Each stock movement must reference its source transaction where applicable.
- Purchase posting increases raw-material stock.
- Production posting decreases consumed raw materials and increases finished-product stock.
- Sale posting decreases finished-product stock.
- Corrections should use adjustment records rather than silently changing posted history.
- Negative stock should be prevented by default unless the owner explicitly approves a different policy.

### 9.2 Financial records

- Record actual cash movements separately from sales and purchase totals.
- Sales posted on credit increase receivables, not cash.
- Purchases posted but unpaid create payables, not cash outflows until payment occurs.
- Customer payments and supplier payments must be recorded separately from the original sale/purchase.
- AFN and USD cash balances must remain separate.
- Current AFN valuation of USD cash may use the latest saved exchange rate.
- Historical transaction AFN equivalents must use the rate snapshot saved with the transaction and must not change when the current rate changes.
- Currency exchange between cash accounts must be recorded as a transfer, not as a sale, purchase, or business expense.
- Owner contributions and withdrawals must be recorded as transfers/equity movements, not sales revenue or operating expenses.

### 9.3 Production

- Each production batch must record its input materials and actual finished output.
- Preserve the expected-yield configuration used when the batch was created.
- Calculate expected output and production variance using the agreed yield rules.
- Record material consumption and finished output as linked stock movements.
- Do not silently recalculate historical batches when yield settings change.
- Reusable scrap/waste handling remains a business-rule decision to confirm.

### 9.4 Posted records and audit history

- Posted financial and stock transactions must not be silently edited or deleted.
- Corrections should create reversal or adjustment records with references to the original.
- Keep an audit trail for important changes, including exchange-rate changes, settings changes, adjustments, and recovery/security events.
- Preserve original currency, original amount, transaction date, applied rate, and AFN equivalent.

## 10. Authentication, authorization, and security

- The system is initially designed for one factory owner.
- Public self-registration is not required unless later requested.
- Support secure owner authentication.
- Support secure sign-out and session expiration/refresh.
- Provide an account recovery process separate from factory data recovery.
- Enforce factory-level authorization on every backend operation.
- Use HTTPS/TLS for all network communication.
- Keep secrets out of the mobile application bundle.
- Use least-privilege backend credentials.
- Apply rate limits to login, recovery, and sensitive endpoints.
- Avoid exposing sensitive data in logs, analytics, notifications, or error messages.
- Provide a way to revoke access if a phone or recovery credential is compromised.
- Consider remote session revocation when another device is used to recover the factory.

Authentication and factory recovery are related but distinct:
- **Authentication** establishes who is using the app.
- **Factory recovery** identifies and authorizes restoration of a particular factory's data.
- A factory ID alone must never authorize access.

## 11. Network and connectivity requirements

- Detect connectivity changes.
- Treat connectivity as potentially unreliable; a connected network does not guarantee that the backend is reachable.
- Use request timeouts and retry with backoff.
- Avoid repeatedly attempting large uploads on a weak connection.
- Resume or safely retry interrupted uploads.
- Support synchronization over mobile data and Wi-Fi, subject to owner settings.
- Consider a setting to restrict large attachment uploads to Wi-Fi.
- Keep the core factory workflow available when the backend is unavailable.

## 12. Notifications and background work

The business requirements include reminders for:
- Daily exchange-rate entry, proposed for 6:00 AM.
- Daily production entry, proposed for 4:00 PM except Friday.
- Raw-material stock falling below its configured minimum.

Technical requirements:
- Use local notifications for reminders that must work without internet, subject to operating-system permissions and scheduling limitations.
- Evaluate platform restrictions on background execution; do not promise continuous background synchronization on mobile operating systems.
- Trigger synchronization when the app is opened/resumed and when reliable connectivity is detected.
- Use background tasks opportunistically where supported, but never make data safety depend on a background task running at an exact time.
- Notification logic must inspect saved records and stock levels, not merely whether a screen was opened.
- Provide notification settings and explain when notification permissions are disabled.

## 13. Application settings and configuration

The app should provide settings for:
- Factory/business profile.
- Owner account and security.
- Raw-material types and expected yields.
- Stock thresholds.
- Finished-product configuration.
- Expense categories.
- Exchange-rate settings and history.
- Notification schedules.
- Language and date/time display.
- Backup and synchronization status.
- Data export and recovery information.

Settings that affect future transactions must not silently alter historical records.

## 14. Reports and data export

- Reports must be generated from local data so they remain available offline.
- The app should support date filters such as today, week, month, year, and custom range.
- Provide practical export options such as PDF and spreadsheet/CSV, according to the agreed feature scope.
- Exported data should include relevant original currency and AFN equivalents.
- Export files may contain sensitive business information and must be handled securely.
- The app should clearly identify whether a report includes only locally available data or data synchronized from the cloud, although the local database is intended to contain the current working data.

## 15. Performance and usability requirements

- Common transaction forms should open and save quickly on supported phones.
- Saving a transaction locally must not wait for cloud synchronization.
- Lists and reports should use pagination or efficient queries where necessary.
- The database should be designed for years of transaction history, not just a small demonstration dataset.
- The app should provide understandable error messages and avoid technical jargon.
- The app should preserve unsaved form input where practical if interrupted.
- The owner must be able to identify whether a record is saved locally and whether it has been backed up.

## 16. App updates and database migrations

- Version the local SQLite schema.
- Include safe, tested database migrations.
- Back up or protect local data before risky migrations.
- Handle an app upgrade while offline.
- Ensure older pending records can still synchronize after an app update, or provide a controlled migration path.
- Version backend API contracts and synchronization payloads.
- Do not deploy a backend change that makes existing app versions silently lose or misinterpret pending data.
- Test upgrade paths from supported previous app versions.

## 17. Monitoring and operational requirements

- Monitor backend errors, synchronization failures, and backup failures.
- Use privacy-conscious diagnostics.
- Never include passwords, recovery codes, access tokens, or unnecessary financial details in telemetry.
- Provide a way to diagnose a sync failure using a non-sensitive error/reference ID.
- Monitor cloud storage and database usage against plan limits.
- Establish an owner-facing process for resolving a failed backup or exhausted storage quota.
- Define who is responsible for cloud account administration, billing, and recovery operations.

## 18. Suggested high-level data domains

The final database schema will be designed separately. At minimum, the system should account for these domains:

- Factories/businesses.
- Users and authentication identities.
- Factory access and recovery credentials.
- Suppliers.
- Customers.
- Raw-material definitions.
- Finished products.
- Purchases and purchase items.
- Purchase payments.
- Production batches and production inputs.
- Stock movements.
- Sales and sale items.
- Customer payments.
- Business expense categories and expenses.
- Cash accounts and cash transactions.
- Currency rates and historical rate snapshots.
- Currency exchange transfers.
- Owner contributions and withdrawals.
- Personal finance records, if included.
- Notifications and notification settings.
- Attachments and file metadata.
- Synchronization outbox/inbox or equivalent change tracking.
- Cloud snapshots/backup metadata.
- Audit events.
- Schema and API version metadata.

## 19. Testing requirements

Before production release, test at least the following:

### Offline operation
- Create purchases, sales, production batches, and expenses with airplane mode enabled.
- Close and reopen the app and verify that records remain.
- Restart the phone and verify local data remains accessible.
- Confirm that reports and inventory balances work offline.

### Synchronization
- Synchronize after creating multiple offline records.
- Interrupt the network during upload.
- Retry after a timeout.
- Confirm that no duplicate records are created.
- Confirm that only acknowledged records are marked backed up.
- Confirm that pending records remain after app termination or device restart.
- Test a large backlog of offline records.

### Recovery
- Create and synchronize a factory.
- Install the app on a clean replacement device.
- Restore using the recovery process.
- Verify purchases, sales, production, stock, cash, customers, suppliers, settings, and history.
- Test invalid, expired, revoked, and repeatedly attempted recovery credentials.
- Test restoration when a local factory already exists.
- Confirm the restored backup timestamp is displayed accurately.

### Data integrity
- Verify stock movement calculations.
- Verify cash ledger calculations.
- Verify historical exchange-rate snapshots.
- Verify that retries and duplicate requests do not double-apply transactions.
- Verify that corrections create auditable adjustments.
- Verify database migration and app upgrade paths.

### Backup operations
- Test snapshot creation and retention.
- Test restoration from a snapshot.
- Test recovery from a corrupted or incomplete backup.
- Document backup restoration procedures and responsibilities.

## 20. Important limitations and risks

1. **Unsynchronized data cannot be recovered from the cloud.** If the phone is lost before the latest local changes upload, those changes may be lost.
2. **Background synchronization is not guaranteed to run continuously.** Mobile operating systems control background execution. The app must also sync when opened or resumed.
3. **Free cloud plans are not a production backup strategy by themselves.** Plan limits, inactivity policies, backup availability, and retention can change.
4. **A recovery code is sensitive.** If stolen, it may expose factory records unless additional verification is required.
5. **Local SQLite is not automatically encrypted.** Local database protection must be explicitly designed and tested.
6. **Cloud synchronization is not the same as a backup.** Synchronization can propagate accidental changes or deletions. Independent snapshots and tested restoration are required.
7. **Multi-device editing increases complexity.** The initial design should prioritize one owner and one primary phone unless multi-device access is confirmed as a requirement.

## 21. Decisions still requiring confirmation

1. Should factory restoration require recovery code only, recovery code plus PIN, or recovery code plus account login?
2. Can the owner create and use a new factory entirely offline before the first cloud registration?
3. Should synchronization use mobile data automatically, or should there be a Wi-Fi-only option?
4. How many days or months should cloud snapshots and exports be retained?
5. Is a paid cloud plan acceptable for dependable production backups?
6. Is the app strictly limited to one phone at a time, or should the owner be able to use two phones?
7. Should local database encryption be mandatory, and what device compatibility is required?
8. Should receipt/attachment files synchronize automatically or only over Wi-Fi?
9. What languages must the app support at launch?
10. Who will own and administer the cloud project and billing account?

## 22. Proposed baseline

Unless changed during planning, the recommended baseline is:

- React Native + Expo + TypeScript.
- SQLite on the phone as the primary operational database.
- Offline-first operation for all core factory workflows.
- Supabase PostgreSQL as the preferred cloud database.
- Secure backend API/server-side functions between app and database.
- Supabase Storage or equivalent for attachments.
- Automatic, retryable, idempotent synchronization when connectivity is available.
- Factory-specific access control and a secure recovery credential.
- Cloud snapshots plus an independently tested restore process.
- Clear display of pending records and last successful cloud synchronization.
- No implementation until the requirements and unresolved decisions are agreed.

---

**End of document**
