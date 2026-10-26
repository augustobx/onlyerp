import { Prisma } from '@prisma/client';
import prisma from './prisma';
export async function withTenantQuota<T>(tenantId: number, operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM Tenant WHERE id=${tenantId} FOR UPDATE`;
    return operation(tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
}
export async function assertQuota(tx: Prisma.TransactionClient, tenantId: number, kind: 'users' | 'locations' | 'warehouses') {
  const t = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId }, include: { plan: true } });
  const count = kind === 'users' ? await tx.usuario.count({ where: { tenantId } }) : kind === 'locations' ? await tx.sucursal.count({ where: { tenantId } }) : await tx.deposito.count({ where: { tenantId } });
  const limit = kind === 'users' ? t.plan.limite_usuarios : kind === 'locations' ? t.plan.limite_sucursales : t.plan.limite_depositos;
  if (count >= limit) throw Error('Se alcanzó el límite del plan. Conservá el historial y ampliá el plan para nuevas altas.');
}
