"use server";

import prisma from "@/lib/prisma";
import { resolverMargenYDescuento, calcularPrecioConCascada, resolverPrecioConEscala, redondearPrecio } from "@/lib/utils";
import { requireTenant, getTenantContext } from "@/lib/tenant-context";

export async function validarAccesoClienteB2B(identificador: string) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Empresa no identificada." };

    const docLimpio = identificador.trim().replace(/[-\s]/g, "");
    if (!docLimpio) {
      return { success: false, error: "Ingresá un CUIT o DNI válido." };
    }

    const cliente = await prisma.cliente.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { dni_cuit: identificador.trim() },
          { dni_cuit: docLimpio },
          { dni_cuit: { contains: docLimpio } },
        ],
      },
      include: {
        lista_default: true,
        ventas: {
          where: { estado_pago: { in: ["PENDIENTE", "PARCIAL"] } },
        },
      },
    });

    if (!cliente) {
      return {
        success: false,
        error: "No encontramos un cliente mayorista registrado con ese CUIT. Por favor contactá a tu ejecutivo de cuentas.",
      };
    }

    const saldoDeuda = cliente.ventas.reduce((acc, v) => acc + v.saldo_pendiente, 0);

    return {
      success: true,
      data: {
        id: cliente.id,
        nombre: cliente.nombre_razon_social,
        cuit: cliente.dni_cuit,
        direccion: cliente.direccion,
        telefono: cliente.telefono,
        condicion_iva: cliente.condicion_iva,
        limite_credito: cliente.limite_credito || 0,
        saldo_cc: saldoDeuda,
        listaPrecioId: cliente.lista_default_id || 1,
        listaNombre: cliente.lista_default?.nombre || "Lista General",
      },
    };
  } catch (error: any) {
    console.error("Error al validar cliente B2B:", error);
    return { success: false, error: "Error al validar acceso." };
  }
}

export async function obtenerCatalogoB2B(clienteId: number, query?: string) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Empresa no identificada" };

    const cliente = await prisma.cliente.findFirst({
      where: { id: Number(clienteId), tenantId: tenant.id },
      include: { lista_default: true },
    });

    if (!cliente) return { success: false, error: "Cliente no encontrado" };

    const listaId = cliente.lista_default_id || 1;
    const lista = await prisma.listaPrecio.findFirst({ where: { id: listaId, tenantId: tenant.id } });
    const configGlobal = await prisma.empresaConfig.findUnique({ where: { tenantId: tenant.id } });

    const where: any = { tenantId: tenant.id };
    if (query && query.trim() !== "") {
      where.OR = [
        { nombre_producto: { contains: query.trim() } },
        { codigo_articulo: { contains: query.trim() } },
      ];
    }

    const productos = await prisma.producto.findMany({
      where,
      include: {
        marca: true,
        categoria: true,
        proveedor: true,
        stocks: true,
        escalas_precio: {
          where: {
            OR: [
              { listaPrecioId: listaId },
              { listaPrecioId: null },
            ],
          },
          orderBy: { cantidad_minima: "asc" },
        },
      },
      orderBy: { nombre_producto: "asc" },
    });

    const catalogo = productos.map((p) => {
      const stockTotal = p.stocks.reduce((a, s) => a + s.cantidad, 0);
      const margenDef = lista?.margen_defecto || 30;
      const { margenFinal, descuentoFinal } = resolverMargenYDescuento(p, listaId, margenDef);

      const precioBase = calcularPrecioConCascada(
        p.precio_costo,
        descuentoFinal,
        p.alicuota_iva || 0,
        p.proveedor?.aumento_porcentaje || 0,
        p.marca?.aumento_porcentaje || 0,
        p.categoria?.aumento_porcentaje || 0,
        margenFinal,
        configGlobal?.redondear_a_cinco || false,
        configGlobal?.aplicar_iva_en_precios || false
      );

      return {
        id: p.id,
        codigo: p.codigo_articulo,
        codigo_barras: p.codigo_barras,
        nombre: p.nombre_producto,
        marca: p.marca?.nombre || "S/M",
        categoria: p.categoria?.nombre || "General",
        imagen_url: p.imagen_url,
        stock_disponible: stockTotal,
        precio_unitario: precioBase,
        escalas: p.escalas_precio.map((e) => ({
          cantidad_minima: e.cantidad_minima,
          precio_unitario: e.precio_unitario,
          descuento_porcentaje: e.descuento_porcentaje,
        })),
      };
    });

    return { success: true, data: catalogo };
  } catch (error: any) {
    console.error("Error al obtener catálogo B2B:", error);
    return { success: false, error: "Error al cargar catálogo." };
  }
}

