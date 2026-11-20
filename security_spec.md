# FindMyBites × PimpMyParty — Firestore Security Specification

## 1. Data Invariants
1. **Default Deny**: All unmatched Firestore paths deny read and write (`match /{document=**} { allow read, write: if false; }`).
2. **Vendor Identity & Moderation Integrity**:
   - A vendor document can only be created by an authenticated, email-verified user with `ownerId == request.auth.uid`.
   - Non-admin vendors cannot self-assign `verified: true` on creation or update.
   - `ownerId` and `createdAt` are immutable after creation; `createdAt` and `updatedAt` must equal `request.time`.
   - Public discovery (`list`) only exposes documents where `resource.data.status == 'active'`.
3. **Private PII Isolation**:
   - `/users/{userId}` stores personal `email` and `savedVendorIds`; strictly readable and writable only by `request.auth.uid == userId` (or verified admin). Collection `list` is forbidden (`allow list: if false;`).
   - `/bookings/{bookingId}` stores customer contact details (`customerEmail`, `customerName`); readable and listable strictly by the customer (`resource.data.customerId == request.auth.uid`), the target vendor owner (`resource.data.vendorOwnerId == request.auth.uid`), or a verified admin.
4. **Booking Terminal State Locking**:
   - Once a booking status transitions to `'Completed'` or `'Cancelled'`, non-admin users cannot modify it further.
5. **Bounded Payloads & Path Hardening**:
   - Every single-document operation validates document IDs via `isValidId()` (`<= 128` chars, `^[a-zA-Z0-9_\-]+$`).
   - Every string field enforces `.size()` limits, and arrays (`serviceAreas`, `specialties`, `products`, `savedVendorIds`) enforce strict maximum lengths.

## 2. The "Dirty Dozen" Adversarial Attack Payloads
1. **Identity Spoofing on Vendor Create**: Authenticated user `uidA` creates `/vendors/v1` with `ownerId: "uidB"`. -> `PERMISSION_DENIED`
2. **Self-Verification Privilege Escalation**: Non-admin user creates `/vendors/v1` with `verified: true`. -> `PERMISSION_DENIED`
3. **Shadow Ghost Field Injection**: Vendor owner updates `/vendors/v1` adding an undeclared field `isFeaturedOverride: true`. -> `PERMISSION_DENIED`
4. **Immutable Owner Hijack**: Vendor owner updates `/vendors/v1` changing `ownerId` or `createdAt`. -> `PERMISSION_DENIED`
5. **Forged Client Timestamp**: User creates `/vendors/v1` with backdated `createdAt: Timestamp(2020-01-01)` instead of `serverTimestamp()`. -> `PERMISSION_DENIED`
6. **Email Spoofing Attack**: Unverified account with `email: "crosscraftedin@gmail.com"` and `email_verified: false` attempts admin write. -> `PERMISSION_DENIED`
7. **PII Blanket Read on `/users`**: Authenticated user `uidA` tries `get(/users/uidB)` or `list(/users)`. -> `PERMISSION_DENIED`
8. **Cross-Customer Booking Snooping**: Authenticated user `uidC` attempts `get(/bookings/b1)` belonging to `customerId: "uidA"` and `vendorOwnerId: "uidB"`. -> `PERMISSION_DENIED`
9. **Terminal State Re-Opening**: Customer attempts to update `/bookings/b1` from `status: "Cancelled"` back to `"Confirmed Enquiry"`. -> `PERMISSION_DENIED`
10. **ID Poisoning / Resource Exhaustion**: Attacker writes `/vendors/<500-char-junk-id>` or injects `description` > 1200 chars. -> `PERMISSION_DENIED`
11. **Unbounded Array Bomb**: Vendor submits 25 `products` (limit 20) or 15 `serviceAreas` (limit 10). -> `PERMISSION_DENIED`
12. **Self-Admin Promotion**: Regular user attempts to write `/admins/{theirUid}`. -> `PERMISSION_DENIED`
