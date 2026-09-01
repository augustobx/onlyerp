"use server";

import prisma from "@/lib/prisma";
import { crearSuperAdminSesion, cerrarSuperAdminSesion, requireSuperAdmin } from "@/lib/superadmin-session";
import { verifyPassword, hashPassword } from "@/lib/password";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { suspenderTenantsVencidos } from "@/lib/membership";

export async function superAdminLogin(formData: FormData) {
  try {
    const username = (formData.get("username") as string)?.trim();
    const password = formData.get("password") as string;

    if (!username || !password) {
      return { success: false, error: "Ingresá usuario y contraseña." };
    }

    const admin = await prisma.superAdmin.findUnique({
      where: { username },
    });

    if (!admin || !verifyPassword(password, admin.password)) {
      return { success: false, error: "Credenciales de SuperAdmin inválidas." };
    }

    if (!admin.activo) {
      return { success: false, error: "Este usuario de SuperAdmin ha sido desactivado." };
    }

    await crearSuperAdminSesion(admin);
    return { success: true };
  } catch (error) {
    console.error("SuperAdmin login error:", error);
    return { success: false, error: "Error interno al iniciar sesión." };
  }
}

export async function superAdminLogout() {
  await cerrarSuperAdminSesion();
  redirect("/superadmin/login");
}

export async function getSuperAdminDashboard() {
  await requireSuperAdmin();
  await suspenderTenantsVencidos();

  const [
    totalTenants,
    activosTenants,
    pruebaTenants,
    suspendidosTenants,
    planes,
    ultimasSuscripciones,
    ultimosTenants,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { estado: "ACTIVO" } }),
    prisma.tenant.count({ where: { estado: "PRUEBA" } }),
    prisma.tenant.count({ where: { estado: "SUSPENDIDO" } }),
    prisma.plan.findMany({
      include: { _count: { select: { tenants: true } } },
    }),
    prisma.suscripcionSaaS.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { tenant: true, plan: true },
    }),
    prisma.tenant.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { plan: true, _count: { select: { usuarios: true, sucursales: true } } },
    }),
  ]);

  // Cálculo de MRR proyectado
  const mrrProyectado = planes.reduce((acc, plan) => {
    return acc + plan.precio_mensual * plan._count.tenants;
  }, 0);

  return {
    totalTenants,
    activosTenants,
    pruebaTenants,
    suspendidosTenants,
    mrrProyectado,
    planes,
    ultimasSuscripciones,
    ultimosTenants,
  };
}

export async function getTenantsList() {
  await requireSuperAdmin();
  await suspenderTenantsVencidos();

  return prisma.tenant.findMany({
    orderBy: { id: "desc" },
    include: {
      plan: true,
      _count: {
        select: {
          usuarios: true,
          sucursales: true,
          productos: true,
          ventas: true,
        },
      },
    },
  });
}

export async function getTenantDetail(tenantId: number) {
  await requireSuperAdmin();
  await suspenderTenantsVencidos();

  return prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      plan: true,
      config_empresa: true,
      usuarios: {
        select: {
          id: true,
          nombre: true,
          username: true,
          rol: true,
          activo: true,
          creadoEn: true,
        },
      },
      suscripciones: {
        orderBy: { createdAt: "desc" },
        include: { plan: true },
      },
      _count: {
        select: {
          sucursales: true,
          depositos: true,
          productos: true,
          ventas: true,
          clientes: true,
        },
      },
    },
  });
}

export type CreateTenantInput = {
  nombre: string;
  slug: string;
  planId: number;
  cuit?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  adminUsername: string;
  adminNombre: string;
  adminPassword: string;
  fechaAlta?: string;
  fechaVencimiento?: string;
};

