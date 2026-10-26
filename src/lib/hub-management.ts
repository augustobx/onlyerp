import { Prisma, PrismaClient, EstadoTenant } from '@prisma/client';
import { hashPassword } from './password';
import { HubError, CATALOG, commandSchemas, fingerprint, requestDigest, period, type HubCommand } from './hub-contract';
import { HUB_MODULES, effectiveModules, moduleOverrides } from './hub-modules';

const include = {
  plan: true,
  usuarios: { orderBy: { id: 'asc' as const }, select: { id: true, nombre: true, username: true, password: true, rol: true, activo: true, sessionVersion: true } },
  suscripciones: { orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }], take: 100 },
  _count: { select: { productos: true, clientes: true, ventas: true, usuarios: true, sucursales: true, depositos: true } },
} satisfies Prisma.TenantInclude;
type Tenant = Prisma.TenantGetPayload<{ include: typeof include }>;
type Plan = Prisma.PlanGetPayload<Record<string, never>>;
type Tx = Prisma.TransactionClient;
const nativeStatus = { ACTIVE: 'ACTIVO', TRIAL: 'PRUEBA', SUSPENDED: 'SUSPENDIDO', CANCELED: 'CANCELADO' } as const;
const wireStatus = { ACTIVO: 'ACTIVE', PRUEBA: 'TRIAL', SUSPENDIDO: 'SUSPENDED', CANCELADO: 'CANCELED' } as const;
const RESERVED = new Set(['onlyerp', 'onlycars', 'onlyfood', 'onlyturn', 'onlygym', 'onlypadel', 'onlymob', 'hub', 'api', 'www', 'admin', 'proxy', 'portainer', 'nanocontrol', 'nanomonitor']);
function fail(code: string, message: string, status = 422): never { throw new HubError(status, code, message); }
function numberId(id: string) { if (!/^[1-9][0-9]{0,8}$/.test(id)) fail('INVALID_INPUT', 'Identificador inválido.'); return Number(id); }
function shapePlan(p: Plan) {
  const modules = effectiveModules(p.modulos);
  return { id: String(p.id), code: p.codigo, name: p.nombre, description: p.descripcion || '', priceCents: Math.round(p.precio_mensual * 100), currency: 'ARS', active: p.activo, version: fingerprint(p), modules: Object.fromEntries(HUB_MODULES.map(k => [k, modules.includes(k)])), limits: { maxUsers: p.limite_usuarios, maxLocations: p.limite_sucursales, maxWarehouses: p.limite_depositos }, preservedFeatures: modules.filter(k => !(HUB_MODULES as readonly string[]).includes(k)) };
}
function access(t: Tenant) {
  const enabled = ['ACTIVO', 'PRUEBA'].includes(t.estado) && (!t.fecha_vencimiento || t.fecha_vencimiento > new Date());
  return { enabled, reason: enabled ? null : 'Empresa suspendida, cancelada o con membresía vencida.' };
}
function shapeTenant(t: Tenant) {
  const a = access(t), modules = effectiveModules(t.plan.modulos, t.modulos_override), overrides = moduleOverrides(t.plan.modulos, t.modulos_override);
  return {
    id: String(t.id), name: t.nombre, slug: t.slug, status: wireStatus[t.estado], rawStatus: t.estado,
    version: fingerprint(t), access: a,
    contact: { email: t.email, phone: t.telefono, address: t.direccion, cuit: t.cuit },
    domains: [{ hostname: t.slug + '.' + (process.env.TENANT_BASE_DOMAIN || 'nanoapps.ar'), primary: !t.dominio_personalizado, custom: false, verified: true }, ...(t.dominio_personalizado ? [{ hostname: t.dominio_personalizado, primary: true, custom: true, verified: false }] : [])],
    plan: shapePlan(t.plan),
    // Membership dates are native Tenant fields. Never invent a payment record.
    subscription: t.fecha_vencimiento ? { id: 'tenant:' + t.id, planId: String(t.planId), status: wireStatus[t.estado], start: t.fecha_alta.toISOString(), end: t.fecha_vencimiento.toISOString(), provider: 'manual' } : null,
    modules: Object.fromEntries(HUB_MODULES.map(k => [k, { enabled: modules.includes(k), override: overrides[k] ?? null }])),
    admins: t.usuarios.filter(u => u.rol === 'ADMIN').map(u => ({ id: String(u.id), name: u.nombre, username: u.username, email: '', role: u.rol, active: u.activo })),
    usage: { products: t._count.productos, clients: t._count.clientes, sales: t._count.ventas, users: t._count.usuarios, locations: t._count.sucursales, warehouses: t._count.depositos },
    payments: t.suscripciones.map(p => ({ id: String(p.id), amountCents: Math.round(p.monto * 100), currency: 'ARS', method: p.metodo_pago || '', reference: p.referencia_pago, notes: p.notas, status: p.estado, month: p.periodo_mes, year: p.periodo_anio, dueAt: p.fecha_vencimiento.toISOString(), paidAt: p.fecha_pago.toISOString(), createdAt: p.createdAt.toISOString() })),
  };
}
async function tenant(tx: Tx, id: string, expected?: string) {
  const n = numberId(id);
  if (expected) await tx.$queryRaw`SELECT id FROM Tenant WHERE id=${n} FOR UPDATE`;
  const t = await tx.tenant.findUnique({ where: { id: n }, include });
  if (!t) fail('NOT_FOUND', 'La empresa no existe.', 404);
  if (expected && shapeTenant(t).version !== expected) fail('STALE_VERSION', 'Los datos cambiaron. Actualizá antes de guardar.', 409);
  return t;
}
async function plan(tx: Tx, id: string, current?: number) {
  const p = await tx.plan.findUnique({ where: { id: numberId(id) } });
  if (!p || (!p.activo && p.id !== current)) fail('PLAN', 'El plan no está disponible para nuevas asignaciones.');
  return p;
}
function native(status: keyof typeof nativeStatus): EstadoTenant { return nativeStatus[status]; }

