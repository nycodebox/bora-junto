# BoraJunto Firestore Security Specification (Phase 0)

## Data Invariants
1. **Academic Identity**: Only authenticated users with `email_verified == true` and `.edu.br` email (or authorized admins) can create/join groups, send messages, share GPS, or submit reports.
2. **PII Isolation**: Private user data (`email`, `phone`, `defaultDestinationLabel`) lives in `/users/{userId}/private/info` and is readable/writable ONLY by the owner or an administrator.
3. **Group Membership Gate**: Subcollections `/members`, `/payments`, `/liveLocations`, and `/messages` verify membership via `get()` on the parent `/groups/{groupId}` document.
4. **Payment & Ride Start Lock**: Only the group leader or confirmed payer (within allowed keys) may update `/payments/{memberId}`. Only the leader can transition `status` to `in_progress` or remove members.
5. **Ephemeral Location Privacy**: `/liveLocations/{memberId}` can only be read by active group members and written by the owner while the parent group `status == 'in_progress'`.
6. **Moderation Integrity & Audit**: Common users cannot change report `status` to moderation outcomes or write to `/moderationLogs`. Only admins can resolve reports, apply `moderationStatus` blocks, and append to `/moderationLogs`. Target users may only submit `contestNote` on reports naming them.

## Dirty Dozen Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Unverified Email Group Create**: `request.auth.token.email_verified == false` creating `/groups/g1`.
2. **Non-Academic Email Write**: `request.auth.token.email == 'hacker@gmail.com'` creating `/users/u1`.
3. **Cross-User PII Read**: User B reading `/users/userA/private/info`.
4. **Self-Assigned Admin / Unblock**: User A updating `moderationStatus: 'active'` on `/users/userA` when blocked or injecting `role: 'admin'`.
5. **Shadow Ghost Field Injection**: Creating `/groups/g1` with extra undeclared field `isFeatured: true`.
6. **Impersonated Author**: User B creating `/groups/g1/messages/m1` with `senderId: 'userA'`.
7. **Non-Member Live Location Snooping**: User C (not in `memberIds`) reading `/groups/g1/liveLocations/userA`.
8. **GPS Write When Trip Completed**: Member writing `/groups/g1/liveLocations/userA` when `group.status == 'completed'`.
9. **Non-Leader Confirming Other's Payment**: Passenger B updating `/groups/g1/payments/userA` with `paymentConfirmed: true`.
10. **Non-Leader Starting Ride**: Passenger B updating `/groups/g1` `status: 'in_progress'`.
11. **Terminal State Mutation**: Any student updating `/groups/g1` after `status == 'completed'`.
12. **User Tampering Moderation Logs**: Student creating or deleting `/moderationLogs/log1` or changing `/reports/r1` `status` to `'arquivada'`.
