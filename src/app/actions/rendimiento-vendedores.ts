"use server";

import prisma from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";

export async function obtenerRendimiento(filtros: {
  fechaDesde: string;
  fechaHasta: string;
  vendedorId: number | "TODOS";
  clienteId: number | "TODOS";
  estadoFiltro?: "TODAS" | "ACTIVAS" | "CANCELADAS";
}) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Tenant no encontrado." };

    const fechaGte = filtros.fechaDesde ? new Date(filtros.fechaDesde + "T00:00:00.000Z") : undefined;
    const fechaLte = filtros.fechaHasta ? new Date(filtros.fechaHasta + "T23:59:59.999Z") : undefined;

    const whereVentas: any = { tenantId: tenant.id };
    const wherePedidos: any = { tenantId: tenant.id };

    if (fechaGte && fechaLte) {
      whereVentas.fecha_emision = { gte: fechaGte, lte: fechaLte };
      wherePedidos.fecha = { gte: fechaGte, lte: fechaLte };
    }

    if (filtros.vendedorId !== "TODOS") {
      whereVentas.usuarioId = Number(filtros.vendedorId);
      wherePedidos.usuarioId = Number(filtros.vendedorId);
    } else {
      whereVentas.usuarioId = { not: null };
    }

    if (filtros.clienteId !== "TODOS") {
      whereVentas.clienteId = Number(filtros.clienteId);
      wherePedidos.clienteId = Number(filtros.clienteId);
    }

    const [ventas, pedidos, config, recibos, vendedores, clientes] = await Promise.all([
      prisma.venta.findMany({
        where: whereVentas,
        include: {
          cliente: {
            select: {
              id: true,
              nombre_razon_social: true,
              dni_cuit: true,
              direccion: true,
              telefono: true,
              limite_desc_cliente: true,
            },
          },
          usuario: {
            select: {
              id: true,
              nombre: true,
              rol: true,
              comision_personalizada: true,
              limite_desc_vendedor: true,
            },
          },
          detalles: {
            include: {
              producto: {
                select: {
                  id: true,
                  codigo_articulo: true,
                  nombre_producto: true,
                  categoria: { select: { limite_desc_categoria: true } },
                },
              },
            },
          },
        },
        orderBy: { fecha_emision: "desc" },
      }),
      prisma.pedido.findMany({
        where: wherePedidos,
        include: {
          cliente: {
            select: {
              id: true,
              nombre_razon_social: true,
              dni_cuit: true,
              direccion: true,
              telefono: true,
              limite_desc_cliente: true,
            },
          },
          usuario: {
            select: {
              id: true,
              nombre: true,
              rol: true,
              comision_personalizada: true,
              limite_desc_vendedor: true,
            },
          },
          detalles: {
            include: {
              producto: {
                select: {
                  id: true,
                  codigo_articulo: true,
                  nombre_producto: true,
                  categoria: { select: { limite_desc_categoria: true } },
                },
              },
            },
          },
        },
        orderBy: { fecha: "desc" },
      }),
      prisma.empresaConfig.findUnique({ where: { tenantId: tenant.id } }),
      prisma.movimientoCuentaCorriente.findMany({
        where: {
          tenantId: tenant.id,
          tipo: "ABONO",
          ...(fechaGte && fechaLte ? { fecha: { gte: fechaGte, lte: fechaLte } } : {}),
          ...(filtros.vendedorId !== "TODOS" ? { usuarioId: Number(filtros.vendedorId) } : {}),
          ...(filtros.clienteId !== "TODOS" ? { clienteId: Number(filtros.clienteId) } : {}),
        },
        include: {
          cliente: { select: { id: true, nombre_razon_social: true } },
          usuario: { select: { id: true, nombre: true } },
        },
        orderBy: { fecha: "desc" },
      }),
      prisma.usuario.findMany({
        where: { tenantId: tenant.id, activo: true },
        select: { id: true, nombre: true, rol: true, comision_personalizada: true, limite_desc_vendedor: true },
        orderBy: { nombre: "asc" },
      }),
      prisma.cliente.findMany({
        where: { tenantId: tenant.id },
        select: { id: true, nombre_razon_social: true, dni_cuit: true },
        orderBy: { nombre_razon_social: "asc" },
      }),
    ]);

    const comisionGlobal = (config?.comision_base_global || 5) / 100;
    const penalizacionGlobal = (config?.penalizacion_global || 2) / 100;
    const limiteGlobal = config?.limite_desc_global || 10;

    // Set de ventaIds ya asociadas a pedidos para deduplicar
    const ventaIdsFacturadas = new Set(ventas.map((v) => v.id));

    const operacionesProcesadas: any[] = [];

    // 1. PROCESAR VENTAS FACTURADAS
    for (const v of ventas) {
      const dtoGlobalPorcentaje = v.subtotal > 0 ? (v.descuento_global / v.subtotal) * 100 : 0;
      const comisionVendedor =
        v.usuario?.comision_personalizada !== null && v.usuario?.comision_personalizada !== undefined
          ? v.usuario.comision_personalizada / 100
          : comisionGlobal;

      let limiteAplicable = limiteGlobal;
      if (v.cliente?.limite_desc_cliente !== null && v.cliente?.limite_desc_cliente !== undefined) {
        limiteAplicable = v.cliente.limite_desc_cliente;
      } else if (v.usuario?.limite_desc_vendedor !== null && v.usuario?.limite_desc_vendedor !== undefined) {
        limiteAplicable = v.usuario.limite_desc_vendedor;
      }

      let esPenalizado = false;
      let excedenteGlobal = 0;
      if (dtoGlobalPorcentaje > limiteAplicable) {
        esPenalizado = true;
        excedenteGlobal = dtoGlobalPorcentaje - limiteAplicable;
      }

      const detallesProcesados = v.detalles.map((det) => {
        const limiteCat = det.producto?.categoria?.limite_desc_categoria;
        const limiteItem = limiteCat !== null && limiteCat !== undefined ? limiteCat : limiteAplicable;
        const excedeItem = det.descuento_individual > limiteItem;
        const excedenteItem = excedeItem ? det.descuento_individual - limiteItem : 0;
        if (excedeItem) esPenalizado = true;

        return {
          id: det.id,
          productoId: det.productoId,
          codigo: det.producto?.codigo_articulo || "S/C",
          nombre: det.producto?.nombre_producto || "Producto",
          cantidad: det.cantidad,
          precio_unitario: det.precio_unitario,
          descuento_individual: det.descuento_individual,
          subtotal: det.subtotal,
          limiteAplicado: limiteItem,
          excedente: excedenteItem,
        };
      });

      const comisionFinal = esPenalizado ? Math.max(0, comisionVendedor - penalizacionGlobal) : comisionVendedor;
      const comisionMonto = v.total * comisionFinal;

      const fechaObj = new Date(v.fecha_emision);
      const diaStr = fechaObj.toISOString().split("T")[0];

      operacionesProcesadas.push({
        id: `venta-${v.id}`,
        rawId: v.id,
        tipo: "VENTA",
        tipoLabel: "Factura / Venta",
        comprobante: `${v.tipo_comprobante.replace("_", " ")} ${String(v.punto_venta).padStart(4, "0")}-${String(
          v.numero_comprobante
        ).padStart(8, "0")}`,
        fecha: v.fecha_emision,
        diaStr,
        horaStr: fechaObj.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
        cliente: v.cliente,
        usuario: v.usuario,
        subtotal: v.subtotal,
        descuento_global: v.descuento_global,
        total: v.total,
        dtoPorcentaje: dtoGlobalPorcentaje,
        limiteAplicado: limiteAplicable,
        excedenteGlobal,
        esPenalizado,
        porcentajeComisionAplicado: comisionFinal * 100,
        estadoOperacion: "FACTURADO",
        estadoComision: "ACTIVA",
        comisionGenerada: comisionMonto,
        comisionCancelada: 0,
        penalizacionMonto: esPenalizado ? v.total * penalizacionGlobal : 0,
        detalles: detallesProcesados,
        notas: v.notas_venta || null,
      });
    }

    // 2. PROCESAR PEDIDOS (PREVENTA Y CANCELADOS)
    for (const p of pedidos) {
      // Si el pedido ya tiene una venta asociada que ya procesamos, omitimos para no duplicar cómputo
      if (p.ventaId && ventaIdsFacturadas.has(p.ventaId)) {
        continue;
      }

      const esCancelado = p.estado === "CANCELADO" || p.estado === "RECHAZADO";

      const dtoGlobalPorcentaje = p.subtotal > 0 ? (p.descuento_global / p.subtotal) * 100 : 0;
      const comisionVendedor =
        p.usuario?.comision_personalizada !== null && p.usuario?.comision_personalizada !== undefined
          ? p.usuario.comision_personalizada / 100
          : comisionGlobal;

      let limiteAplicable = limiteGlobal;
      if (p.cliente?.limite_desc_cliente !== null && p.cliente?.limite_desc_cliente !== undefined) {
        limiteAplicable = p.cliente.limite_desc_cliente;
      } else if (p.usuario?.limite_desc_vendedor !== null && p.usuario?.limite_desc_vendedor !== undefined) {
        limiteAplicable = p.usuario.limite_desc_vendedor;
      }

      let esPenalizado = false;
      let excedenteGlobal = 0;
      if (dtoGlobalPorcentaje > limiteAplicable) {
        esPenalizado = true;
        excedenteGlobal = dtoGlobalPorcentaje - limiteAplicable;
      }

      const detallesProcesados = p.detalles.map((det) => {
        const limiteCat = det.producto?.categoria?.limite_desc_categoria;
        const limiteItem = limiteCat !== null && limiteCat !== undefined ? limiteCat : limiteAplicable;
        const excedeItem = det.descuento_individual > limiteItem;
        const excedenteItem = excedeItem ? det.descuento_individual - limiteItem : 0;
        if (excedeItem) esPenalizado = true;

        return {
          id: det.id,
          productoId: det.productoId,
          codigo: det.producto?.codigo_articulo || "S/C",
          nombre: det.producto?.nombre_producto || "Producto",
          cantidad: det.cantidad,
          precio_unitario: det.precio_unitario,
          descuento_individual: det.descuento_individual,
          subtotal: det.subtotal,
          limiteAplicado: limiteItem,
          excedente: excedenteItem,
        };
      });

      const comisionFinal = esPenalizado ? Math.max(0, comisionVendedor - penalizacionGlobal) : comisionVendedor;
      const comisionCalculada = p.total * comisionFinal;

      const fechaObj = new Date(p.fecha);
      const diaStr = fechaObj.toISOString().split("T")[0];

      operacionesProcesadas.push({
        id: `pedido-${p.id}`,
        rawId: p.id,
        tipo: "PEDIDO",
        tipoLabel: esCancelado ? "Pedido Cancelado" : "Pedido Preventa",
        comprobante: `Pedido #${p.numero}`,
        fecha: p.fecha,
        diaStr,
        horaStr: fechaObj.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
        cliente: p.cliente,
        usuario: p.usuario,
        subtotal: p.subtotal,
        descuento_global: p.descuento_global,
        total: p.total,
        dtoPorcentaje: dtoGlobalPorcentaje,
        limiteAplicado: limiteAplicable,
        excedenteGlobal,
        esPenalizado,
        porcentajeComisionAplicado: comisionFinal * 100,
        estadoOperacion: p.estado,
        estadoComision: esCancelado ? "CANCELADA" : "ACTIVA",
        comisionGenerada: esCancelado ? 0 : comisionCalculada,
        comisionCancelada: esCancelado ? comisionCalculada : 0,
        penalizacionMonto: esPenalizado ? p.total * penalizacionGlobal : 0,
        detalles: detallesProcesados,
        notas: p.notas || p.motivo_no_entrega || null,
      });
    }

    // Ordenar cronológicamente descendente
    operacionesProcesadas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // Filtrar según estado si se solicitó
    let operacionesFinales = operacionesProcesadas;
    if (filtros.estadoFiltro === "ACTIVAS") {
      operacionesFinales = operacionesProcesadas.filter((op) => op.estadoComision === "ACTIVA");
    } else if (filtros.estadoFiltro === "CANCELADAS") {
      operacionesFinales = operacionesProcesadas.filter((op) => op.estadoComision === "CANCELADA");
    }

    // Métricas consolidadas
    const metricas = {
      totalFacturado: 0,
      totalCancelado: 0,
      comisionesTotales: 0,
      comisionesCanceladas: 0,
      totalPenalizaciones: 0,
      operacionesPenalizadas: 0,
      totalOperaciones: operacionesProcesadas.length,
      operacionesActivas: 0,
      operacionesCanceladas: 0,
    };

    for (const op of operacionesProcesadas) {
      if (op.estadoComision === "CANCELADA") {
        metricas.totalCancelado += op.total;
        metricas.comisionesCanceladas += op.comisionCancelada;
        metricas.operacionesCanceladas++;
      } else {
        metricas.totalFacturado += op.total;
        metricas.comisionesTotales += op.comisionGenerada;
        metricas.operacionesActivas++;
      }
      metricas.totalPenalizaciones += op.penalizacionMonto;
      if (op.esPenalizado) metricas.operacionesPenalizadas++;
    }

    const totalCobrado = recibos.reduce((acc, r) => acc + r.monto, 0);

    return {
      success: true,
      ventas: operacionesFinales,
      todasOperaciones: operacionesProcesadas,
      recibos,
      vendedores,
      clientes,
      metricas,
      totalCobrado,
      globalVars: { comisionGlobal, penalizacionGlobal, limiteGlobal },
    };
  } catch (error: any) {
    console.error("Error en obtenerRendimiento:", error);
    return { success: false, error: error.message || "Fallo al procesar el rendimiento." };
  }
}