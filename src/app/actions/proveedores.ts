"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ==========================================
// 1. CRUD DE PROVEEDORES
// ==========================================
export async function getProveedoresCompleto() {
    try {
        return await prisma.proveedor.findMany({
            orderBy: { nombre: 'asc' },
            include: {
                _count: { select: { productos: true, marcas: true } },
                listas_precios: {
                    include: { listaPrecio: true }
                },
                marcas: {
                    include: {
                        _count: { select: { productos: true, categorias: true } },
                        categorias: {
                            include: {
                                _count: { select: { productos: true } }
                            }
                        }
                    },
                    orderBy: { nombre: 'asc' }
                }
            }
        });
    } catch (error) {
        return [];
    }
}

export async function guardarProveedor(formData: FormData) {
    try {
        const id = formData.get("id") ? Number(formData.get("id")) : null;
        const data = {
            nombre: formData.get("nombre") as string,
            cuit: formData.get("cuit") as string,
            telefono: formData.get("telefono") as string,
            email: formData.get("email") as string,
            direccion: formData.get("direccion") as string,
            notas: formData.get("notas") as string,
            aumento_porcentaje: Number(formData.get("aumento_porcentaje") || 0),
        };

        if (id) {
            await prisma.proveedor.update({ where: { id }, data });
        } else {
            await prisma.proveedor.create({ data });
        }

        revalidatePath("/proveedores");
        revalidatePath("/inventario");
        return { success: true };
    } catch (error: any) {
        if (error.code === 'P2002') return { success: false, error: "Ya existe un proveedor con ese nombre." };
        return { success: false, error: "Error al guardar el proveedor." };
    }
}

// ==========================================
// 2. LISTAS DE PRECIOS POR PROVEEDOR
// ==========================================
export async function getProveedorListasPrecios(proveedorId: number) {
    try {
        return await prisma.proveedorListaPrecio.findMany({
            where: { proveedorId },
            include: { listaPrecio: true }
        });
    } catch (error) {
        return [];
    }
}

export async function guardarProveedorListaPrecio(
    proveedorId: number,
    listaPrecioId: number,
    margen_personalizado: number | null,
    descuento_personalizado: number | null
) {
    try {
        await prisma.proveedorListaPrecio.upsert({
            where: {
                proveedorId_listaPrecioId: { proveedorId, listaPrecioId }
            },
            create: {
                proveedorId,
                listaPrecioId,
                margen_personalizado: margen_personalizado !== null && !isNaN(Number(margen_personalizado)) ? Number(margen_personalizado) : null,
                descuento_personalizado: descuento_personalizado !== null && !isNaN(Number(descuento_personalizado)) ? Number(descuento_personalizado) : null,
            },
            update: {
                margen_personalizado: margen_personalizado !== null && !isNaN(Number(margen_personalizado)) ? Number(margen_personalizado) : null,
                descuento_personalizado: descuento_personalizado !== null && !isNaN(Number(descuento_personalizado)) ? Number(descuento_personalizado) : null,
            }
        });

        revalidatePath("/proveedores");
        revalidatePath("/inventario");
        revalidatePath("/listas-precio");
        return { success: true };
    } catch (error: any) {
        console.error("Error al guardar lista para proveedor:", error);
        return { success: false, error: "Error al guardar regla de lista de precios para el proveedor." };
    }
}

// ==========================================
// 3. CRUD DE MARCAS
// ==========================================
export async function guardarMarca(formData: FormData) {
    try {
        const id = formData.get("id") ? Number(formData.get("id")) : null;
        const proveedorId = Number(formData.get("proveedorId"));
        const nombre = formData.get("nombre") as string;
        const aumento_porcentaje = Number(formData.get("aumento_porcentaje") || 0);

        if (!nombre?.trim()) return { success: false, error: "El nombre es obligatorio." };

        if (id) {
            await prisma.marca.update({ where: { id }, data: { nombre: nombre.trim(), aumento_porcentaje } });
        } else {
            await prisma.marca.create({ data: { nombre: nombre.trim(), proveedorId, aumento_porcentaje } });
        }

        revalidatePath("/proveedores");
        revalidatePath("/inventario");
        return { success: true };
    } catch (error: any) {
        if (error.code === 'P2002') return { success: false, error: "Esta marca ya existe para este proveedor." };
        return { success: false, error: "Error al guardar la marca." };
    }
}