export async function crearPedidoB2B(
  clienteId: number,
  items: Array<{ productoId: number; cantidad: number }>,
  notas?: string,
  fechaEntrega?: string
) {
  try {
    if (!items || items.length === 0) {
      return { success: false, error: "El carrito está vacío." };
    }

    const tenant = await requireTenant();

    const cliente = await prisma.cliente.findFirst({
      where: { id: Number(clienteId), tenantId: tenant.id },
      include: { lista_default: true },
    });

    if (!cliente) return { success: false, error: "Cliente no válido." };

    const adminUser = await prisma.usuario.findFirst({
      where: { tenantId: tenant.id },
    });
    const fallbackUsuarioId = adminUser?.id || 1;

    const listaId = cliente.lista_default_id || 1;
    const lista = await prisma.listaPrecio.findFirst({ where: { id: listaId, tenantId: tenant.id } });
    const configGlobal = await prisma.empresaConfig.findUnique({ where: { tenantId: tenant.id } });

    return await prisma.$transaction(
      async (tx) => {
        const sec = await tx.secuenciaPedido.upsert({
          where: { tenantId: tenant.id },
          update: { numero_actual: { increment: 1 } },
          create: { tenantId: tenant.id, numero_actual: 100 },
        });

        let subtotalPedido = 0;
        const detallesData = [];

        for (const item of items) {
          const prod = await tx.producto.findFirst({
            where: { id: Number(item.productoId), tenantId: tenant.id },
            include: {
              proveedor: true,
              marca: true,
              categoria: true,
              escalas_precio: true,
            },
          });

          if (!prod) continue;

          const margenDef = lista?.margen_defecto || 30;
          const { margenFinal, descuentoFinal } = resolverMargenYDescuento(prod, listaId, margenDef);

          const precioBase = calcularPrecioConCascada(
            prod.precio_costo,
            descuentoFinal,
            prod.alicuota_iva || 0,
            prod.proveedor?.aumento_porcentaje || 0,
            prod.marca?.aumento_porcentaje || 0,
            prod.categoria?.aumento_porcentaje || 0,
            margenFinal,
            configGlobal?.redondear_a_cinco || false,
            configGlobal?.aplicar_iva_en_precios || false
          );

          const { precioFinal } = resolverPrecioConEscala(prod, item.cantidad, precioBase, listaId);

          const precioRedondeado = Number(
            redondearPrecio(precioFinal, configGlobal?.redondear_a_cinco || false).toFixed(2)
          );
          const subtotalItem = Number((precioRedondeado * item.cantidad).toFixed(2));
          subtotalPedido += subtotalItem;

          detallesData.push({
            productoId: prod.id,
            cantidad: item.cantidad,
            precio_unitario: precioBase,
            descuento_individual: 0,
            precio_final: precioRedondeado,
            subtotal: subtotalItem,
          });
        }

        const notasFinales = `[PORTAL B2B MAYORISTA] ${notas || ""}`.trim();

        const nuevoPedido = await tx.pedido.create({
          data: {
            tenantId: tenant.id,
            numero: sec.numero_actual,
            clienteId: cliente.id,
            usuarioId: fallbackUsuarioId,
            listaPrecioId: listaId,
            subtotal: subtotalPedido,
            descuento_global: 0,
            total: subtotalPedido,
            estado: "PENDIENTE",
            metodo_pago: "CUENTA_CORRIENTE",
            notas: notasFinales,
            fecha_entrega: fechaEntrega ? new Date(fechaEntrega) : null,
            detalles: {
              create: detallesData,
            },
          },
        });

        return {
          success: true,
          data: {
            pedidoId: nuevoPedido.id,
            numero: nuevoPedido.numero,
            total: nuevoPedido.total,
          },
        };
      },
      { maxWait: 10000, timeout: 30000 }
    );
  } catch (error: any) {
    console.error("Error al crear pedido B2B:", error);
    return { success: false, error: error.message || "Error al procesar el pedido." };
  }
}

export async function obtenerEstadoCuentaB2B(clienteId: number) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Empresa no identificada" };

    const cliente = await prisma.cliente.findFirst({
      where: { id: Number(clienteId), tenantId: tenant.id },
      include: {
        movimientos_cc: {
          orderBy: { fecha: "desc" },
          take: 30,
        },
        ventas: {
          where: { estado_pago: { in: ["PENDIENTE", "PARCIAL"] } },
          include: { pagos: true },
          orderBy: { fecha_emision: "desc" },
        },
      },
    });

    if (!cliente) return { success: false, error: "Cliente no encontrado" };

    let saldoTotal = 0;
    const facturasPendientes = cliente.ventas.map((v) => {
      const pagado = v.pagos.reduce((a, p) => a + p.monto, 0);
      const saldo = Math.max(0, v.total - pagado);
      saldoTotal += saldo;
      return {
        id: v.id,
        tipo: v.tipo_comprobante.replace("_", " "),
        numero: `000${v.punto_venta}-${String(v.numero_comprobante).padStart(8, "0")}`,
        fecha: v.fecha_emision,
        total: v.total,
        saldo_pendiente: saldo,
      };
    });

    return {
      success: true,
      data: {
        saldoTotal,
        limiteCredito: cliente.limite_credito || 0,
        facturasPendientes,
        movimientos: cliente.movimientos_cc,
      },
    };
  } catch (error: any) {
    console.error("Error al obtener estado de cuenta B2B:", error);
    return { success: false, error: "Error al cargar cuenta corriente." };
  }
}
