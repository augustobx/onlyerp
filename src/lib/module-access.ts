import { getSessionUser } from './session';
import { getTenantContext } from './tenant-context';
export const ROUTE_MODULES: Array<[string, string]> = [
  ['/reportes/comisiones', 'COMISIONES'], ['/ventas', 'VENTAS'], ['/pedidos', 'VENTAS'], ['/compras', 'COMPRAS'], ['/inventario', 'INVENTARIO'], ['/categorias', 'INVENTARIO'], ['/combos', 'INVENTARIO'], ['/transferencias', 'INVENTARIO'], ['/clientes', 'CLIENTES'], ['/proveedores', 'PROVEEDORES'], ['/listas-precio', 'LISTAS_PRECIO'], ['/presupuestos', 'PRESUPUESTOS'], ['/caja', 'CAJA'], ['/cuentas-corrientes', 'CUENTAS_CORRIENTES'], ['/logistica', 'LOGISTICA'], ['/finanzas/cartera-valores', 'CHEQUES'], ['/portal-b2b', 'PORTAL_B2B'], ['/vendedor', 'VENDEDORES_PWA'], ['/imprimir/hoja-de-ruta', 'LOGISTICA'], ['/imprimir/consolidado-carga', 'LOGISTICA'], ['/imprimir/presupuesto', 'PRESUPUESTOS'], ['/imprimir/pedido', 'VENTAS'], ['/imprimir/ticket', 'VENTAS'], ['/imprimir/a4', 'VENTAS'],
];
export function moduleForPath(path: string) { return ROUTE_MODULES.find(([prefix]) => path === prefix || path.startsWith(prefix + '/'))?.[1]; }
export async function requireSessionTenant() {
  const session = await getSessionUser(), tenant = await getTenantContext();
  if (!session || !tenant || tenant.id !== session.tenantId) throw Error('Sesión de la empresa requerida.');
  return tenant;
}
export async function requireModule(module: string) {
  const session = await getSessionUser(), tenant = await getTenantContext();
  if (!session || !tenant || session.tenantId !== tenant.id || !tenant.modulos.includes(module)) throw Error('Módulo no habilitado para esta empresa o sesión vencida.');
  if (['VENDEDOR', 'REPARTIDOR', 'MIXTO'].includes(session.rol) && !tenant.modulos.includes('VENDEDORES_PWA')) throw Error('App de vendedores no habilitada.');
  return tenant;
}
export async function requireTenantAdmin() {
  const session = await getSessionUser(), tenant = await getTenantContext();
  if (!session || session.rol !== 'ADMIN' || !tenant || tenant.id !== session.tenantId) throw Error('Acceso administrativo requerido.');
  return tenant;
}