export async function eliminarMarca(id: number) {
    try {
        await prisma.marca.delete({ where: { id } });
        revalidatePath("/proveedores");
        revalidatePath("/inventario");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: "No se puede eliminar esta marca porque tiene productos o categorías asignadas." };
    }
}

// ==========================================
// ==========================================
// 4. ACTUALIZACIÓN MASIVA FLEXIBLE (% O $ Y POR LISTA DE PRECIOS)
// ==========================================
export async function actualizarPreciosMasivos(
    proveedorIdOrOptions: number | {
        destino?: "COSTO_BASE" | number; // "COSTO_BASE" o el ID de una lista de precios
        listaPrecioId?: number | null;
        proveedorId?: number | null;
        marcaId?: number | null;
        categoriaId?: number | null;
        productoIds?: number[];
        tipoAumento?: "PORCENTAJE" | "MONTO_FIJO";
        valor: number;
        accion: "AUMENTO" | "REBAJA";
    },
    porcentajeLegacy?: number,
    accionLegacy?: "AUMENTO" | "REBAJA",
    marcaIdLegacy?: number,
    categoriaIdLegacy?: number
) {
    try {
        let whereProducto: any = {};
        let tipoAumento: "PORCENTAJE" | "MONTO_FIJO" = "PORCENTAJE";
        let valor = 0;
        let accion: "AUMENTO" | "REBAJA" = "AUMENTO";
        let detalleFiltro = "";
        let targetListaId: number | null = null;

        if (typeof proveedorIdOrOptions === "object") {
            const opts = proveedorIdOrOptions;
            tipoAumento = opts.tipoAumento || "PORCENTAJE";
            valor = Number(opts.valor) || 0;
            accion = opts.accion || "AUMENTO";

            if (opts.listaPrecioId) {
                targetListaId = opts.listaPrecioId;
            } else if (opts.destino && opts.destino !== "COSTO_BASE") {
                targetListaId = Number(opts.destino);
            }

            if (opts.productoIds && opts.productoIds.length > 0) {
                whereProducto.id = { in: opts.productoIds };
                detalleFiltro = `${opts.productoIds.length} productos seleccionados`;
            } else {
                if (opts.proveedorId) whereProducto.proveedorId = opts.proveedorId;
                if (opts.marcaId) whereProducto.marcaId = opts.marcaId;
                if (opts.categoriaId) whereProducto.categoriaId = opts.categoriaId;
            }
        } else {
            // Legacy signature
            const provId = proveedorIdOrOptions;
            valor = Number(porcentajeLegacy) || 0;
            accion = accionLegacy || "AUMENTO";
            if (provId) whereProducto.proveedorId = provId;
            if (marcaIdLegacy) whereProducto.marcaId = marcaIdLegacy;
            if (categoriaIdLegacy) whereProducto.categoriaId = categoriaIdLegacy;
        }

        if (valor <= 0) {
            return { success: false, error: "El valor de actualización debe ser mayor a 0." };
        }

        const productos = await prisma.producto.findMany({
            where: whereProducto,
            include: {
                proveedor: true,
                marca: true,
                categoria: true,
                listas_precios: true
            }
        });

        if (productos.length === 0) {
            return { success: false, error: "No hay productos que coincidan con los filtros seleccionados." };
        }

        const auditText = tipoAumento === "PORCENTAJE"
            ? `${accion === "AUMENTO" ? '+' : '-'}${valor}%`
            : `${accion === "AUMENTO" ? '+' : '-'}$${valor}`;

        // =========================================================
        // CASO 1: AUMENTO DIRIGIDO A UNA LISTA DE PRECIOS ESPECÍFICA
        // =========================================================
        if (targetListaId) {
            const listaObj = await prisma.listaPrecio.findUnique({
                where: { id: targetListaId }
            });
            if (!listaObj) return { success: false, error: "La lista de precios seleccionada no existe." };

            await prisma.$transaction(async (tx) => {
                for (const prod of productos) {
                    const pivot = prod.listas_precios?.find(lp => lp.listaPrecioId === targetListaId);
                    const margenActual = pivot?.margen_personalizado !== null && pivot?.margen_personalizado !== undefined
                        ? pivot.margen_personalizado
                        : listaObj.margen_defecto;

                    const costoBase = prod.precio_costo > 0 ? prod.precio_costo : 1;
                    const precioActual = costoBase * (1 + (margenActual / 100));

                    let nuevoPrecio = precioActual;
                    if (tipoAumento === "PORCENTAJE") {
                        const multiplicador = accion === "AUMENTO" ? (1 + (valor / 100)) : (1 - (valor / 100));
                        nuevoPrecio = Number((precioActual * multiplicador).toFixed(2));
                    } else {
                        const delta = accion === "AUMENTO" ? valor : -valor;
                        nuevoPrecio = Number(Math.max(0.01, precioActual + delta).toFixed(2));
                    }

                    const nuevoMargen = Number((((nuevoPrecio / costoBase) - 1) * 100).toFixed(2));

                    await tx.productoListaPrecio.upsert({
                        where: {
                            productoId_listaPrecioId: {
                                productoId: prod.id,
                                listaPrecioId: targetListaId
                            }
                        },
                        create: {
                            productoId: prod.id,
                            listaPrecioId: targetListaId,
                            margen_personalizado: nuevoMargen
                        },
                        update: {
                            margen_personalizado: nuevoMargen
                        }
                    });
                }
            });

            revalidatePath("/proveedores");
            revalidatePath("/inventario");
            revalidatePath("/listas-precio");
            revalidatePath("/vendedor");
            return {
                success: true,
                count: productos.length,
                updatedIds: productos.map(p => p.id),
                message: `Se actualizaron ${productos.length} productos en la lista "${listaObj.nombre}" (${auditText}).`
            };
        }

        // =========================================================
        // CASO 2: AUMENTO GENERAL AL COSTO BASE (TODAS LAS LISTAS)
        // =========================================================
        await prisma.$transaction(async (tx) => {
            for (const prod of productos) {
                let nuevoCosto = prod.precio_costo;

                if (tipoAumento === "PORCENTAJE") {
                    const multiplicador = accion === "AUMENTO" ? (1 + (valor / 100)) : (1 - (valor / 100));
                    nuevoCosto = Number((prod.precio_costo * multiplicador).toFixed(2));
                } else {
                    const delta = accion === "AUMENTO" ? valor : -valor;
                    nuevoCosto = Number(Math.max(0.01, prod.precio_costo + delta).toFixed(2));
                }

                const porcentajeCambio = prod.precio_costo > 0
                    ? Number((((nuevoCosto - prod.precio_costo) / prod.precio_costo) * 100).toFixed(2))
                    : 0;

                await tx.producto.update({
                    where: { id: prod.id },
                    data: { precio_costo: nuevoCosto }
                });

                await tx.historialPrecio.create({
                    data: {
                        productoId: prod.id,
                        precio_costo_anterior: prod.precio_costo,
                        precio_costo_nuevo: nuevoCosto,
                        porcentaje_cambio: porcentajeCambio,
                        motivo: `Ajuste Rápido: ${auditText} (${detalleFiltro || prod.proveedor?.nombre || 'General'})`
                    }
                });
            }
        });

        revalidatePath("/proveedores");
        revalidatePath("/inventario");
        revalidatePath("/reportes");
        revalidatePath("/vendedor");
        return {
            success: true,
            count: productos.length,
            updatedIds: productos.map(p => p.id),
            message: `Se actualizaron los costos de ${productos.length} productos (${auditText}).`
        };
    } catch (error: any) {
        console.error("Error al actualizar precios masivos:", error);
        return { success: false, error: error.message || "Error al actualizar precios." };
    }
}