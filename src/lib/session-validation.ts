import { jwtVerify } from 'jose';
import prisma from './prisma';
import { getSessionKey } from './session-secret';
import { effectiveModules } from './hub-modules';
export async function validateSessionToken(token: string, hostname?: string) {
  try {
    const { payload } = await jwtVerify(token, getSessionKey(), { algorithms: ['HS256'] });
    if (!Number.isSafeInteger(payload.id) || !Number.isSafeInteger(payload.tenantId)) return null;
    const u = await prisma.usuario.findUnique({ where: { id: Number(payload.id) }, include: { tenant: { include: { plan: true } } } });
    if (!u || !u.activo || u.tenantId !== payload.tenantId || (payload.sessionVersion ?? 0) !== u.sessionVersion) return null;
    const t = u.tenant;
    if (!['ACTIVO', 'PRUEBA'].includes(t.estado) || (t.fecha_vencimiento && t.fecha_vencimiento <= new Date())) return null;
    const host = hostname?.split(',')[0].trim().toLowerCase().split(':')[0].replace(/\.$/, '');
    if (host && !['localhost', '127.0.0.1', (process.env.PLATFORM_HOST || 'onlyerp.nanoapps.ar')].includes(host) && host !== t.slug + '.' + (process.env.TENANT_BASE_DOMAIN || 'nanoapps.ar') && host !== t.dominio_personalizado) return null;
    return { ...payload, id: u.id, tenantId: u.tenantId, tenantSlug: t.slug, nombre: u.nombre, username: u.username, rol: u.rol, permisos: JSON.parse(u.permisos || '[]') as string[], sucursalId: u.sucursalId, listaPrecioId: u.listaPrecioId, listas_permitidas: u.listas_permitidas, sessionVersion: u.sessionVersion, modules: effectiveModules(t.plan.modulos, t.modulos_override) };
  } catch { return null; }
}
