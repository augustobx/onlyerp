import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireModule } from '@/lib/module-access';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const tenant = await requireModule('VENTAS');
        const count = await prisma.pedido.count({
            where: { estado: 'PENDIENTE', tenantId: tenant.id }
        });

        return NextResponse.json({ count });
    } catch (error) {
        return NextResponse.json({ error: 'Error al obtener pedidos' }, { status: 500 });
    }
}
