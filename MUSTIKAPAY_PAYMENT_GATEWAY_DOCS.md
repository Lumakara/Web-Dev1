# MustikaPay Payment Gateway — Integration Reference for Codex

> Purpose: single source of truth for implementing and reviewing MustikaPay payment integration in a Node.js/TypeScript backend.
>
> API documentation supplied by the user: MustikaPay API v1.6.
> Official site: https://mustikapayment.com/
> Official API guide: https://mustikapayment.com/api-guide
> Node.js SDK: `mustikapay-node` (npm package; web search found version 1.4.1 published recently).

## 1. Critical instructions for the coding agent

1. Treat MustikaPay as a **server-side payment provider**. Never put `X-Api-Key` in frontend/browser code.
2. Store the API key only in environment variables/secrets.
3. Use the existing project's architecture and conventions. Do not introduce a second payment abstraction if one already exists.
4. Do not trust a frontend success callback as proof of payment.
5. The authoritative payment state must come from the backend: webhook first, with server-side status verification/reconciliation.
6. Webhook processing MUST be idempotent. A webhook can be retried and the same event must never credit an order twice.
7. Always match the provider transaction to an internal order/invoice using a stable internal identifier such as `order_id`, while also persisting MustikaPay `ref_no` and `provider_ref` when available.
8. Never mark an order as paid merely because an API request to create QRIS/VA/E-Money succeeded. Creation only means a payment instruction was created.
9. Preserve raw provider responses where the project's security/privacy model permits them. At minimum persist the fields required for reconciliation and debugging.
10. Before changing the integration, inspect the repository for existing payment services, database schema, Edge Functions/API routes, environment variables, webhook handlers, and tests.
11. Do not silently change the project's existing primary/fallback payment strategy. Follow the project's documented business rules.
12. If the provider's live behavior conflicts with this document, verify against the live official API/docs and then update the implementation/documentation rather than guessing.

## 2. Provider overview

MustikaPay presents itself as a payment integration layer for Indonesian payments and advertises official SDKs for Node.js and Python. Its public site describes MustikaPay as an intermediary layer using SNAP API infrastructure; the site states that settlement and held balances are processed by the underlying payment-gateway infrastructure. Verify any business/legal assumptions against the merchant agreement before relying on them.

Web research also found:
- npm package: `mustikapay-node`
- Search result currently identifies it as an official Node.js SDK for MustikaPay and showed version `1.4.1`.
- MustikaPay's Python SDK is published as `mustikapay-sdk`.
- The public MustikaPay site advertises Node.js and Python SDK support.

Do not infer undocumented SDK methods. The API contract below is the primary reference supplied for this project.

## 3. Authentication

Production base URL:

`https://mustikapayment.com`

Every API request requires:

```http
X-Api-Key: MP-xxxxxxxxxxxxxxxx
```

Classic POST endpoints use:

```http
Content-Type: application/x-www-form-urlencoded
```

SNAP Checkout and webhook payloads use JSON:

```http
Content-Type: application/json
```

Security:
- API key belongs on the backend only.
- Use environment variables/secrets.
- Never commit it to Git.
- Never return it in API responses.
- Never expose it to React/Vite/browser bundles.
- Rotate it if leaked.

Recommended environment variable:

```env
MUSTIKA_API_KEY=MP-xxxxxxxxxxxxxxxx
MUSTIKA_BASE_URL=https://mustikapayment.com
```

## 4. Node.js SDK

Official package named by MustikaPay:

```bash
npm install mustikapay-node
```

Documented CommonJS usage:

```js
const { MustikaPay } = require('mustikapay-node');

const mp = new MustikaPay({
  apiKey: process.env.MUSTIKA_API_KEY
});

const qris = await mp.createQris({
  amount: 10000,
  product_name: 'Pulsa 10k',
  customer_name: 'Budi Santoso'
});

console.log(qris.payment_link);
```

Documented VA example:

```js
const { MustikaPay, BankCode } = require('mustikapay-node');

const mp = new MustikaPay({
  apiKey: process.env.MUSTIKA_API_KEY
});

const va = await mp.createVa({
  amount: 50000,
  bankCode: BankCode.BCA,
  name: 'Budi Santoso'
});

console.log(va.payment_link);
```

Important:
- Inspect the installed package in the actual repository before depending on exact method names/types.
- Do not assume the README/API-guide examples and the installed SDK version are identical.
- If the project already uses direct HTTP/fetch, do not migrate to the SDK solely for style; use the approach that best fits the existing architecture and testability.

## 5. Payment methods

### 5.1 QRIS

Endpoint:

`POST /api/v1/create/qris`

Required:
- `amount` integer IDR, minimum 1,000

Optional:
- `product_name`
- `customer_name`
- `expiry` in minutes; default 30
- `redirect_url`
- `user` if not using API key

