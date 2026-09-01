"use server";

import prisma from "@/lib/prisma";
import { productoSchema, ProductoFormValues } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { requireTenant, getTenantContext } from "@/lib/tenant-context";

export async function getNextCodigoArticulo() {
  const tenant = await getTenantContext();
  if (!tenant) return "000001";

  const lastProducto = await prisma.producto.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { id: "desc" },
  });

  if (!lastProducto || !lastProducto.codigo_articulo) {
    return "000001";
  }

  const lastCodeStr = lastProducto.codigo_articulo.replace(/\D/g, "");
  if (!lastCodeStr) return "000001";

  const nextCode = parseInt(lastCodeStr, 10) + 1;
  return nextCode.toString().padStart(6, "0");
}

export async function checkCodigoUnico(
  campo: "codigo_articulo" | "codigo_barras",
  valor: string,
  excludeId?: number
) {
  if (campo === "codigo_barras" && (!valor || valor === "0")) return true;

  const tenant = await getTenantContext();
  if (!tenant) return true;

  const whereClause: any = {
    tenantId: tenant.id,
    [campo]: valor,
  };

  if (excludeId) {
    whereClause.id = { not: excludeId };
  }

  const existing = await prisma.producto.findFirst({
    where: whereClause,
  });

  return !existing;
}

export async function crearProducto(data: ProductoFormValues) {
  try {
    const tenant = await requireTenant();
    const validatedData = productoSchema.parse(data);

    const isCodigoArticuloUnique = await checkCodigoUnico("codigo_articulo", validatedData.codigo_articulo);
    if (!isCodigoArticuloUnique) {
      return { success: false, error: "El código de artículo ya existe en tu empresa." };
    }

    if (validatedData.codigo_barras && validatedData.codigo_barras !== "0") {
      const isCodigoBarrasUnique = await checkCodigoUnico("codigo_barras", validatedData.codigo_barras);
      if (!isCodigoBarrasUnique) {
        return { success: false, error: "El código de barras ya existe en tu empresa." };
      }
    }

    const activeListas = validatedData.listas_precios.filter((l) => l.isActive);
    const todosLosDepositos = await prisma.deposito.findMany({
      where: { tenantId: tenant.id },
      select: { id: true },
    });

    const producto = await prisma.$transaction(async (tx) => {
      const prod = await tx.producto.create({
        data: {
          tenantId: tenant.id,
          codigo_articulo: validatedData.codigo_articulo,
          codigo_barras: validatedData.codigo_barras || "0",
          fecha_ingreso: validatedData.fecha_ingreso,
          nombre_producto: validatedData.nombre_producto,
          imagen_url: validatedData.imagen_url || null,
          proveedorId: validatedData.proveedorId,
          marcaId: validatedData.marcaId || null,
          categoriaId: validatedData.categoriaId || null,
          alicuota_iva: validatedData.alicuota_iva || 0,
          precio_costo: validatedData.precio_costo,
          descuento_proveedor: validatedData.descuento_proveedor,
          stock_recomendado: validatedData.stock_recomendado,
          tipo_medicion: validatedData.tipo_medicion,
          moneda: validatedData.moneda,
          listas_precios:
            activeListas.length > 0
              ? {
                  create: activeListas.map((lista) => ({
                    listaPrecioId: lista.listaPrecioId,
                    margen_personalizado: lista.margen_personalizado ?? null,
                  })),
                }
              : undefined,
          stocks: {
            create: todosLosDepositos.map((d) => {
              const stockUi = validatedData.stocks?.find((s) => s.depositoId === d.id);
              return {
                depositoId: d.id,
                cantidad: stockUi ? stockUi.cantidad : 0,
              };
            }),
          },
        },
      });

      for (const d of todosLosDepositos) {
        const stockUi = validatedData.stocks?.find((s) => s.depositoId === d.id);
        if (stockUi && stockUi.cantidad !== 0) {
          await tx.movimientoStock.create({
            data: {
              tenantId: tenant.id,
              productoId: prod.id,
              depositoDestinoId: d.id,
              cantidad: Math.abs(stockUi.cantidad),
              tipo: stockUi.cantidad > 0 ? "ENTRADA" : "SALIDA",
              motivo: "Stock inicial s/ Sistema",
            },
          });
        }
      }

      return prod;
    });

    revalidatePath("/inventario");
    return { success: true, data: producto };
  } catch (error: any) {
    console.error("Error al crear producto:", error);
    return { success: false, error: error.message || "Error al crear producto." };
  }
}

