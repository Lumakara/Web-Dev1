#!/usr/bin/env node

/**
 * Isolated Saweria via ApiNEOXR diagnostic.
 * This script is intentionally not imported by the application or checkout.
 * It fails closed when the undocumented Saweria login contract is unavailable.
 */

const BASE_URL = "https://api.neoxr.eu";
const REQUIRED = [
  "NEOXR_API_KEY",
  "SAWERIA_USER_ID",
  "SAWERIA_POC_AMOUNT",
  "SAWERIA_POC_MESSAGE",
];

function safe(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object") return value;
  return Array.isArray(value) ? value.map(safe) : Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      const sensitive = /key|token|secret|password|cookie|authorization|session/i.test(key);
      return [key, sensitive ? "[REDACTED]" : safe(entry)];
    }),
  );
}

function requiredEnvironment() {
  return REQUIRED.filter((name) => !process.env[name]);
}

async function getJson(path, params) {
  const url = new URL(path, BASE_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
  let payload = null;
  try { payload = await response.json(); } catch { payload = { non_json: true }; }
  return { httpStatus: response.status, ok: response.ok, payload: safe(payload) };
}

function findValue(value, keys) {
  if (!value || typeof value !== "object") return null;
  for (const [key, entry] of Object.entries(value)) {
    if (keys.includes(key.toLowerCase()) && entry !== undefined && entry !== null && entry !== "") return entry;
  }
  for (const entry of Object.values(value)) {
    const found = findValue(entry, keys);
    if (found !== null) return found;
  }
  return null;
}

function summarize(result) {
  return {
    httpStatus: result.httpStatus,
    ok: result.ok,
    success: findValue(result.payload, ["success", "status"]),
    message: findValue(result.payload, ["message", "msg"]),
  };
}

function parseProviderDate(value) {
  const candidate = String(value || "");
  const match = candidate.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
  if (match) return new Date(+match[3], +match[2] - 1, +match[1], +match[4], +match[5], +match[6]).getTime();
  return new Date(candidate).getTime();
}

function printReport(report) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

async function main() {
  const missing = requiredEnvironment();
  const report = {
    poc: "saweria-neoxr",
    productionCodeChanged: false,
    databaseChanged: false,
    gateway: "Saweria via ApiNEOXR",
    method: "QRIS only",
    documentation: {
      create: { method: "GET", path: "/api/saweria-create", parameters: ["userid", "amount", "message", "apikey"] },
      check: { method: "GET", path: "/api/saweria-check", parameters: ["userid", "id", "apikey"] },
      login: "UNKNOWN: public documentation does not specify a Saweria login endpoint or response contract",
      responseSchema: "UNKNOWN",
      statusMapping: "UNKNOWN",
    },
    security: { secretsPrinted: false, secretsPersisted: false },
  };

  if (missing.length) {
    report.status = "BLOCKED";
    report.rootCause = "Required environment variables are not configured";
    report.manualActionRequired = {
      variables: missing,
      setup: "Provide rotated credentials and POC amount/message through the process environment or secret manager; never commit .env or send secrets in chat.",
      expectedResult: "The script can proceed to the documented ApiNEOXR requests after the Saweria login contract is confirmed.",
    };
    printReport(report);
    process.exitCode = 2;
    return;
  }

  const common = { userid: process.env.SAWERIA_USER_ID, apikey: process.env.NEOXR_API_KEY };
  const create = await getJson("/api/saweria-create", {
    ...common,
    amount: process.env.SAWERIA_POC_AMOUNT,
    message: process.env.SAWERIA_POC_MESSAGE,
  });

  const paymentId = findValue(create.payload, ["id", "payment_id", "paymentid", "transaction_id", "transactionid"]);
  const qrData = findValue(create.payload, ["qr", "qris", "qr_string", "qrstring", "qr_url", "qrurl"]);
  const createData = create.payload && typeof create.payload.data === "object" ? create.payload.data : {};
  const amount = createData.amount_raw;
  const expiration = createData.expired_at;
  report.createPayment = {
    ...summarize(create),
    paymentIdPresent: Boolean(paymentId),
    qrDataPresent: Boolean(qrData),
    amountPresent: amount !== null,
    amountCoversOrder: Number(amount) >= Number(process.env.SAWERIA_POC_AMOUNT),
    fee: Number(amount) - Number(process.env.SAWERIA_POC_AMOUNT),
    expirationPresent: Boolean(expiration) && Number.isFinite(parseProviderDate(expiration)),
  };

  if (!create.ok || !paymentId || !qrData) {
    report.status = "FAILED";
    report.rootCause = "Create Payment did not return the required payment ID and QR data.";
    report.createPayment.response = create.payload;
    printReport(report);
    process.exitCode = 1;
    return;
  }

  const check = await getJson("/api/saweria-check", { ...common, id: String(paymentId) });
  const paymentStatus = findValue(check.payload, ["status", "payment_status", "paymentstatus", "state"]);
  report.checkPayment = {
    ...summarize(check),
    statusPresent: paymentStatus !== null,
    paymentStatus,
  };

  const invalidId = await getJson("/api/saweria-check", { ...common, id: `invalid-poc-${Date.now()}` });
  const invalidKey = await getJson("/api/saweria-check", {
    userid: process.env.SAWERIA_USER_ID,
    id: String(paymentId),
    apikey: "invalid-poc-api-key",
  });
  const invalidUserId = await getJson("/api/saweria-create", {
    userid: `invalid-poc-${Date.now()}`,
    amount: process.env.SAWERIA_POC_AMOUNT,
    message: process.env.SAWERIA_POC_MESSAGE,
    apikey: process.env.NEOXR_API_KEY,
  });
  const invalidAmount = await getJson("/api/saweria-create", {
    ...common,
    amount: "0",
    message: process.env.SAWERIA_POC_MESSAGE,
  });
  report.negativeTests = {
    invalidPaymentId: summarize(invalidId),
    invalidApiKey: summarize(invalidKey),
    invalidUserId: summarize(invalidUserId),
    invalidAmount: summarize(invalidAmount),
  };

  const negativeRejected = [invalidId, invalidKey, invalidUserId, invalidAmount].every((result) => {
    const success = findValue(result.payload, ["success", "status"]);
    return !result.ok || success === false || success === "false";
  });
  report.statusVerification = {
    checkRequestAccepted: check.ok,
    statusReturned: paymentStatus !== null,
    negativeTestsRejected: negativeRejected,
  };
  report.status = check.ok && paymentStatus !== null && report.createPayment.amountCoversOrder
    && report.createPayment.expirationPresent && negativeRejected ? "PASSED" : "FAILED";
  printReport(report);
  if (report.status !== "PASSED") process.exitCode = 1;
}

main().catch((error) => {
  printReport({ poc: "saweria-neoxr", status: "FAILED", error: "Unexpected diagnostic failure", detail: error instanceof Error ? error.message : "unknown" });
  process.exitCode = 1;
});