export async function createTenant(input: CreateTenantInput) {
  await requireSuperAdmin();

  try {
    const slugLimpio = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");

    // Validar unicidad de slug
    const existeSlug = await prisma.tenant.findUnique({ where: { slug: slugLimpio } });
    if (existeSlug) {
      return { success: false, error: `El subdominio '${slugLimpio}' ya está en uso.` };
    }

    // Provisionamiento atómico del Tenant
    const nuevoTenant = await prisma.$transaction(async (tx) => {
      // 1. Crear Tenant
      const tenant = await tx.tenant.create({
        data: {
          nombre: input.nombre.trim(),
          slug: slugLimpio,
          planId: input.planId,
          cuit: input.cuit?.trim() || null,
          direccion: input.direccion?.trim() || null,
          telefono: input.telefono?.trim() || null,
          email: input.email?.trim() || null,
          estado: "ACTIVO",
          fecha_alta: input.fechaAlta ? new Date(input.fechaAlta + "T12:00:00") : new Date(),
          fecha_vencimiento: input.fechaVencimiento ? new Date(input.fechaVencimiento + "T23:59:59") : null,
        },
      });

      // 2. Configuración de Empresa
      await tx.empresaConfig.create({
        data: {
          tenantId: tenant.id,
          razon_social: input.nombre.trim(),
          nombre_fantasia: input.nombre.trim(),
          cuit: input.cuit?.trim() || "00-00000000-0",
          direccion: input.direccion?.trim() || "Dirección Comercial",
          telefono: input.telefono?.trim() || "0000-0000",
        },
      });

      // 3. Sucursal Inicial
      const sucursal = await tx.sucursal.create({
        data: {
          tenantId: tenant.id,
          nombre: "Casa Central",
          direccion: input.direccion?.trim() || null,
          telefono: input.telefono?.trim() || null,
          estado: true,
        },
      });

      // 4. Depósito Inicial
      await tx.deposito.create({
        data: {
          tenantId: tenant.id,
          nombre: "Depósito Principal",
          sucursalId: sucursal.id,
          estado: true,
        },
      });

      // 5. Lista de Precios Inicial
      await tx.listaPrecio.create({
        data: {
          tenantId: tenant.id,
          nombre: "Lista General",
          margen_defecto: 30,
        },
      });

      // 6. Usuario Administrador del Tenant
      await tx.usuario.create({
        data: {
          tenantId: tenant.id,
          nombre: input.adminNombre.trim(),
          username: input.adminUsername.trim(),
          password: hashPassword(input.adminPassword),
          rol: "ADMIN",
          permisos: JSON.stringify([
            "VENTAS",
            "CLIENTES",
            "PRODUCTOS",
            "PROVEEDORES",
            "CAJA",
            "REPORTES",
            "CONFIGURACION",
            "LOGISTICA",
            "CHEQUES",
            "WMS",
          ]),
          activo: true,
          sucursalId: sucursal.id,
        },
      });

      // 7. Secuencias atómicas
      await tx.secuenciaPedido.create({
        data: { tenantId: tenant.id, numero_actual: 0 },
      });
      await tx.secuenciaPresupuesto.create({
        data: { tenantId: tenant.id, numero_actual: 0 },
      });
      await tx.secuenciaHojaDeRuta.create({
        data: { tenantId: tenant.id, numero_actual: 0 },
      });

      return tenant;
    });

    revalidatePath("/superadmin/tenants");
    return { success: true, tenantId: nuevoTenant.id, slug: nuevoTenant.slug };
  } catch (error: any) {
    console.error("Error creating tenant:", error);
    return { success: false, error: error.message || "Error al crear el tenant." };
  }
}