Example:

```js
const qris = await mp.createQris({
  amount: 10000,
  product_name: 'Pulsa 10k',
  customer_name: 'Budi Santoso'
});
```

Example response:

```json
{
  "status": "success",
  "ref_no": "QR1776670534209",
  "qr_url": "https://mustikapayment.com/api/qr?...",
  "payment_link": "https://mustikapayment.com/pay/QR1776670534209",
  "amount": 10000
}
```

Persist at least:
- internal order ID
- amount
- MustikaPay `ref_no`
- payment URL/QR URL
- provider status
- expiry
- creation timestamp

### 5.2 E-Money

Endpoint:

`POST /api/v1/create/emoney`

Required:
- `amount`
- `product_code`
- `phone`

Supported product codes:
- `PAYDANA`
- `PAYSHOPEE`
- `PAYOVO`
- `PAYLINK`

Optional:
- `name`
- `product_name`
- `order_id`
- `expiry`
- `redirect_url`

Example:

```bash
curl -X POST https://mustikapayment.com/api/v1/create/emoney \
  -H "X-Api-Key: YOUR_API_KEY" \
  -d "amount=10000" \
  -d "product_code=PAYDANA" \
  -d "phone=081234567890" \
  -d "name=Budi Santoso" \
  -d "product_name=Topup Saldo" \
  -d "order_id=INV-001" \
  -d "expiry=15"
```

Response includes:
- `ref_no`
- `provider_ref`
- `payment_link`
- `data.partnerReferenceNo`
- `data.referenceNo`
- `data.urlPayment`

### 5.3 Virtual Account

Endpoint:

`POST /api/v1/create/va`

Required:
- `amount`, minimum 10,000
- `bank_code`
- `name`

Optional:
- `phone`
- `product_name`
- `expiry`
- `redirect_url`

Supported examples:
- BCA
- BNI
- BRI
- MANDIRI
- PERMATA
- CIMB
- DANAMON
- BSI

Example:

```bash
curl -X POST https://mustikapayment.com/api/v1/create/va \
  -H "X-Api-Key: YOUR_API_KEY" \
  -d "amount=50000" \
  -d "bank_code=BCA" \
  -d "name=Budi Santoso" \
  -d "phone=081234567890" \
  -d "product_name=Pembayaran Order" \
  -d "expiry=1440"
```

Response contains:
- `ref_no`
- `provider_ref`
- `payment_link`
- `data.virtualAccountNo`
- `data.virtualAccountName`
- `data.partnerReferenceNo`

### 5.4 Retail

Endpoint:

`POST /api/v1/create/retail`

Required:
- `amount`, minimum 15,000 and maximum 5,000,000
- `retail_outlet`: `ALFAMART` or `INDOMARET`
- `name`

Optional:
- `phone`
- `product_name`
- `expiry`
- `redirect_url`

Response contains:
- `ref_no`
- `provider_ref`
- `payment_link`
- `data.paymentCode`
- `data.partnerReferenceNo`

## 6. SNAP Checkout

Endpoint:

`POST /snap/v1/transactions`

This endpoint uses JSON and is a two-step flow.

Backend:
1. Send `X-Api-Key`.
2. Create the transaction.
3. Receive `snap_token`.
4. Return only the required checkout information to the frontend.

Frontend:
1. Load `https://mustikapayment.com/assets/snap.js`.
2. Call `window.snap.pay(token, callbacks)`.

Request shape:

```json
{
  "transaction_details": {
    "order_id": "ORDER-12345",
    "gross_amount": 50000
  },
  "customer_details": {
    "first_name": "Budi",
    "last_name": "Santoso",
    "email": "budi@example.com",
    "phone": "081234567890"
  },
  "item_details": [
    {
      "id": "SKU-1",
      "name": "Kaos MustikaPay",
      "price": 50000,
      "quantity": 1
    }
  ],
  "expiry": 60
}
```

Successful token response:

```json
{
  "status": "success",
  "snap_token": "TOKEN",
  "redirect_url": "https://mustikapayment.com/snap/v1/checkout/TOKEN"
}
```

CRITICAL:
`onSuccess` in the browser is UX feedback, not the authoritative source for fulfillment. The backend must confirm payment through webhook/status verification before granting goods, credit, balance, or order completion.

## 7. Status APIs

These are useful for polling, reconciliation, and webhook verification.

QRIS:

`GET /api/v1/check/qris?ref_no=...`

E-Money:

`GET /api/v1/check/emoney?ref_no=...`

VA:

`GET /api/v1/check/va?ref_no=...`

Retail:

`GET /api/v1/check/retail?ref_no=...`

Typical status values documented for QRIS:
- `pending`
- `success`
- `expired`

