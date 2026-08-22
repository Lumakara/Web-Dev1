#!/usr/bin/env node

/** Import Firebase export data into Supabase with server-only credentials. */
import { readFile } from 'node:fs/promises';
import crypto from 'node:crypto';

const inputPath = process.argv[2];
const dryRun = process.argv.includes('--dry-run');
if (!inputPath) throw new Error('Usage: migrate-firebase-export.mjs <export.json> [--dry-run]');
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dryRun && (!supabaseUrl || !serviceKey)) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
const source = JSON.parse(await readFile(inputPath, 'utf8'));
const users = source.users ?? [];
const products = source.products ?? [];
const orders = source.orders ?? [];
const tickets = source.support_tickets ?? source.tickets ?? [];
const summary = { users: 0, profiles: 0, products: 0, orders: 0, tickets: 0, resetRequired: [] };

async function request(path, options = {}) {
  if (dryRun) return { id: options.body?.id ?? crypto.randomUUID() };
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path}: ${response.status} ${JSON.stringify(body)}`);
  return body;
}

for (const user of users) {
  if (!user.email) continue;
  const hasCompatiblePassword = typeof user.password === 'string' && user.password.length >= 8;
  const created = await request('/auth/v1/admin/users', {
    method: 'POST',
    body: { email: user.email, password: hasCompatiblePassword ? user.password : crypto.randomBytes(24).toString('base64url'), email_confirm: true, user_metadata: user.user_metadata ?? { full_name: user.displayName } },
  });
  const userId = created.id ?? user.localId ?? user.uid;
  summary.users += 1;
  if (!hasCompatiblePassword) summary.resetRequired.push(user.email);
  await request('/rest/v1/profiles', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: { user_id: userId, email: user.email, full_name: user.displayName ?? null, avatar_url: user.photoURL ?? null, role: user.role ?? 'customer', is_active: true } });
  summary.profiles += 1;
}
for (const [name, records] of [['products', products], ['orders', orders], ['support_tickets', tickets]]) {
  for (const record of records) {
    await request(`/rest/v1/${name}`, { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: record });
    summary[name === 'support_tickets' ? 'tickets' : name] += 1;
  }
}
console.log(JSON.stringify({ dryRun, ...summary }, null, 2));
