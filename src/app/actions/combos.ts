"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireTenant, getTenantContext } from "@/lib/tenant-context";

export async function getCombos() {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return [];

    return await prisma.combo.findMany({
      where: { tenantId: tenant.id },
      include: {
        items: {
          include: {
            producto: {
              select: {
                id: true,
                nombre_producto: true,
                codigo_articulo: true,
                precio_costo: true,
                imagen_url: true,
                tipo_medicion: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error al obtener combos:", error);
    return [];
  }
}

export async function getCombosActivos() {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return [];

    return await prisma.combo.findMany({
      where: { tenantId: tenant.id, activo: true },
      include: {
        items: {
          include: {
            producto: {
              select: {
                id: true,
                nombre_producto: true,
                codigo_articulo: true,
                precio_costo: true,
                imagen_url: true,
                tipo_medicion: true,
              },
            },
          },
        },
      },
      orderBy: { nombre: "asc" },
    });
  } catch (error) {
    console.error("Error al obtener combos activos:", error);
    return [];
  }
}

export async function guardarCombo(data: {
  id?: number;
  nombre: string;
  descripcion?: string;
  precio_combo: number;
  descuento_porc?: number;
  activo?: boolean;
  items: { productoId: number; cantidad: number }[];
}) {
  try {
    const tenant = await requireTenant();

    if (!data.nombre || !data.nombre.trim()) throw new Error("El nombre del combo es obligatorio.");
    if (data.precio_combo <= 0) throw new Error("El precio del combo debe ser mayor a 0.");
    if (!data.items || data.items.length === 0) throw new Error("El combo debe incluir al menos un producto.");

    const resultado = await prisma.$transaction(async (tx) => {
      if (data.id) {
        await tx.comboItem.deleteMany({ where: { comboId: data.id } });
        const comboActualizado = await tx.combo.update({
          where: { id: data.id },
          data: {
            nombre: data.nombre.trim(),
            descripcion: data.descripcion || null,
            precio_combo: Number(data.precio_combo),
            descuento_porcentaje: Number(data.descuento_porc || 0),
            activo: data.activo !== undefined ? data.activo : true,
            items: {
              create: data.items.map((it) => ({
                productoId: Number(it.productoId),
                cantidad: Number(it.cantidad || 1),
              })),
            },
          },
        });
        return comboActualizado;
      } else {
        const nuevoCombo = await tx.combo.create({
          data: {
            tenantId: tenant.id,
            nombre: data.nombre.trim(),
            descripcion: data.descripcion || null,
            precio_combo: Number(data.precio_combo),
            descuento_porcentaje: Number(data.descuento_porc || 0),
            activo: true,
            items: {
              create: data.items.map((it) => ({
                productoId: Number(it.productoId),
                cantidad: Number(it.cantidad || 1),
              })),
            },
          },
        });
        return nuevoCombo;
      }
    });

    revalidatePath("/combos");
    revalidatePath("/vendedor");
    return { success: true, data: resultado };
  } catch (error: any) {
    console.error("Error al guardar combo:", error);
    return { success: false, error: error.message || "Error al guardar el combo." };
  }
}

export async function eliminarCombo(id: number) {
  try {
    await prisma.combo.delete({ where: { id: Number(id) } });
    revalidatePath("/combos");
    revalidatePath("/vendedor");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al eliminar el combo." };
  }
}

export async function toggleComboActivo(id: number, activo: boolean) {
  try {
    await prisma.combo.update({
      where: { id: Number(id) },
      data: { activo },
    });
    revalidatePath("/combos");
    revalidatePath("/vendedor");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al cambiar estado del combo." };
  }
}
