import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant-context';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const tenant = await getTenantContext();
        if (!tenant) {
            return NextResponse.json({ count: 0 });
        }

        const count = await prisma.pedido.count({
            where: {
                tenantId: tenant.id,
                estado: 'PENDIENTE',
            }
        });

        return NextResponse.json({ count });
    } catch (error) {
        return NextResponse.json({ error: 'Error al obtener pedidos' }, { status: 500 });
    }
}