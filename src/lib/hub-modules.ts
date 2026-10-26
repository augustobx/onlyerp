// WMS is retained in historical plans but has no independent runtime capability.
export const HUB_MODULES = ['VENTAS', 'COMPRAS', 'INVENTARIO', 'CLIENTES', 'PROVEEDORES', 'LISTAS_PRECIO', 'PRESUPUESTOS', 'CAJA', 'CUENTAS_CORRIENTES', 'LOGISTICA', 'CHEQUES', 'COMISIONES', 'AFIP', 'PORTAL_B2B', 'VENDEDORES_PWA'] as const;
export function effectiveModules(plan: string, overrides?: string | null): string[] {
  const raw: unknown = JSON.parse(plan || '[]');
  if (!Array.isArray(raw) || raw.some(k => typeof k !== 'string')) throw Error('Configuración de módulos inválida.');
  const result = new Set<string>(raw);
  if (overrides) {
    const values: unknown = JSON.parse(overrides);
    if (Array.isArray(values)) { for (const key of values) { if (typeof key !== 'string') throw Error('Configuración inválida.'); result.add(key); } }
    else if (values && typeof values === 'object') for (const [key, enabled] of Object.entries(values)) {
      if (typeof enabled !== 'boolean') throw Error('Configuración inválida.');
      if (enabled) result.add(key); else result.delete(key);
    }
    else throw Error('Configuración inválida.');
  }
  return [...result];
}
export function moduleOverrides(plan: string, overrides?: string | null): Record<string, boolean> {
  if (!overrides) return {};
  const values = JSON.parse(overrides);
  // Legacy arrays are additive, including entries already provided by the plan.
  if (Array.isArray(values)) return Object.fromEntries(values.map(k => [k, true]));
  effectiveModules(plan, overrides);
  return { ...values };
}