export function createHubManagement(db: PrismaClient) {
  async function read(query: URLSearchParams) {
    const resource = query.get('resource') || 'catalog', offsetText = query.get('offset') || '0';
    if (!/^\d{1,6}$/.test(offsetText)) fail('INVALID_INPUT', 'Paginación inválida.');
    const offset = Number(offsetText), take = 100;
    if (resource === 'catalog') return CATALOG;
    if (resource === 'plans') { const rows = await db.plan.findMany({ orderBy: { id: 'asc' }, skip: offset, take: take + 1 }); return { items: rows.slice(0, take).map(shapePlan), nextOffset: rows.length > take ? offset + take : null }; }
    if (resource === 'tenant') return shapeTenant(await tenant(db, query.get('tenantId') || ''));
    if (resource === 'audit') {
      const tid = query.get('tenantId');
      const rows = await db.hubCommand.findMany({ where: tid ? { tenantId: numberId(tid) } : {}, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: offset, take: take + 1 });
      return { items: rows.slice(0, take).map(r => ({ id: r.id, tenantId: r.tenantId === null ? null : String(r.tenantId), actor: r.actor, action: r.operation, entity: 'OnlyERP', entityId: r.tenantId === null ? null : String(r.tenantId), result: 'success', createdAt: r.createdAt.toISOString() })), nextOffset: rows.length > take ? offset + take : null };
    }
    fail('INVALID_INPUT', 'Recurso desconocido.');
  }
  async function readTenants(offset: number) {
    const rows = await db.tenant.findMany({ orderBy: { id: 'asc' }, skip: offset, take: 101, include });
    return { tenants: rows.slice(0, 100).map(t => { const v = shapeTenant(t); return { id: String(t.id), name: t.nombre, slug: t.slug, status: v.access.enabled ? v.status : v.status === 'CANCELED' ? 'CANCELED' : 'SUSPENDED', rawStatus: t.estado, createdAt: t.createdAt.toISOString(), plan: t.plan.nombre, planExpiresAt: t.fecha_vencimiento?.toISOString() || null, modules: Object.fromEntries(HUB_MODULES.map(k => [k, v.modules[k].enabled])), metrics: { available: true, totalRecords: t._count.productos, recordLabel: 'Productos' } }; }), nextOffset: rows.length > 100 ? offset + 100 : null };
  }
  async function perform(tx: Tx, cmd: HubCommand): Promise<Record<string, string>> {
    switch (cmd.operation) {
      case 'tenant.create': {
        const i = commandSchemas['tenant.create'].parse(cmd.input);
        if (RESERVED.has(i.slug)) fail('RESERVED_SLUG', 'Identificador reservado.');
        const p = await plan(tx, i.planId), d = period(i.start, i.end, i.status, i.status === 'TRIAL' ? i.end : null);
        const t = await tx.tenant.create({ data: { nombre: i.name, slug: i.slug, planId: p.id, estado: native(i.status), fecha_alta: d.start, fecha_vencimiento: d.end } });
        await tx.empresaConfig.create({ data: { tenantId: t.id, razon_social: i.name, nombre_fantasia: i.name } });
        const s = await tx.sucursal.create({ data: { tenantId: t.id, nombre: 'Casa Central' } });
        await tx.deposito.create({ data: { tenantId: t.id, sucursalId: s.id, nombre: 'Depósito Principal' } });
        await tx.listaPrecio.create({ data: { tenantId: t.id, nombre: 'Lista General', margen_defecto: 30 } });
        await tx.usuario.create({ data: { tenantId: t.id, nombre: i.ownerName, username: i.ownerUsername, password: hashPassword(i.password), rol: 'ADMIN', permisos: JSON.stringify(HUB_MODULES), sucursalId: s.id } });
        await tx.secuenciaPedido.create({ data: { tenantId: t.id } });
        await tx.secuenciaPresupuesto.create({ data: { tenantId: t.id } });
        await tx.secuenciaHojaDeRuta.create({ data: { tenantId: t.id } });
        return { tenantId: String(t.id) };
      }
      case 'tenant.update': {
        const i = commandSchemas['tenant.update'].parse(cmd.input), t = await tenant(tx, i.tenantId, i.version);
        if (i.slug !== t.slug) fail('RESERVED_SLUG', 'El identificador histórico se conserva.');
        await tx.tenant.update({ where: { id: t.id }, data: { nombre: i.name, ...(i.email !== undefined ? { email: i.email } : {}), ...(i.phone !== undefined ? { telefono: i.phone } : {}), ...(i.address !== undefined ? { direccion: i.address } : {}), ...(i.cuit !== undefined ? { cuit: i.cuit } : {}) } });
        return { tenantId: String(t.id) };
      }
      case 'tenant.status': {
        const i = commandSchemas['tenant.status'].parse(cmd.input), t = await tenant(tx, i.tenantId, i.version);
        if (['ACTIVE', 'TRIAL'].includes(i.status) && t.fecha_vencimiento && t.fecha_vencimiento <= new Date()) fail('SUBSCRIPTION', 'Renová la membresía antes de activar la empresa.');
        await tx.tenant.update({ where: { id: t.id }, data: { estado: native(i.status) } });
        return { tenantId: String(t.id) };
      }
      case 'subscription.update': {
        const i = commandSchemas['subscription.update'].parse(cmd.input), t = await tenant(tx, i.tenantId, i.version), p = await plan(tx, i.planId, t.planId), d = period(i.start, i.end, i.status, i.status === 'TRIAL' ? i.end : null);
        await tx.tenant.update({ where: { id: t.id }, data: { planId: p.id, estado: native(i.status), fecha_alta: d.start, fecha_vencimiento: d.end } });
        return { tenantId: String(t.id) };
      }
      case 'subscription.renew': {
        const i = commandSchemas['subscription.renew'].parse(cmd.input), t = await tenant(tx, i.tenantId, i.version);
        await tx.tenant.update({ where: { id: t.id }, data: { estado: 'ACTIVO', fecha_vencimiento: new Date(Math.max(Date.now(), +(t.fecha_vencimiento || 0)) + i.days * 86400000) } });
        return { tenantId: String(t.id) };
      }
      case 'module.set': {
        const i = commandSchemas['module.set'].parse(cmd.input), t = await tenant(tx, i.tenantId, i.version), overrides = moduleOverrides(t.plan.modulos, t.modulos_override);
        if (i.enabled === null) delete overrides[i.key]; else overrides[i.key] = i.enabled;
        await tx.tenant.update({ where: { id: t.id }, data: { modulos_override: Object.keys(overrides).length ? JSON.stringify(overrides) : null } });
        return { tenantId: String(t.id) };
      }
      case 'admin.update':
      case 'admin.revoke': {
        const i = cmd.operation === 'admin.update' ? commandSchemas['admin.update'].parse(cmd.input) : commandSchemas['admin.revoke'].parse(cmd.input), t = await tenant(tx, i.tenantId, i.version), u = t.usuarios.find(u => u.id === numberId(i.userId) && u.rol === 'ADMIN');
        if (!u) fail('ADMIN', 'Administrador fuera de esta empresa.', 403);
        const data: Prisma.UsuarioUpdateInput = { sessionVersion: { increment: 1 } };
        if (cmd.operation === 'admin.update') { const update = commandSchemas['admin.update'].parse(cmd.input); data.nombre = update.name; data.username = update.username; if (update.password) data.password = hashPassword(update.password); }
        await tx.usuario.update({ where: { id: u.id, tenantId: t.id }, data });
        return { tenantId: String(t.id) };
      }
      case 'plan.create':
      case 'plan.update': {
        const i = cmd.operation === 'plan.create' ? commandSchemas['plan.create'].parse(cmd.input) : commandSchemas['plan.update'].parse(cmd.input);
        let previous: Plan | null = null;
        if ('planId' in i) {
          const id = numberId(i.planId); await tx.$queryRaw`SELECT id FROM Plan WHERE id=${id} FOR UPDATE`;
          previous = await tx.plan.findUnique({ where: { id } });
          if (!previous) fail('NOT_FOUND', 'El plan no existe.', 404);
          if (fingerprint(previous) !== i.version) fail('STALE_VERSION', 'El plan cambió. Actualizá antes de guardar.', 409);
        }
        const historical = previous ? effectiveModules(previous.modulos).filter(k => !(HUB_MODULES as readonly string[]).includes(k)) : [];
        const data = { nombre: i.name, descripcion: i.description, precio_mensual: i.priceCents / 100, activo: i.active, modulos: JSON.stringify([...historical, ...HUB_MODULES.filter(k => i.modules[k])]), limite_usuarios: i.limits.maxUsers, limite_sucursales: i.limits.maxLocations, limite_depositos: i.limits.maxWarehouses };
        const p = previous ? await tx.plan.update({ where: { id: previous.id }, data }) : await tx.plan.create({ data: { ...data, codigo: 'code' in i ? i.code : '' } });
        return { planId: String(p.id) };
      }
      case 'payment.record': {
        const i = commandSchemas['payment.record'].parse(cmd.input), t = await tenant(tx, i.tenantId, i.version), due = new Date(i.dueAt), paid = i.paidAt ? new Date(i.paidAt) : new Date();
        if (paid > new Date(Date.now() + 300000)) fail('INVALID_INPUT', 'El pago no puede tener fecha futura.');
        if (await tx.suscripcionSaaS.findFirst({ where: { referencia_pago: i.reference } })) fail('PAYMENT_DUPLICATE', 'La referencia ya fue registrada.', 409);
        if (i.applySubscription && (due <= new Date() || i.year !== new Date().getUTCFullYear() || i.month !== new Date().getUTCMonth() + 1 || ['SUSPENDIDO', 'CANCELADO'].includes(t.estado))) fail('INVALID_PERIOD', 'Aplicar el período exige un pago del mes actual, vencimiento futuro y empresa activa o en prueba. Renová o activá la empresa por separado.');
        const p = await tx.suscripcionSaaS.create({ data: { tenantId: t.id, planId: t.planId, monto: i.amountCents / 100, metodo_pago: i.method, estado: 'PAGADA', periodo_mes: i.month, periodo_anio: i.year, fecha_pago: paid, fecha_vencimiento: due, referencia_pago: i.reference, notas: i.notes } });
        if (i.applySubscription) {
          if (t.fecha_vencimiento && due < t.fecha_vencimiento) fail('INVALID_PERIOD', 'El pago no puede acortar la membresía vigente.');
          await tx.tenant.update({ where: { id: t.id }, data: { fecha_vencimiento: due } });
        }
        return { tenantId: String(t.id), paymentId: String(p.id), subscriptionUpdated: String(i.applySubscription) };
      }
    }
  }
  async function command(cmd: HubCommand, key: string) {
    const hash = requestDigest(cmd, key);
    const replay = async () => {
      const row = await db.hubCommand.findUnique({ where: { id: cmd.requestId } });
      if (!row) return null;
      if (row.hash !== hash) fail('IDEMPOTENCY_CONFLICT', 'Identificador utilizado para otra solicitud.', 409);
      return row.result as Record<string, string>;
    };
    const previous = await replay(); if (previous) return previous;
    commandSchemas[cmd.operation].parse(cmd.input);
    try {
      return await db.$transaction(async tx => {
        await tx.hubCommand.create({ data: { id: cmd.requestId, hash, actor: cmd.actor, operation: cmd.operation, result: {} } });
        const result = await perform(tx, cmd);
        await tx.hubCommand.update({ where: { id: cmd.requestId }, data: { tenantId: result.tenantId ? Number(result.tenantId) : null, result } });
        return result;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 });
    } catch (e) {
      const result = await replay(); if (result) return result;
      if (e instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(e.code)) fail('CONFLICT', 'Los datos cambiaron o el identificador existe. Actualizá antes de reintentar.', 409);
      throw e;
    }
  }
  return { read, readTenants, command };
}