export async function actualizarProducto(id: number, data: ProductoFormValues) {
  try {
    const tenant = await requireTenant();
    const validatedData = productoSchema.parse(data);

    const isCodigoArticuloUnique = await checkCodigoUnico("codigo_articulo", validatedData.codigo_articulo, id);
    if (!isCodigoArticuloUnique) {
      return { success: false, error: "El código de artículo ya existe en tu empresa." };
    }

    if (validatedData.codigo_barras && validatedData.codigo_barras !== "0") {
      const isCodigoBarrasUnique = await checkCodigoUnico("codigo_barras", validatedData.codigo_barras, id);
      if (!isCodigoBarrasUnique) {
        return { success: false, error: "El código de barras ya existe en tu empresa." };
      }
    }

    const activeListas = validatedData.listas_precios.filter((l) => l.isActive);

    const producto = await prisma.$transaction(async (tx) => {
      await tx.productoListaPrecio.deleteMany({
        where: { productoId: id },
      });

      return tx.producto.update({
        where: { id },
        data: {
          codigo_articulo: validatedData.codigo_articulo,
          codigo_barras: validatedData.codigo_barras || "0",
          fecha_ingreso: validatedData.fecha_ingreso,
          nombre_producto: validatedData.nombre_producto,
          imagen_url: validatedData.imagen_url !== undefined ? validatedData.imagen_url : undefined,
          proveedorId: validatedData.proveedorId,
          marcaId: validatedData.marcaId || null,
          categoriaId: validatedData.categoriaId || null,
          alicuota_iva: validatedData.alicuota_iva || 0,
          precio_costo: validatedData.precio_costo,
          descuento_proveedor: validatedData.descuento_proveedor,
          stock_recomendado: validatedData.stock_recomendado,
          tipo_medicion: validatedData.tipo_medicion,
          moneda: validatedData.moneda,
          listas_precios:
            activeListas.length > 0
              ? {
                  create: activeListas.map((lista) => ({
                    listaPrecioId: lista.listaPrecioId,
                    margen_personalizado: lista.margen_personalizado ?? null,
                  })),
                }
              : undefined,
        },
      });
    });

    revalidatePath("/inventario");
    return { success: true, data: producto };
  } catch (error: any) {
    console.error("Error al actualizar producto:", error);
    return { success: false, error: error.message || "Error al actualizar producto." };
  }
}