Status responses may include:
- `ref_no`
- `status`
- `type`
- `amount`
- `net_amount`
- `issuer`
- `payor`
- `settle_at`
- `timestamp`
- `receipt_url`

Use `net_amount` only when the business logic explicitly needs the amount after provider fee. Do not assume `net_amount === amount`.

## 8. Webhook

MustikaPay documents a JSON POST webhook for successful payments.

Supported service values:
- `QRIS`
- `EMONEY`
- `VA`
- `RETAIL`

Documented QRIS payload:

```json
{
  "status": "success",
  "service": "QRIS",
  "amount": 22500,
  "reference": "QR1776670534209",
  "order_id": null,
  "timestamp": "2026-04-20 14:36:26",
  "data": {
    "amount": 22500,
    "net_amount": 22342,
    "issuer": "DANA",
    "payor": "00***********",
    "product_name": "Pembayaran",
    "provider_ref": "QRA177667053434072901481024",
    "ref_no": "QR1776670534209",
    "rrn": "1nqcobu22660",
    "settle_at": "2026-04-21 13:00:00",
    "status": "SUCCESS",
    "type": "QRIS",
    "username": "Nauval"
  }
}
```

Expected response:

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "status": "received"
}
```

Documented retry policy if the webhook endpoint does not return HTTP 200:
- 1 minute
- 5 minutes
- 30 minutes
- 2 hours
- 6 hours
- up to 5 retries

### Webhook processing algorithm

1. Receive the raw JSON.
2. Validate basic schema.
3. Extract `reference` and/or `data.ref_no`.
4. Find the internal payment/order by stored provider reference.
5. If no order is found, log safely and return according to the project's operational policy; do not invent an order.
6. Verify the transaction server-to-server using the corresponding Check Status endpoint when possible.
7. Verify:
   - provider reference
   - expected amount
   - internal order ID if supplied
   - service/payment method
   - current internal order state
8. Use a database transaction/atomic update to make fulfillment idempotent.
9. If already paid/fulfilled, return HTTP 200 without performing fulfillment again.
10. Only after verified success, mark the payment/order paid and trigger fulfillment.
11. Respond HTTP 200 quickly.
12. Perform non-critical work asynchronously if the project's infrastructure supports it.

## 9. Idempotency and payment state machine

Recommended internal states:

`PENDING -> PAID`

Alternative terminal states:

`PENDING -> EXPIRED`
`PENDING -> FAILED`
`PENDING -> CANCELLED`

Do not allow:

`PAID -> PENDING`

Do not fulfill twice.

Recommended uniqueness:
- internal `order_id` unique
- provider `ref_no` unique
- provider `provider_ref` unique when available
- webhook event/reference deduplication key unique

The exact database constraints must follow the project's existing schema.

## 10. Payment creation vs payment confirmation

This distinction is mandatory.

Creation response:
- tells the application that a payment instruction was successfully created.
- does NOT prove the customer has paid.

Confirmation:
- webhook says payment succeeded, but still validate it.
- status endpoint provides server-to-server verification.
- only confirmed success can transition an order to `PAID`.

Frontend redirect/callback:
- useful for showing the user a result page.
- never use it as the only payment proof.

## 11. Receipt

Endpoint:

`GET /nota/{ref_no}.png`

Optional query:

`?refresh=1`

Success:
- HTTP 200
- `Content-Type: image/png`

Unavailable:
- HTTP 400 if transaction is not successful
- HTTP 404 if transaction does not exist

Receipt URL may also appear as `receipt_url` in status responses.

## 12. Utilities

Validate account:

`GET /api/validate-bank`

Parameters:
- `tipe`: `bank` or `ewallet`
- `kode`
- `rek`

Example response:

```json
{
  "status": "success",
  "account_name": "BUDI SANTOSO"
}
```

Balance:

`GET /api/v1/balance?user=YOUR_USERNAME`

Example:

```json
{
  "username": "username_anda",
  "balance_available": 1500000,
  "balance_pending": 0
}
```

## 13. Payment Links

Create reusable payment link:

`POST /api/payment-links/create`

Parameters:
- `title` required
- `description`
- `amount`
- `min_amount`
- `limit_use`
- `methods`: comma-separated `QRIS,VA,EMONEY,RETAIL`
- `expiry`
- `custom_slug`
- `template`: `minimal`, `glass`, `dark`, `vibrant`, `invoice`

Example result:

```json
{
  "status": "success",
  "slug": "donasi-pesantren",
  "url": "https://mustikapayment.com/l/donasi-pesantren"
}
```

Direct payment link:

`GET /pay/{username}/{amount}`

Optional:
- `order_id`
- `redirect`

## 14. Error handling for Node.js

Use explicit error classes if the installed SDK exposes them. The public Python SDK documentation shows the provider's intended pattern of separate authentication, validation, and general provider errors; do not assume the Node package exposes identical class names without inspecting it.

Recommended backend behavior:
- 4xx validation/authentication errors: return a safe application error.
- 5xx/provider/network errors: log diagnostic details server-side and return a generic error to the client.
- Timeout: treat as an unknown provider outcome for payment creation; do not blindly create a second transaction unless the operation is known to be safe/idempotent.
- Never expose API keys, raw authorization headers, or sensitive provider internals to the browser.

## 15. HTTP client guidance

If direct HTTP is used, keep the provider client isolated behind a service/module.

Example architecture:

```text
payment/
  mustika/
    client.ts
    types.ts
    create-qris.ts
    create-va.ts
    check-status.ts
    webhook.ts
    errors.ts
