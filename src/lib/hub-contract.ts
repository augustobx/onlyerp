import crypto from 'node:crypto';
import { z } from 'zod';
import { HUB_MODULES } from './hub-modules';

export class HubError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
const id = z.string().regex(/^[1-9][0-9]{0,8}$/);
const version = z.string().regex(/^[a-f0-9]{64}$/);
const text = z.string().trim().min(1).max(180);
const email = z.string().trim().toLowerCase().email().max(191);
const password = z.string().min(12).max(256);
const date = z.string().datetime({ offset: true });
const optionalText = z.string().trim().max(300).nullable().optional();
export const STATUSES = ['ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELED'] as const;
const base = { tenantId: id, version };
const modules = z.object(Object.fromEntries(HUB_MODULES.map(k => [k, z.boolean()])) as Record<typeof HUB_MODULES[number], z.ZodBoolean>).strict();
const limits = z.object({ maxUsers: z.number().int().min(1).max(100000), maxLocations: z.number().int().min(1).max(10000), maxWarehouses: z.number().int().min(1).max(10000) }).strict();
const plan = { name: text, description: z.string().max(4000), priceCents: z.number().int().min(0).max(100000000000), currency: z.literal('ARS'), active: z.boolean(), modules, limits };
export const commandSchemas = {
  'tenant.create': z.object({ name: text, slug: z.string().min(2).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), planId: id, ownerName: text, ownerUsername: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9@._+-]+$/), password, status: z.enum(['ACTIVE', 'TRIAL']), start: date, end: date }).strict(),
  'tenant.update': z.object({ ...base, name: text, slug: z.string().min(1).max(63), email: email.nullable().optional(), phone: optionalText, address: optionalText, cuit: optionalText }).strict(),
  'tenant.status': z.object({ ...base, status: z.enum(STATUSES) }).strict(),
  'subscription.update': z.object({ ...base, planId: id, status: z.enum(STATUSES), start: date, end: date, trialEndsAt: date.nullable().optional() }).strict(),
  'subscription.renew': z.object({ ...base, days: z.number().int().min(1).max(3650) }).strict(),
  'module.set': z.object({ ...base, key: z.enum(HUB_MODULES), enabled: z.boolean().nullable(), limit: z.null().optional() }).strict(),
  'admin.update': z.object({ ...base, userId: id, name: text, username: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9@._+-]+$/), password: password.optional() }).strict(),
  'admin.revoke': z.object({ ...base, userId: id }).strict(),
  'plan.create': z.object({ ...plan, code: z.string().min(2).max(50).regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/) }).strict(),
  'plan.update': z.object({ ...plan, planId: id, version }).strict(),
  'payment.record': z.object({ ...base, amountCents: z.number().int().min(1).max(100000000000), currency: z.literal('ARS'), method: text, reference: z.string().trim().min(1).max(128), notes: z.string().max(4000), month: z.number().int().min(1).max(12), year: z.number().int().min(2000).max(2100), dueAt: date, paidAt: date.nullable().optional(), applySubscription: z.boolean() }).strict(),
} as const;
export type HubOperation = keyof typeof commandSchemas;
export const OPERATIONS = Object.keys(commandSchemas) as HubOperation[];
export const rootSchema = z.object({ requestId: z.string().uuid(), actor: z.string().regex(/^[a-zA-Z0-9@._:+-]{1,120}$/), operation: z.enum(OPERATIONS as [HubOperation, ...HubOperation[]]), input: z.record(z.string(), z.unknown()) }).strict();
export type HubCommand = z.infer<typeof rootSchema>;
export const CATALOG = {
  operations: OPERATIONS, modules: [...HUB_MODULES], limits: ['maxUsers', 'maxLocations', 'maxWarehouses'], optionalLimits: [], currency: 'ARS', destructiveDelete: false,
  statuses: [...STATUSES], immutableSlug: true, tenantFields: ['email', 'phone', 'address', 'cuit'], paymentCalendar: true, adminIdentity: 'username', ownerIdentity: 'username', domainManagement: false,
};
export function canonical(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
  return JSON.stringify(value) ?? 'null';
}
export function fingerprint(value: unknown): string { return crypto.createHash('sha256').update(canonical(value)).digest('hex'); }
export function requestDigest(command: HubCommand, key: string): string { return crypto.createHmac('sha256', key).update(canonical(command)).digest('hex'); }
function equals(a: string, b: string) { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); }
export function authenticateBearer(req: Request, kind: 'read' | 'management', env = process.env): string {
  const enabled = kind === 'read' ? env.HUB_INTEGRATION_ENABLED : env.HUB_MANAGEMENT_ENABLED;
  const key = kind === 'read' ? env.HUB_INTEGRATION_TOKEN || '' : env.HUB_MANAGEMENT_TOKEN || '';
  if (enabled !== 'true' || Buffer.byteLength(key) < 32 || (env.HUB_INTEGRATION_TOKEN && env.HUB_INTEGRATION_TOKEN === env.HUB_MANAGEMENT_TOKEN)) throw new HubError(503, 'DISABLED', 'Integración no configurada.');
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!equals(token, key)) throw new HubError(401, 'UNAUTHORIZED', 'Credencial de servicio requerida.');
  return key;
}
export function authenticateSignature(req: Request, body: string, key: string, now = Date.now()): string {
  const actor = req.headers.get('x-nanolabs-actor') || '', timestamp = req.headers.get('x-nanolabs-timestamp') || '', signature = req.headers.get('x-nanolabs-signature') || '';
  if (!/^[a-zA-Z0-9@._:+-]{1,120}$/.test(actor) || !/^\d{13}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 60000 || !/^[a-f0-9]{64}$/.test(signature)) throw new HubError(401, 'SIGNATURE', 'Firma de servicio inválida o vencida.');
  const url = new URL(req.url), path = url.pathname + url.search;
  const expected = crypto.createHmac('sha256', key).update([timestamp, req.method, path, actor, body].join('\n')).digest('hex');
  if (!equals(signature, expected)) throw new HubError(401, 'SIGNATURE', 'Firma de servicio inválida o vencida.');
  return actor;
}
export async function limitedBody(req: Request): Promise<string> {
  const declared = Number(req.headers.get('content-length') || 0);
  if (!Number.isFinite(declared) || declared < 0 || declared > 32768) throw new HubError(413, 'BODY_LIMIT', 'Solicitud demasiado grande.');
  const reader = req.body?.getReader(); if (!reader) return '';
  const chunks: Uint8Array[] = []; let size = 0;
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 32768) { void reader.cancel(); throw new HubError(413, 'BODY_LIMIT', 'Solicitud demasiado grande.'); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
}
export function period(start: string, end: string, status?: string, trial?: string | null, now = new Date()) {
  const a = new Date(start), b = new Date(end), t = trial ? new Date(trial) : null;
  if (!Number.isFinite(+a) || !Number.isFinite(+b) || b <= a || b.getUTCFullYear() > 2100 || a.getUTCFullYear() < 2000) throw new HubError(422, 'INVALID_PERIOD', 'El vencimiento debe ser posterior al inicio.');
  if (status === 'ACTIVE' && (b <= now || a > now)) throw new HubError(422, 'INVALID_PERIOD', 'Activar exige un período vigente.');
  if (status === 'TRIAL' && (!t || t <= now || t > b || t <= a || a > now)) throw new HubError(422, 'INVALID_PERIOD', 'La prueba necesita una fecha futura dentro del período.');
  return { start: a, end: b, trial: t };
}