export async function updateTenant(tenantId: number, data: {
  nombre?: string;
  estado?: "ACTIVO" | "PRUEBA" | "SUSPENDIDO" | "CANCELADO";
  planId?: number;
  dominio_personalizado?: string | null;
  modulos_override?: string | null;
  cuit?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  fecha_alta?: string | null;
  fecha_vencimiento?: string | null;
}) {
  await requireSuperAdmin();

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(data.nombre && { nombre: data.nombre.trim() }),
        ...(data.estado && { estado: data.estado }),
        ...(data.planId && { planId: data.planId }),
        ...(data.dominio_personalizado !== undefined && { dominio_personalizado: data.dominio_personalizado?.trim() || null }),
        ...(data.modulos_override !== undefined && { modulos_override: data.modulos_override }),
        ...(data.cuit !== undefined && { cuit: data.cuit?.trim() || null }),
        ...(data.direccion !== undefined && { direccion: data.direccion?.trim() || null }),
        ...(data.telefono !== undefined && { telefono: data.telefono?.trim() || null }),
        ...(data.email !== undefined && { email: data.email?.trim() || null }),
        ...(data.fecha_alta !== undefined && {
          fecha_alta: data.fecha_alta ? new Date(data.fecha_alta + "T12:00:00") : new Date(),
        }),
        ...(data.fecha_vencimiento !== undefined && {
          fecha_vencimiento: data.fecha_vencimiento
            ? new Date(data.fecha_vencimiento + "T23:59:59")
            : null,
        }),
      },
    });

    revalidatePath("/superadmin/tenants");
    revalidatePath(`/superadmin/tenants/${tenantId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating tenant:", error);
    return { success: false, error: error.message || "Error al actualizar el tenant." };
  }
}

export async function getPlans() {
  await requireSuperAdmin();
  return prisma.plan.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { tenants: true } } },
  });
}


export async function updatePlan(planId: number, data: {
  nombre: string;
  descripcion?: string | null;
  precio_mensual: number;
  limite_usuarios: number;
  limite_sucursales: number;
  limite_depositos: number;
  modulos: string[];
  activo: boolean;
}) {
  await requireSuperAdmin();

  try {
    await prisma.plan.update({
      where: { id: planId },
      data: {
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || null,
        precio_mensual: data.precio_mensual,
        limite_usuarios: data.limite_usuarios,
        limite_sucursales: data.limite_sucursales,
        limite_depositos: data.limite_depositos,
        modulos: JSON.stringify(data.modulos),
        activo: data.activo,
      },
    });

    revalidatePath("/superadmin/planes");
    revalidatePath("/superadmin/tenants");

    return { success: true };
  } catch (error: any) {
    console.error("Error updating plan:", error);
    return {
      success: false,
      error: error.message || "Error al actualizar el plan.",
    };
  }
}

export async function registrarCobroSaaS(data: {
  tenantId: number;
  planId: number;
  monto: number;
  metodo_pago?: string;
  periodo_mes: number;
  periodo_anio: number;
  referencia_pago?: string;
  notas?: string;
}) {
  await requireSuperAdmin();

  try {
    const fechaVencimiento = new Date(data.periodo_anio, data.periodo_mes, 10);

    const suscripcion = await prisma.suscripcionSaaS.create({
      data: {
        tenantId: data.tenantId,
        planId: data.planId,
        monto: data.monto,
        metodo_pago: data.metodo_pago || "TRANSFERENCIA",
        periodo_mes: data.periodo_mes,
        periodo_anio: data.periodo_anio,
        fecha_pago: new Date(),
        fecha_vencimiento: fechaVencimiento,
        referencia_pago: data.referencia_pago || null,
        notas: data.notas || null,
        estado: "PAGADA",
      },
    });

    // Reactivar tenant si estaba suspendido
    await prisma.tenant.update({
      where: { id: data.tenantId },
      data: {
        estado: "ACTIVO",
        fecha_vencimiento: fechaVencimiento,
      },
    });

    revalidatePath("/superadmin");
    revalidatePath(`/superadmin/tenants/${data.tenantId}`);
    return { success: true, suscripcionId: suscripcion.id };
  } catch (error: any) {
    console.error("Error registering SaaS payment:", error);
    return { success: false, error: error.message || "Error al registrar el cobro." };
  }
}
