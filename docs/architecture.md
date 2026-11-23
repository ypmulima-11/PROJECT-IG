# Domain and deployment notes

## Domain responsibilities

- `HotspotLocation` carries the identity and adapter kind of one managed site/router.
- `CustomerSession` owns mutable session state and session actions such as pause, resume, extension, and rate cap.
- `SubscriptionPlan` and `VoucherBatch` describe saleable access and generated voucher inventory.
- `LedgerEntry` is immutable once recorded; reconciliation rejects unverified receipts and duplicate payment references.
- `BaseRouterAdapter` is the network boundary. Concrete adapters implement the same contract; services never construct vendor-specific commands.
- `RadiusAccountingService` delegates client actions to the adapter registered for a location and aggregates live sessions.
- `PaymentProvider` isolates each collection channel. `BillingService` coordinates provider verification and ledger reconciliation.

## Accounting flow

```text
Payment request -> BillingService -> PaymentProvider.collectPayment()
                                  <- verified PaymentReceipt
                 -> LedgerReconciliationService.recordVerifiedReceipt()
                 -> immutable LedgerEntry -> ledger repository
```

The demo providers mark a local fixture receipt as verified to demonstrate the control flow. A production implementation must replace that behavior with the provider's API and signature or status verification. An HTTP success response from a browser or handset is never sufficient evidence for a verified ledger entry.

## Router flow

```text
HTTP controller -> RadiusAccountingService -> BaseRouterAdapter
                                             ├─ MikroTikAdapter
                                             ├─ OpenWrtAdapter
                                             └─ GenericRadiusAdapter
```

The runnable adapters operate on the in-memory demo session repository. Production adapters should use per-location credentials from a secret store, enforce command timeouts, audit operator actions, and update `radacct` idempotently from FreeRADIUS accounting events. Keep API credentials and router secrets outside the schema and browser bundle.

## Persistence and eventing

The SQL schema is the durable source of truth. FreeRADIUS tables are retained for standard credential and accounting integration. Redis is an optional cache for ephemeral presence and counter deltas; periodically reconcile counters and sessions to PostgreSQL so cache loss cannot rewrite financial records. Socket.IO sends snapshots for this starter; a production deployment can publish location-scoped events after authorization. The responsive Next.js UI has a PWA manifest and caches previously visited same-origin assets for a basic offline shell.

## Security and scale before production

Add operator authentication, location-level authorization, audit records, request validation, rate limits, secrets management, webhook signature checks, and reconciliation jobs. Protect exports and session controls with the same authorization checks as the dashboard. Use database transactions and a unique constraint on payment references for concurrent payment callbacks. Never trust client-supplied amounts or mark an entry verified without server-side provider evidence.
