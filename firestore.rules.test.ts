/**
 * Security Rules Verification Spec — Dirty Dozen Payloads
 * Every attack payload below MUST evaluate to PERMISSION_DENIED against firestore.rules.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Identity spoofing on vendor create (mismatched ownerId)',
    operation: 'create',
    path: '/vendors/spoofed-baker',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { ownerId: 'user_b', name: 'Fake Baker' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Non-admin self-verifying vendor badge on create',
    operation: 'create',
    path: '/vendors/self-verified-baker',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { ownerId: 'user_a', verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow ghost field injection on vendor update',
    operation: 'update',
    path: '/vendors/valid-vendor',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { isAdminSponsored: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Mutating immutable ownerId on vendor update',
    operation: 'update',
    path: '/vendors/valid-vendor',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { ownerId: 'user_b' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Forged client timestamp instead of request.time',
    operation: 'create',
    path: '/vendors/backdated-vendor',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { ownerId: 'user_a', createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Admin email spoofing with email_verified=false',
    operation: 'update',
    path: '/vendors/valid-vendor',
    auth: { uid: 'attacker', email: 'crosscraftedin@gmail.com', email_verified: false },
    payload: { verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'PII blanket read on another user profile',
    operation: 'get',
    path: '/users/user_b',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Unauthorized third-party read of customer booking enquiry',
    operation: 'get',
    path: '/bookings/booking_1',
    auth: { uid: 'user_c', email: 'c@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Re-opening a Cancelled booking enquiry (terminal state lock)',
    operation: 'update',
    path: '/bookings/cancelled_booking_1',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { status: 'Confirmed Enquiry' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'ID poisoning with oversized / invalid characters in document ID',
    operation: 'create',
    path: `/vendors/${'x'.repeat(200)}`,
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { ownerId: 'user_a' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Array overflow attack exceeding max serviceAreas length',
    operation: 'create',
    path: '/vendors/array-bomb',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: {
      ownerId: 'user_a',
      serviceAreas: Array.from({ length: 15 }, (_, i) => `Area ${i}`),
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Non-admin self-promotion in /admins collection',
    operation: 'create',
    path: '/admins/user_a',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { uid: 'user_a' },
    expected: 'PERMISSION_DENIED',
  },
];
