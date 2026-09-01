import { PrismaClient, EstadoTenant } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed Idempotente de OnlyERP SaaS...');

  // 1. CREACIÓN DE PLANES SAAS
  const starterModules = JSON.stringify([
    'VENTAS',
    'COMPRAS',
    'INVENTARIO',
    'CLIENTES',
    'PROVEEDORES',
    'LISTAS_PRECIO',
    'CAJA',
    'CUENTAS_CORRIENTES',
  ]);

  const proModules = JSON.stringify([
    'VENTAS',
    'COMPRAS',
    'INVENTARIO',
    'CLIENTES',
    'PROVEEDORES',
    'LISTAS_PRECIO',
    'CAJA',
    'CUENTAS_CORRIENTES',
    'PRESUPUESTOS',
    'VENDEDORES_PWA',
    'COMISIONES',
    'AFIP',
  ]);

  const enterpriseModules = JSON.stringify([
    'VENTAS',
    'COMPRAS',
    'INVENTARIO',
    'CLIENTES',
    'PROVEEDORES',
    'LISTAS_PRECIO',
    'CAJA',
    'CUENTAS_CORRIENTES',
    'PRESUPUESTOS',
    'VENDEDORES_PWA',
    'COMISIONES',
    'AFIP',
    'LOGISTICA',
    'CHEQUES',
    'WMS',
    'PORTAL_B2B',
  ]);

  const planStarter = await prisma.plan.upsert({
    where: { codigo: 'STARTER' },
    update: {
      nombre: 'Plan Starter',
      descripcion: 'Para pequeños comercios y puntos de venta.',
      precio_mensual: 25000,
      limite_usuarios: 3,
      limite_sucursales: 1,
      limite_depositos: 1,
      modulos: starterModules,
    },
    create: {
      codigo: 'STARTER',
      nombre: 'Plan Starter',
      descripcion: 'Para pequeños comercios y puntos de venta.',
      precio_mensual: 25000,
      limite_usuarios: 3,
      limite_sucursales: 1,
      limite_depositos: 1,
      modulos: starterModules,
    },
  });

  const planPro = await prisma.plan.upsert({
    where: { codigo: 'PRO' },
    update: {
      nombre: 'Plan Pro Mayorista',
      descripcion: 'Facturación AFIP, presupuestos y vendedores en calle.',
      precio_mensual: 45000,
      limite_usuarios: 8,
      limite_sucursales: 2,
      limite_depositos: 3,
      modulos: proModules,
    },
    create: {
      codigo: 'PRO',
      nombre: 'Plan Pro Mayorista',
      descripcion: 'Facturación AFIP, presupuestos y vendedores en calle.',
      precio_mensual: 45000,
      limite_usuarios: 8,
      limite_sucursales: 2,
      limite_depositos: 3,
      modulos: proModules,
    },
  });

  const planEnterprise = await prisma.plan.upsert({
    where: { codigo: 'ENTERPRISE' },
    update: {
      nombre: 'Plan Enterprise Logística & WMS',
      descripcion: 'Plataforma full: Hojas de ruta, choferes, cheques, WMS lotes y portal B2B.',
      precio_mensual: 75000,
      limite_usuarios: 25,
      limite_sucursales: 5,
      limite_depositos: 10,
      modulos: enterpriseModules,
    },
    create: {
      codigo: 'ENTERPRISE',
      nombre: 'Plan Enterprise Logística & WMS',
      descripcion: 'Plataforma full: Hojas de ruta, choferes, cheques, WMS lotes y portal B2B.',
      precio_mensual: 75000,
      limite_usuarios: 25,
      limite_sucursales: 5,
      limite_depositos: 10,
      modulos: enterpriseModules,
    },
  });

  console.log('✅ Planes SaaS configurados');

  // 2. CREACIÓN DE SUPERADMIN DE PLATAFORMA (NANOLABS)
  const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin2026!';
  await prisma.superAdmin.upsert({
    where: { username: 'superadmin' },
    update: {
      nombre: 'Administrador NanoLabs',
      email: 'admin@nanoapps.site',
      activo: true,
    },
    create: {
      username: 'superadmin',
      password: hashPassword(superadminPassword),
      nombre: 'Administrador NanoLabs',
      email: 'admin@nanoapps.site',
      activo: true,
    },
  });

  console.log('✅ SuperAdmin de plataforma asegurado');

  // 3. CREACIÓN DE TENANT DEMO INICIAL
  const tenantDemo = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {
      nombre: 'Distribuidora Demo',
      planId: planEnterprise.id,
      estado: EstadoTenant.ACTIVO,
    },
    create: {
      slug: 'demo',
      nombre: 'Distribuidora Demo',
      planId: planEnterprise.id,
      estado: EstadoTenant.ACTIVO,
      cuit: '30-71234567-9',
      direccion: 'Av. Libertador 1000, Buenos Aires',
      telefono: '011-4000-0000',
      email: 'contacto@distribuidorademo.com',
    },
  });

  // Configuración de Empresa del Tenant Demo
  await prisma.empresaConfig.upsert({
    where: { tenantId: tenantDemo.id },
    update: {
      razon_social: 'Distribuidora Demo S.A.',
      nombre_fantasia: 'Distribuidora Demo',
      cuit: '30-71234567-9',
      direccion: 'Av. Libertador 1000, Buenos Aires',
      telefono: '011-4000-0000',
      redes_sociales: '@distribuidora.demo',
    },
    create: {
      tenantId: tenantDemo.id,
      razon_social: 'Distribuidora Demo S.A.',
      nombre_fantasia: 'Distribuidora Demo',
      cuit: '30-71234567-9',
      direccion: 'Av. Libertador 1000, Buenos Aires',
      telefono: '011-4000-0000',
      redes_sociales: '@distribuidora.demo',
    },
  });

  // Sucursal Default para el Tenant Demo
  let sucursalDemo = await prisma.sucursal.findFirst({
    where: { tenantId: tenantDemo.id, nombre: 'Casa Central' },
  });

  if (!sucursalDemo) {
    sucursalDemo = await prisma.sucursal.create({
      data: {
        tenantId: tenantDemo.id,
        nombre: 'Casa Central',
        direccion: 'Av. Libertador 1000',
        telefono: '011-4000-0000',
        estado: true,
      },
    });
  }

  // Depósito Default para el Tenant Demo
  let depositoDemo = await prisma.deposito.findFirst({
    where: { tenantId: tenantDemo.id, nombre: 'Depósito Principal' },
  });

  if (!depositoDemo) {
    depositoDemo = await prisma.deposito.create({
      data: {
        tenantId: tenantDemo.id,
        nombre: 'Depósito Principal',
        sucursalId: sucursalDemo.id,
        estado: true,
      },
    });
  }

  // Lista de Precio General
  let listaPrecioDemo = await prisma.listaPrecio.findFirst({
    where: { tenantId: tenantDemo.id, nombre: 'Lista General' },
  });

  if (!listaPrecioDemo) {
    listaPrecioDemo = await prisma.listaPrecio.create({
      data: {
        tenantId: tenantDemo.id,
        nombre: 'Lista General',
        margen_defecto: 30,
      },
    });
  }

  // Usuario Administrador del Tenant Demo
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD || 'Admin1234!';
  await prisma.usuario.upsert({
    where: {
      tenantId_username: {
        tenantId: tenantDemo.id,
        username: 'admin',
      },
    },
    update: {
      nombre: 'Administrador Demo',
      rol: 'ADMIN',
      permisos: JSON.stringify([
        'VENTAS',
        'CLIENTES',
        'PRODUCTOS',
        'PROVEEDORES',
        'CAJA',
        'REPORTES',
        'CONFIGURACION',
        'LOGISTICA',
        'CHEQUES',
        'WMS',
      ]),
      activo: true,
      sucursalId: sucursalDemo.id,
    },
    create: {
      tenantId: tenantDemo.id,
      nombre: 'Administrador Demo',
      username: 'admin',
      password: hashPassword(adminPassword),
      rol: 'ADMIN',
      permisos: JSON.stringify([
        'VENTAS',
        'CLIENTES',
        'PRODUCTOS',
        'PROVEEDORES',
        'CAJA',
        'REPORTES',
        'CONFIGURACION',
        'LOGISTICA',
        'CHEQUES',
        'WMS',
      ]),
      activo: true,
      sucursalId: sucursalDemo.id,
    },
  });

  // Secuencias atómicas iniciales para el tenant demo
  await prisma.secuenciaPedido.upsert({
    where: { tenantId: tenantDemo.id },
    update: {},
    create: { tenantId: tenantDemo.id, numero_actual: 0 },
  });

  await prisma.secuenciaPresupuesto.upsert({
    where: { tenantId: tenantDemo.id },
    update: {},
    create: { tenantId: tenantDemo.id, numero_actual: 0 },
  });

  await prisma.secuenciaHojaDeRuta.upsert({
    where: { tenantId: tenantDemo.id },
    update: {},
    create: { tenantId: tenantDemo.id, numero_actual: 0 },
  });

  console.log('✅ Tenant Demo inicial aprovisionado con éxito');
  console.log('🎉 Seed finalizado correctamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error en Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