export async function getProductos() {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return [];

    const productos = await prisma.producto.findMany({
      where: { tenantId: tenant.id },
      include: {
        proveedor: {
          include: {
            listas_precios: true,
          },
        },
        marca: true,
        categoria: true,
        stocks: {
          include: {
            deposito: {
              include: { sucursal: true },
            },
          },
        },
        listas_precios: {
          include: {
            listaPrecio: true,
          },
        },
        detalles_pedido: {
          where: {
            pedido: { estado: { in: ["PENDIENTE", "APROBADO", "ARMADO", "LISTO_ENTREGA"] } },
          },
          select: { cantidad: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return productos.map((p) => {
      const stockFisico = p.stocks.reduce((acc, current) => acc + current.cantidad, 0);
      const stockComprometido = p.detalles_pedido
        ? p.detalles_pedido.reduce((acc, current) => acc + current.cantidad, 0)
        : 0;
      return {
        ...p,
        stock_actual: stockFisico - stockComprometido,
        stock_fisico: stockFisico,
        stock_comprometido: stockComprometido,
      };
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export async function getProductoById(id: number) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return null;

    const producto = await prisma.producto.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        proveedor: {
          include: {
            listas_precios: true,
          },
        },
        marca: true,
        categoria: true,
        stocks: {
          include: {
            deposito: {
              include: { sucursal: true },
            },
          },
        },
        listas_precios: {
          include: {
            listaPrecio: true,
          },
        },
        detalles_pedido: {
          where: {
            pedido: { estado: { in: ["PENDIENTE", "APROBADO", "ARMADO", "LISTO_ENTREGA"] } },
          },
          select: { cantidad: true },
        },
      },
    });

    if (!producto) return null;

    const stockFisico = producto.stocks.reduce((acc, current) => acc + current.cantidad, 0);
    const stockComprometido = producto.detalles_pedido
      ? producto.detalles_pedido.reduce((acc, current) => acc + current.cantidad, 0)
      : 0;

    return {
      ...producto,
      stock_actual: stockFisico - stockComprometido,
      stock_fisico: stockFisico,
      stock_comprometido: stockComprometido,
    };
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}

export async function getProveedores() {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return [];

    return await prisma.proveedor.findMany({
      where: { tenantId: tenant.id },
      orderBy: { nombre: "asc" },
    });
  } catch (error) {
    console.error("Error fetching providers:", error);
    return [];
  }
}

export async function crearProveedor(nombre: string) {
  try {
    const tenant = await requireTenant();
    if (!nombre.trim()) return { success: false, error: "El nombre es obligatorio" };

    const existing = await prisma.proveedor.findUnique({
      where: {
        tenantId_nombre: {
          tenantId: tenant.id,
          nombre: nombre.trim(),
        },
      },
    });

    if (existing) {
      return { success: false, error: "El proveedor ya existe en tu empresa." };
    }

    const proveedor = await prisma.proveedor.create({
      data: {
        tenantId: tenant.id,
        nombre: nombre.trim(),
      },
    });

    revalidatePath("/inventario/nuevo");
    return { success: true, data: proveedor };
  } catch (error: any) {
    console.error("Error creating provider:", error);
    return { success: false, error: error.message || "Error al crear proveedor" };
  }
}

export async function getCategorias() {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return [];

    return await prisma.categoria.findMany({
      where: { tenantId: tenant.id },
      include: { marca: { include: { proveedor: true } } },
      orderBy: { nombre: "asc" },
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function getMarcas() {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return [];

    return await prisma.marca.findMany({
      where: { tenantId: tenant.id },
      include: { proveedor: true },
      orderBy: { nombre: "asc" },
    });
  } catch (error) {
    console.error("Error fetching brands:", error);
    return [];
  }
}

export async function getMarcasPorProveedor(proveedorId: number) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return [];

    return await prisma.marca.findMany({
      where: { tenantId: tenant.id, proveedorId },
      orderBy: { nombre: "asc" },
    });
  } catch (error) {
    console.error("Error fetching brands for provider:", error);
    return [];
  }
}

export async function getCategoriasPorMarca(marcaId: number) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return [];

    return await prisma.categoria.findMany({
      where: { tenantId: tenant.id, marcaId },
      orderBy: { nombre: "asc" },
    });
  } catch (error) {
    console.error("Error fetching categories for brand:", error);
    return [];
  }
}

export async function crearMarca(data: { nombre: string; proveedorId: number }) {
  try {
    const tenant = await requireTenant();
    if (!data.nombre.trim()) return { success: false, error: "El nombre es obligatorio" };

    const existing = await prisma.marca.findUnique({
      where: {
        tenantId_nombre_proveedorId: {
          tenantId: tenant.id,
          nombre: data.nombre.trim(),
          proveedorId: data.proveedorId,
        },
      },
    });
    if (existing) return { success: false, error: "Esta marca ya existe para este proveedor en tu empresa." };

    const marca = await prisma.marca.create({
      data: {
        tenantId: tenant.id,
        nombre: data.nombre.trim(),
        proveedorId: data.proveedorId,
      },
    });
    revalidatePath("/inventario/nuevo");
    return { success: true, data: marca };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al crear marca" };
  }
}

export async function getListasPrecioGlobales() {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return [];

    return await prisma.listaPrecio.findMany({
      where: { tenantId: tenant.id },
      orderBy: { id: "asc" },
    });
  } catch (error) {
    console.error("Error fetching price lists:", error);
    return [];
  }
}

export async function crearCategoria(nombre: string, marcaId: number, aumento_porcentaje: number = 0) {
  try {
    const tenant = await requireTenant();
    if (!nombre.trim()) return { success: false, error: "El nombre es obligatorio" };
    if (!marcaId) return { success: false, error: "La marca padre es obligatoria" };

    const categoria = await prisma.categoria.create({
      data: {
        tenantId: tenant.id,
        nombre: nombre.trim(),
        marcaId: marcaId,
        aumento_porcentaje: aumento_porcentaje,
      },
    });
    revalidatePath("/inventario/nuevo");
    revalidatePath("/categorias");
    return { success: true, data: categoria };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al crear categoría" };
  }
}

export async function crearListaPrecioGlobal(data: { nombre: string; margen_defecto: number }) {
  try {
    const tenant = await requireTenant();
    if (!data.nombre.trim()) return { success: false, error: "El nombre es obligatorio" };

    const existing = await prisma.listaPrecio.findUnique({
      where: {
        tenantId_nombre: {
          tenantId: tenant.id,
          nombre: data.nombre.trim(),
        },
      },
    });
    if (existing) return { success: false, error: "La lista de precios ya existe en tu empresa." };

    const lista = await prisma.listaPrecio.create({
      data: {
        tenantId: tenant.id,
        nombre: data.nombre.trim(),
        margen_defecto: data.margen_defecto,
      },
    });
    revalidatePath("/inventario/nuevo");
    return { success: true, data: lista };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al crear lista de precio" };
  }
}