```

The exact paths should match the existing repository architecture.

Use:
- request timeout
- bounded retry only for safe/transient network failures
- structured logging
- no logging of API keys
- response validation
- database transaction for payment state changes

Do NOT blindly retry a payment-creation POST after an ambiguous timeout. First determine whether the original transaction was created, using an existing order/reference/status strategy.

## 16. Suggested TypeScript domain model

Adapt this to the project's actual schema; do not copy blindly:

```ts
type PaymentMethod = 'QRIS' | 'EMONEY' | 'VA' | 'RETAIL';

type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'EXPIRED'
  | 'FAILED'
  | 'CANCELLED';

interface PaymentRecord {
  orderId: string;
  provider: 'MUSTIKA';
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  providerRefNo?: string;
  providerRef?: string;
  paymentUrl?: string;
  qrUrl?: string;
  expiresAt?: string;
  paidAt?: string;
}
```

## 17. Project-specific implementation rules

If the repository already has a payment architecture, preserve it.

For this project, the documented intended provider strategy from previous implementation work is:

- Mustika is the primary payment provider.
- Rama is used only as the QRIS fallback after Mustika fails.
- Supabase is the runtime authentication/database layer.
- Payment state must be persisted server-side.
- Payment operations must be idempotent.

If the repository's current code differs from these rules, inspect the current implementation and report the discrepancy before changing business behavior.

## 18. Verification checklist for Codex

Before declaring the integration complete:

- [ ] No Mustika API key exists in frontend code.
- [ ] API key comes from environment/secret configuration.
- [ ] All Mustika calls are server-side.
- [ ] QRIS creation stores provider `ref_no`.
- [ ] VA creation stores provider `ref_no` and VA number.
- [ ] E-Money creation stores provider `ref_no`/`provider_ref`.
- [ ] Retail creation stores provider `ref_no`/payment code.
- [ ] `order_id` is stable and traceable to the internal order.
- [ ] Webhook endpoint accepts JSON.
- [ ] Webhook returns HTTP 200 after safe handling.
- [ ] Webhook is idempotent.
- [ ] Webhook does not trust client-side success.
- [ ] Webhook/status amount is compared with the internal order amount.
- [ ] Successful payment is verified server-to-server.
- [ ] Duplicate webhook cannot double-credit/double-fulfill.
- [ ] Ambiguous payment-creation timeouts are handled safely.
- [ ] Status polling/reconciliation exists where required by the product.
- [ ] Tests cover success, duplicate webhook, wrong amount, unknown reference, expired payment, provider error, and retry/timeout scenarios.
- [ ] Logs do not contain API keys or unnecessary personal/payment data.
- [ ] TypeScript/build/lint/tests pass.
- [ ] No Firebase/Firestore/Pakasir runtime code is reintroduced if the project has already migrated away from them.
- [ ] Existing Supabase architecture is preserved.

## 19. Official references and research notes

Official MustikaPay:
- https://mustikapayment.com/
- https://mustikapayment.com/api-guide
- https://mustikapayment.com/kode-bank

Node SDK:
- npm package name: `mustikapay-node`
- Public npm search currently lists `mustikapay-node` as an official Node.js SDK for MustikaPay and showed version `1.4.1`.

Python SDK:
- https://pypi.org/project/mustikapay-sdk/
- Public package documentation describes QRIS, VA, payout, account validation, custom exceptions, and enums.

Important research limitation:
- The npm package page itself returned HTTP 403 to the web crawler, so this document does NOT invent undocumented Node SDK internals.
- When Codex has repository/network access, inspect the installed `mustikapay-node` package (`package.json`, exports, TypeScript declarations, README, and source if available) and compare its actual API against this document before implementation.
- Prefer the official MustikaPay API documentation over third-party blog posts or copied snippets.

## 20. Agent directive

When implementing or repairing MustikaPay:

> Inspect first. Reuse the existing payment architecture. Keep secrets server-side. Treat creation as pending, not paid. Confirm payment through webhook plus server-side status verification. Make webhook and fulfillment idempotent. Never double-credit. Test failure and duplicate scenarios. Do not guess undocumented provider behavior.

