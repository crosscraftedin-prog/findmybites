# Security Specification — FindMyBites × PimpMyParty

## Data Invariants
1. **Vendors (`/vendors/{vendorId}`)**:
   - Publicly readable only when `status == 'active'`; paused storefronts are readable only by `ownerId` or admin.
   - `ownerId` is immutable after creation and must match `request.auth.uid` on create.
   - Non-admin owners cannot self-verify (`verified == false` on create, immutable on update) or spoof `rating`/`reviewCount`.
   - `gallery` is strictly bounded to at most 6 entries; `promoBanner` is capped at 120 chars.
2. **Users (`/users/{userId}`)**:
   - Contains private PII (`email`); `get` is restricted strictly to `isOwner(userId) || isAdmin()`, and `list` is `false`.
3. **Bookings (`/bookings/{bookingId}`)**:
   - Accessible strictly to `customerId`, `vendorOwnerId`, or admin. Terminal states (`Completed`, `Cancelled`) are locked.
4. **Reviews (`/reviews/{reviewId}`)**:
   - Contains no private PII; publicly readable.
   - Only verified signed-in users can create a review with `authorId == request.auth.uid`, integer/number `rating` in `1..5`, `comment` 5..600 chars, and `createdAt == request.time`.
   - Reviews are immutable (`allow update: if false`) and deletable only by author or admin.
5. **Event Requests (`/eventRequests/{requestId}`) & Quotes (`/eventRequests/{requestId}/quotes/{quoteId}`)**:
   - Event requests contain no customer PII (`email`/`phone` forbidden by `hasOnly`).
   - Open requests (`status == 'open'`) are readable by verified users so local vendors can quote; closed requests are readable only by `customerId` or admin.
   - Terminal state `closed` locks further non-admin updates.
   - Quotes enforce the Master Gate: parent `/eventRequests/{requestId}` MUST exist and have `status == 'open'` on create; quotes are readable strictly by the parent request's `customerId`, the quoting `vendorOwnerId`, or admin.
6. **Vendor Metrics (`/vendorMetrics/{vendorId}`)**:
   - Publicly readable (`get`) for displaying storefront views/clicks.
   - Verified users may initialize with values `0..1` or monotonically increment each counter (`views`, `whatsappClicks`, `shares`) by at most `+1` per write with `updatedAt == request.time`. Deletes forbidden except admin.

## The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Vendor Self-Verification**: Non-admin creates vendor with `verified: true`.
2. **Vendor Shadow Field**: Owner updates vendor adding ghost field `isTopRanked: true`.
3. **User PII Scrape**: Authenticated User B attempts `get` or `list` on `/users/userA`.
4. **Booking Terminal Mutation**: Vendor tries to reopen a `Cancelled` booking back to `Confirmed Enquiry`.
5. **Review Author Spoofing**: User A creates review with `authorId: 'userB'`.
6. **Review Rating Overflow**: User A creates review with `rating: 99` or `comment: ''`.
7. **Review Tampering**: User A tries to `update` an existing review.
8. **Event Request PII Injection**: Customer posts event request with extra ghost field `customerPhone: '+919999999999'`.
9. **Event Request Reopen**: Customer attempts to change a `closed` event request back to `open`.
10. **Orphan / Closed Quote Attack**: Vendor submits a quote under a non-existent or `closed` event request ID.
11. **Quote Cross-Vendor Snooping**: Vendor B attempts to `get` Vendor A's quote on Customer C's event request.
12. **Metrics Inflation / Negative Attack**: User tries to set `views: 99999` or decrement `views` in `/vendorMetrics/{vendorId}`.