export async function actualizarStockRapido(
  id: number,
  cantidad_sumar: number,
  stock_recomendado: number,
  precio_costo_nuevo: number,
  depositoId: number,
  usuarioId?: number
) {
  try {
    const tenant = await requireTenant();

    await prisma.$transaction(async (tx) => {
      const prodAnterior = await tx.producto.findFirst({
        where: { id, tenantId: tenant.id },
      });
      if (!prodAnterior) throw new Error("Producto no encontrado");

      let stockUbi = await tx.stockUbicacion.findUnique({
        where: { productoId_depositoId: { productoId: id, depositoId } },
      });

      if (!stockUbi) {
        stockUbi = await tx.stockUbicacion.create({
          data: { productoId: id, depositoId, cantidad: 0 },
        });
      }

      const stockActualLoc = stockUbi.cantidad;
      const stock_nuevo_loc = stockActualLoc + cantidad_sumar;

      let tipoMovimiento = "AJUSTE";
      if (cantidad_sumar !== 0 && precio_costo_nuevo !== prodAnterior.precio_costo) tipoMovimiento = "AMBOS";
      else if (cantidad_sumar !== 0) tipoMovimiento = "INGRESO_STOCK";
      else if (precio_costo_nuevo !== prodAnterior.precio_costo) tipoMovimiento = "CAMBIO_PRECIO";

      await tx.producto.update({
        where: { id },
        data: {
          stock_recomendado,
          precio_costo: precio_costo_nuevo,
        },
      });

      if (cantidad_sumar !== 0) {
        await tx.stockUbicacion.update({
          where: { productoId_depositoId: { productoId: id, depositoId } },
          data: { cantidad: stock_nuevo_loc },
        });

        await tx.movimientoStock.create({
          data: {
            tenantId: tenant.id,
            productoId: id,
            depositoDestinoId: depositoId,
            cantidad: cantidad_sumar,
            tipo: "AJUSTE",
            usuarioId: usuarioId || null,
          },
        });
      }

      if (tipoMovimiento !== "AJUSTE") {
        await tx.historialInventario.create({
          data: {
            tenantId: tenant.id,
            productoId: id,
            tipo_registro: tipoMovimiento,
            stock_anterior: stockActualLoc,
            stock_nuevo: stock_nuevo_loc,
            cantidad_agregada: cantidad_sumar,
            precio_anterior: prodAnterior.precio_costo,
            precio_nuevo: precio_costo_nuevo,
            usuarioId: usuarioId || null,
          },
        });
      }
    });

    revalidatePath("/inventario");
    revalidatePath("/ventas");

    return { success: true };
  } catch (error: any) {
    console.error("Error en ajuste rápido:", error);
    return { success: false, error: "Error al actualizar el producto." };
  }
}

export async function getHistorialProducto(productoId: number) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Tenant no encontrado" };

    const historial = await prisma.historialInventario.findMany({
      where: { productoId, tenantId: tenant.id },
      include: { usuario: true },
      orderBy: { fecha: "desc" },
    });
    return { success: true, data: historial };
  } catch (error) {
    console.error("Error al buscar historial del producto:", error);
    return { success: false, error: "Error al cargar las métricas." };
  }
}

export async function actualizarCategoria(id: number, nombre: string, marcaId: number, aumento_porcentaje: number = 0) {
  try {
    if (!nombre.trim()) return { success: false, error: "El nombre es obligatorio" };
    if (!marcaId) return { success: false, error: "La marca padre es obligatoria" };

    await prisma.categoria.update({
      where: { id },
      data: {
        nombre: nombre.trim(),
        marcaId: marcaId,
        aumento_porcentaje: aumento_porcentaje,
      },
    });
    revalidatePath("/categorias");
    revalidatePath("/inventario/nuevo");
    revalidatePath("/inventario");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Error al actualizar la categoría." };
  }
}

export async function eliminarCategoria(id: number) {
  try {
    await prisma.categoria.delete({ where: { id } });
    revalidatePath("/categorias");
    revalidatePath("/inventario");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "No se puede eliminar esta categoría porque hay productos que la están usando." };
  }
}

export async function actualizarListaPrecioGlobal(id: number, data: { nombre: string; margen_defecto: number }) {
  try {
    if (!data.nombre.trim()) return { success: false, error: "El nombre es obligatorio" };
    await prisma.listaPrecio.update({
      where: { id },
      data: { nombre: data.nombre.trim(), margen_defecto: data.margen_defecto },
    });
    revalidatePath("/listas-precio");
    revalidatePath("/inventario");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Error al actualizar la lista." };
  }
}

export async function eliminarListaPrecioGlobal(id: number) {
  try {
    await prisma.listaPrecio.delete({ where: { id } });
    revalidatePath("/listas-precio");
    revalidatePath("/inventario");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "No se puede eliminar esta lista porque está asignada a clientes o productos." };
  }
}