"use server";

import { requireModule, requireTenantAdmin } from "@/lib/module-access";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { requireTenant, getTenantContext } from "@/lib/tenant-context";

export async function obtenerConfiguracionComercial() {
  await requireTenantAdmin();

    const tenant = await getTenantContext();
    const config = tenant
        ? await prisma.empresaConfig.findUnique({ where: { tenantId: tenant.id } })
        : await prisma.empresaConfig.findFirst();

    const tenantFilter = tenant ? { tenantId: tenant.id } : {};
    const vendedores = await prisma.usuario.findMany({
        where: { activo: true, ...tenantFilter },
        select: { id: true, nombre: true, rol: true, comision_personalizada: true, limite_desc_vendedor: true }
    });
    const clientes = await prisma.cliente.findMany({
        where: tenantFilter,
        select: { id: true, nombre_razon_social: true, limite_desc_cliente: true }
    });
    const categorias = await prisma.categoria.findMany({
        where: tenantFilter,
        select: { id: true, nombre: true, limite_desc_categoria: true }
    });

    return { success: true, config, vendedores, clientes, categorias };
}

export async function actualizarReglasGlobales(data: {
    comision: number;
    penalizacion: number;
    limite: number;
    redondear_a_cinco?: boolean;
    aplicar_iva_en_precios?: boolean;
    permitir_stock_negativo?: boolean;
    facturar_al_entregar?: boolean;
}) {
  await requireTenantAdmin();

    try {
        const tenant = await requireTenant();
        await prisma.empresaConfig.upsert({
            where: { tenantId: tenant.id },
            update: {
                comision_base_global: data.comision,
                penalizacion_global: data.penalizacion,
                limite_desc_global: data.limite,
                redondear_a_cinco: data.redondear_a_cinco ?? false,
                aplicar_iva_en_precios: data.aplicar_iva_en_precios ?? false,
                permitir_stock_negativo: data.permitir_stock_negativo ?? false,
                facturar_al_entregar: data.facturar_al_entregar ?? false,
            },
            create: {
                tenantId: tenant.id,
                comision_base_global: data.comision,
                penalizacion_global: data.penalizacion,
                limite_desc_global: data.limite,
                redondear_a_cinco: data.redondear_a_cinco ?? false,
                aplicar_iva_en_precios: data.aplicar_iva_en_precios ?? false,
                permitir_stock_negativo: data.permitir_stock_negativo ?? false,
                facturar_al_entregar: data.facturar_al_entregar ?? false,
            }
        });
        revalidatePath('/configuracion/comercial');
        revalidatePath('/ventas');
        revalidatePath('/vendedor');
        revalidatePath('/pedidos');
        revalidatePath('/pedidos/armados');
        return { success: true };
    } catch (error: any) {
        console.error("Error al guardar reglas comerciales globales:", error);
        return { success: false, error: error.message || "Error al guardar reglas globales" };
    }
}

export async function actualizarReglaUsuario(id: number, comision: number | null, limite: number | null) {
  await requireTenantAdmin();

    try {
        await prisma.usuario.update({ where: { id }, data: { comision_personalizada: comision, limite_desc_vendedor: limite } });
        return { success: true };
    } catch (e) { return { success: false, error: "Error al actualizar vendedor" }; }
}