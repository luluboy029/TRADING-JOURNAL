# Firestore Security rules specification

## 1. Data Invariants
- A trade log cannot exist without a valid `ownerId` matching the authenticated user's `request.auth.uid`.
- Document ID (`tradeId`) must be a valid alphanumeric or hyphenated string under 128 characters: `isValidId(tradeId)`.
- Timestamps can only be created as equal to the current server timestamp `request.time`.
- String fields like `symbol`, `setup`, and `notes` must have reasonable size limits to prevent Denial of Wallet.
- Enum fields like `status`, `assetClass`, and `side` must be strictly restricted to the valid string list.
- Positive-value numbers for fields such as `entryPrice`, `quantity`, and `fees` must be enforced.

## 2. The Dirty Dozen Payloads
We define twelve attempts that must return `PERMISSION_DENIED` under the zero-trust ABAC rule construct:

1. **Unauthenticated Creation**: Anyone trying to create a trade without being authenticated.
2. **Identity Spoofing**: Authenticated user trying to create a trade with `ownerId` setting another user's UID.
3. **Empty / Garbage ID**: Document ID containing illegal SQL injection or extremely large strings.
4. **Invalid AssetClass Enum**: Attempting to set `assetClass` to "InvalidAsset" which is outside the enum set.
5. **Invalid Side Enum**: Attempting to set `side` to "middle".
6. **Negative Fees Value**: Attempting to set `fees` to `-50.00`.
7. **Negative Quantity**: Attempting to set `quantity` to `-1.5`.
8. **Malicious Giant Notes**: Injecting 5MB string into the `notes` field.
9. **Tampering with OwnerId**: Authenticated user trying to edit someone else's trade record.
10. **Altering Immortals**: Trying to update `ownerId` once created.
11. **Malicious Query Scraping**: Non-owner trying to list/query someone else's trades collection using a blanket select.
12. **Tampering with timestamps**: Setting `entryDate` or update fields to arbitrary historical/future client times.

## 3. Test Runner Design (`firestore.rules.test.ts`)
The hypothetical test framework verifies:
```typescript
import { assertFails, assertSucceeds, initializeTestApp } from '@firebase/rules-unit-testing';

// All Dirty Dozen return PERMISSION_DENIED
```
