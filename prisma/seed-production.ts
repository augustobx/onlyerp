import { PrismaClient } from '@prisma/client';
import { randomBytes, pbkdf2Sync } from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const superadminPassword = process.env.SUPERADMIN_PASSWORD;
  if (!superadminPassword || superadminPassword.length < 12) {
    throw new Error('SUPERADMIN_PASSWORD must contain at least 12 characters.');
  }

  const plans = [
    {
      codigo: 'STARTER',
      nombre: 'Plan Starter',
      descripcion: 'Para pequeños comercios y puntos de venta.',
      precio_mensual: 25000,
      limite_usuarios: 3,
      limite_sucursales: 1,
      limite_depositos: 1,
      modulos: ['VENTAS','COMPRAS','INVENTARIO','CLIENTES','PROVEEDORES','LISTAS_PRECIO','CAJA','CUENTAS_CORRIENTES'],
    },
    {
      codigo: 'PRO',
      nombre: 'Plan Pro Mayorista',
      descripcion: 'Facturación AFIP, presupuestos y vendedores en calle.',
      precio_mensual: 45000,
      limite_usuarios: 8,
      limite_sucursales: 2,
      limite_depositos: 3,
      modulos: ['VENTAS','COMPRAS','INVENTARIO','CLIENTES','PROVEEDORES','LISTAS_PRECIO','CAJA','CUENTAS_CORRIENTES','PRESUPUESTOS','VENDEDORES_PWA','COMISIONES','AFIP'],
    },
    {
      codigo: 'ENTERPRISE',
      nombre: 'Plan Enterprise Logística & WMS',
      descripcion: 'Plataforma full: Hojas de ruta, choferes, cheques, WMS lotes y portal B2B.',
      precio_mensual: 75000,
      limite_usuarios: 25,
      limite_sucursales: 5,
      limite_depositos: 10,
      modulos: ['VENTAS','COMPRAS','INVENTARIO','CLIENTES','PROVEEDORES','LISTAS_PRECIO','CAJA','CUENTAS_CORRIENTES','PRESUPUESTOS','VENDEDORES_PWA','COMISIONES','AFIP','LOGISTICA','CHEQUES','WMS','PORTAL_B2B'],
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { codigo: plan.codigo },
      update: {
        nombre: plan.nombre,
        descripcion: plan.descripcion,
        precio_mensual: plan.precio_mensual,
        limite_usuarios: plan.limite_usuarios,
        limite_sucursales: plan.limite_sucursales,
        limite_depositos: plan.limite_depositos,
        modulos: JSON.stringify(plan.modulos),
      },
      create: {
        codigo: plan.codigo,
        nombre: plan.nombre,
        descripcion: plan.descripcion,
        precio_mensual: plan.precio_mensual,
        limite_usuarios: plan.limite_usuarios,
        limite_sucursales: plan.limite_sucursales,
        limite_depositos: plan.limite_depositos,
        modulos: JSON.stringify(plan.modulos),
      },
    });
  }

  const existing = await prisma.superAdmin.findUnique({ where: { username: 'superadmin' } });
  await prisma.superAdmin.upsert({
    where: { username: 'superadmin' },
    update: {
      nombre: 'Administrador NanoLabs',
      email: 'admin@nanoapps.ar',
      activo: true,
    },
    create: {
      username: 'superadmin',
      password: hashPassword(superadminPassword),
      nombre: 'Administrador NanoLabs',
      email: 'admin@nanoapps.ar',
      activo: true,
    },
  });

  console.log(`OnlyERP production bootstrap OK: plans=${plans.length}, superadmin=${existing ? 'existing' : 'created'}, tenants=unchanged`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
