"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getClientSession } from "./auth";
import { emitirComprobanteAFIP } from "./afip";
import { calcularPrecioConCascada, redondearPrecio, parsearFechaEntrega } from "@/lib/utils";
import { requireTenant, getTenantContext } from "@/lib/tenant-context";

// ============================================================================
// HELPER: RESOLVER DEPÓSITO ACTIVO DINÁMICAMENTE
// ============================================================================
async function resolverDepositoId(
  tx: any,
  tenantId: number,
  usuarioId?: number | null,
  requestedDepositoId?: number | null
): Promise<number> {
  if (requestedDepositoId && typeof requestedDepositoId === "number" && requestedDepositoId > 0) {
    const depo = await tx.deposito.findFirst({
      where: { id: requestedDepositoId, tenantId, estado: true },
    });
    if (depo) return depo.id;
  }

  if (usuarioId) {
    const user = await tx.usuario.findFirst({
      where: { id: usuarioId, tenantId },
      select: { sucursalId: true },
    });
    if (user?.sucursalId) {
      const sucursalDepo = await tx.deposito.findFirst({
        where: { tenantId, sucursalId: user.sucursalId, estado: true },
        orderBy: { id: "asc" },
      });
      if (sucursalDepo) return sucursalDepo.id;
    }
  }

  const primerDepo = await tx.deposito.findFirst({
    where: { tenantId, estado: true },
    orderBy: { id: "asc" },
  });
  if (primerDepo) return primerDepo.id;

  const anyDepo = await tx.deposito.findFirst({
    where: { tenantId },
    orderBy: { id: "asc" },
  });
  if (anyDepo) return anyDepo.id;

  const nuevoDepo = await tx.deposito.create({
    data: {
      tenantId,
      nombre: "Depósito Principal",
      estado: true,
    },
  });
  return nuevoDepo.id;
}

// ============================================================================
// 1. REGISTRAR NUEVO PEDIDO
// ============================================================================
export async function registrarPedidoPWA(data: any) {
  try {
    const tenant = await requireTenant();

    const resultado = await prisma.$transaction(async (tx) => {
      const session = await getClientSession();
      const usuarioId = (session as any)?.id ? Number((session as any).id) : null;

      if (!usuarioId) throw new Error("No estás autenticado.");

      if ((session as any)?.rol === "REPARTIDOR") {
        throw new Error("Los usuarios con rol Repartidor no tienen autorización para emitir pedidos.");
      }

      if ((session as any)?.rol !== "ADMIN") {
        const usuarioDb = await tx.usuario.findUnique({
          where: { id: usuarioId },
          select: { listaPrecioId: true, listas_permitidas: true },
        });
        if (usuarioDb) {
          let idsPermitidos: number[] = [];
          if (usuarioDb.listas_permitidas) {
            try {
              const parsed = JSON.parse(usuarioDb.listas_permitidas);
              if (Array.isArray(parsed) && parsed.length > 0) {
                idsPermitidos = parsed.map(Number).filter(Boolean);
              }
            } catch {}
          }
          if (idsPermitidos.length === 0 && usuarioDb.listaPrecioId) {
            idsPermitidos = [usuarioDb.listaPrecioId];
          }
          if (idsPermitidos.length > 0 && data.listaPrecioId && !idsPermitidos.includes(Number(data.listaPrecioId))) {
            throw new Error("No tenés autorización para emitir pedidos con esta lista de precios.");
          }
        }
      }

      let finalUsuarioId = usuarioId;
      if (data.vendedorId && Number(data.vendedorId) > 0) {
        const esAdmin = (session as any)?.rol === "ADMIN";
        const permisos = ((session as any)?.permisos as string[]) || [];
        if (esAdmin || permisos.includes("VENTAS") || permisos.includes("PEDIDOS")) {
          finalUsuarioId = Number(data.vendedorId);
        }
      }

      const baseDepositoId = await resolverDepositoId(
        tx,
        tenant.id,
        finalUsuarioId,
        data.depositoId ? Number(data.depositoId) : null
      );

      // A. VERIFICACIÓN INTELIGENTE DE STOCK
      const configEmpresa = await tx.empresaConfig.findUnique({
        where: { tenantId: tenant.id },
      });
      const permitirStockNegativo = configEmpresa?.permitir_stock_negativo ?? false;

      const deduccionesStock: { productoId: number; depositoId: number; cantidad: number }[] = [];

      for (const item of data.carrito) {
        const cantRequerida = Number(item.cantidad);

        // 1. Obtener todos los stocks del producto en depósitos activos de este tenant
        const stocksDisponibles = await tx.stockUbicacion.findMany({
          where: {
            productoId: item.productoId,
            deposito: { tenantId: tenant.id, estado: true },
          },
          include: { deposito: true },
          orderBy: { cantidad: "desc" },
        });

        const totalDisponible = stocksDisponibles.reduce(
          (acc: number, curr: any) => acc + (curr.cantidad > 0 ? curr.cantidad : 0),
          0
        );

        if (!permitirStockNegativo && totalDisponible < cantRequerida) {
          const prod = await tx.producto.findFirst({
            where: { id: item.productoId, tenantId: tenant.id },
          });
          throw new Error(
            `SIN STOCK: Solo quedan ${totalDisponible} un. de "${prod?.nombre_producto || item.nombre}". Las ventas sin stock están deshabilitadas.`
          );
        }

        // 2. Distribuir el descuento entre depósitos disponibles
        const stockBase = stocksDisponibles.find((s: any) => s.depositoId === baseDepositoId);
        if (stockBase && stockBase.cantidad >= cantRequerida) {
          deduccionesStock.push({
            productoId: item.productoId,
            depositoId: baseDepositoId,
            cantidad: cantRequerida,
          });
        } else {
          const stockAlternativoCompleto = stocksDisponibles.find((s: any) => s.cantidad >= cantRequerida);
          if (stockAlternativoCompleto) {
            deduccionesStock.push({
              productoId: item.productoId,
              depositoId: stockAlternativoCompleto.depositoId,
              cantidad: cantRequerida,
            });
          } else if (permitirStockNegativo && totalDisponible <= 0) {
            deduccionesStock.push({
              productoId: item.productoId,
              depositoId: baseDepositoId,
              cantidad: cantRequerida,
            });
          } else {
            let restante = cantRequerida;

            if (stockBase && stockBase.cantidad > 0) {
              const aTomar = Math.min(stockBase.cantidad, restante);
              deduccionesStock.push({
                productoId: item.productoId,
                depositoId: baseDepositoId,
                cantidad: aTomar,
              });
              restante -= aTomar;
            }

            for (const s of stocksDisponibles) {
              if (restante <= 0) break;
              if (s.depositoId === baseDepositoId) continue;
              if (s.cantidad <= 0) continue;

              const aTomar = Math.min(s.cantidad, restante);
              deduccionesStock.push({
                productoId: item.productoId,
                depositoId: s.depositoId,
                cantidad: aTomar,
              });
              restante -= aTomar;
            }

            if (restante > 0) {
              deduccionesStock.push({
                productoId: item.productoId,
                depositoId: baseDepositoId,
                cantidad: restante,
              });
            }
          }
        }
      }

      // B. GENERAR NÚMERO DE PEDIDO SECUENCIAL ATÓMICO POR TENANT
      const secuenciaPedido = await tx.secuenciaPedido.upsert({
        where: { tenantId: tenant.id },
        update: { numero_actual: { increment: 1 } },
        create: { tenantId: tenant.id, numero_actual: 1 },
      });
      const nuevoNumero = secuenciaPedido.numero_actual;

      // C. CREAR EL PEDIDO EN LA BD
      const nuevoPedido = await tx.pedido.create({
        data: {
          tenantId: tenant.id,
          numero: nuevoNumero,
          clienteId: data.clienteId,
          usuarioId: finalUsuarioId,
          listaPrecioId: data.listaPrecioId,
          subtotal: data.subtotal,
          descuento_global: data.descuento_global || 0,
          total: data.total,
          notas: data.notas || null,
          fecha_entrega: parsearFechaEntrega(data.fecha_entrega),
          estado: "PENDIENTE",
          metodo_pago: data.metodoPago || "CUENTA_CORRIENTE",
          monto_abonado: data.montoAbonado || 0,
          detalles: {
            create: data.carrito.map((item: any) => {
              let comboNom = item.combo_nombre || null;
              if (!comboNom && item.nombre && item.nombre.includes("(Combo: ")) {
                comboNom = item.nombre.split("(Combo: ")[1]?.replace(")", "")?.trim() || null;
              }
              return {
                productoId: item.productoId,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                descuento_individual: item.descuento_individual || 0,
                precio_final: item.precio_final,
                subtotal: item.subtotal,
                combo_nombre: comboNom,
              };
            }),
          },
        },
        include: {
          usuario: { select: { id: true, nombre: true } },
          cliente: { select: { id: true, nombre_razon_social: true } },
        },
      });

      // D. DESCONTAR STOCK PREVENTIVO DEL DEPÓSITO
      for (const d of deduccionesStock) {
        await tx.stockUbicacion.upsert({
          where: { productoId_depositoId: { productoId: d.productoId, depositoId: d.depositoId } },
          update: { cantidad: { decrement: d.cantidad } },
          create: { productoId: d.productoId, depositoId: d.depositoId, cantidad: -d.cantidad },
        });
      }

      return nuevoPedido;
    });

    revalidatePath("/vendedor");
    revalidatePath("/pedidos");
    revalidatePath("/pedidos/armados");
    revalidatePath("/ventas");
    return { success: true, data: resultado };
  } catch (error: any) {
    console.error("Error al registrar pedido:", error);
    return { success: false, error: error.message || "Error al procesar el pedido." };
  }
}

// ============================================================================
// HELPER: ADJUNTAR DETALLES DE VENTA / FACTURA A PEDIDOS
// ============================================================================
async function adjuntarVentasAPedidos(pedidos: any[]) {
  if (!pedidos || pedidos.length === 0) return pedidos;
  const ventaIds = pedidos
    .map((p) => p.ventaId)
    .filter((id): id is number => typeof id === "number" && id > 0);

  if (ventaIds.length === 0) {
    return pedidos.map((p) => ({ ...p, venta: null }));
  }

  const ventas = await prisma.venta.findMany({
    where: { id: { in: Array.from(new Set(ventaIds)) } },
    select: {
      id: true,
      tipo_comprobante: true,
      punto_venta: true,
      numero_comprobante: true,
      cae: true,
      cae_vto: true,
      fecha_emision: true,
      estado_pago: true,
      saldo_pendiente: true,
      total: true,
    },
  });

  const ventasMap = new Map(ventas.map((v) => [v.id, v]));

  return pedidos.map((p) => ({
    ...p,
    venta: p.ventaId ? ventasMap.get(p.ventaId) || null : null,
  }));
}

// ============================================================================
// 2. OBTENER EL HISTORIAL DEL VENDEDOR
// ============================================================================
export async function obtenerPedidosVendedor() {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return [];

    const session = await getClientSession();
    const usuarioId = (session as any)?.id ? Number((session as any).id) : null;
    if (!usuarioId) return [];

    const [pedidos, usuarioDb, config] = await Promise.all([
      prisma.pedido.findMany({
        where: { tenantId: tenant.id, usuarioId },
        include: {
          cliente: true,
          detalles: {
            include: {
              producto: { select: { nombre_producto: true, codigo_articulo: true } },
            },
          },
        },
        orderBy: { fecha: "desc" },
        take: 100,
      }),
      prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { comision_personalizada: true, limite_desc_vendedor: true },
      }),
      prisma.empresaConfig.findUnique({
        where: { tenantId: tenant.id },
        select: { comision_base_global: true, penalizacion_global: true, limite_desc_global: true },
      }),
    ]);

    const comisionGlobal = (config?.comision_base_global || 5) / 100;
    const penalizacionGlobal = (config?.penalizacion_global || 2) / 100;
    const limiteGlobal = config?.limite_desc_global || 10;
    const comisionBase =
      usuarioDb?.comision_personalizada !== null && usuarioDb?.comision_personalizada !== undefined
        ? usuarioDb.comision_personalizada / 100
        : comisionGlobal;

    const pedidosConVenta = await adjuntarVentasAPedidos(pedidos);

    return pedidosConVenta.map((p: any) => {
      const dtoGlobalPorcentaje = p.subtotal > 0 ? (p.descuento_global / p.subtotal) * 100 : 0;
      const limite = p.cliente?.limite_desc_cliente ?? usuarioDb?.limite_desc_vendedor ?? limiteGlobal;
      const esPenalizado = dtoGlobalPorcentaje > limite;
      const comisionFinal = esPenalizado ? Math.max(0, comisionBase - penalizacionGlobal) : comisionBase;
      const comisionCalculada = p.total * comisionFinal;
      const esCancelado = p.estado === "CANCELADO" || p.estado === "RECHAZADO";

      return {
        ...p,
        comision_info: {
          porcentaje_aplicado: comisionFinal * 100,
          porcentaje_base: comisionBase * 100,
          es_penalizado: esPenalizado,
          limite_aplicado: limite,
          estado_comision: esCancelado ? "CANCELADA" : "ACTIVA",
          comision_monto: esCancelado ? 0 : comisionCalculada,
          comision_cancelada_monto: esCancelado ? comisionCalculada : 0,
        },
      };
    });
  } catch (error) {
    console.error("Error al obtener pedidos:", error);
    return [];
  }
}

// ============================================================================
// 3. ANULAR O EDITAR PEDIDO
// ============================================================================
export async function accionarPedidoVendedor(pedidoId: number, accion: "CANCELAR" | "EDITAR") {
  try {
    const tenant = await requireTenant();

    const resultado = await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findFirst({
        where: { id: pedidoId, tenantId: tenant.id },
        include: { detalles: true },
      });

      if (!pedido) throw new Error("Pedido no encontrado.");

      if (
        pedido.ventaId ||
        pedido.estado === "FACTURADO" ||
        pedido.estado === "RECHAZADO" ||
        pedido.estado === "CANCELADO"
      ) {
        throw new Error(
          "ACCESO DENEGADO: El pedido ya está facturado o cancelado. Ya no se puede modificar desde la calle."
        );
      }

      const depositoCentralId = await resolverDepositoId(tx, tenant.id, pedido.usuarioId, null);

      for (const item of pedido.detalles) {
        await tx.stockUbicacion.upsert({
          where: { productoId_depositoId: { productoId: item.productoId, depositoId: depositoCentralId } },
          update: { cantidad: { increment: item.cantidad } },
          create: { productoId: item.productoId, depositoId: depositoCentralId, cantidad: item.cantidad },
        });

        await tx.movimientoStock.create({
          data: {
            tenantId: tenant.id,
            productoId: item.productoId,
            depositoDestinoId: depositoCentralId,
            cantidad: item.cantidad,
            tipo: "REINGRESO_RECHAZO_REPARTO",
            motivo: `Devolución de stock por Pedido #${pedido.numero} ${accion === "EDITAR" ? "ANULADO PARA EDICIÓN" : "CANCELADO"} desde PWA Vendedor`,
            usuarioId: pedido.usuarioId,
          },
        });
      }

      const fechaHora = new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
      const mensajeAuditoria = `\n\n[SISTEMA ${fechaHora}] -> Pedido ${
        accion === "EDITAR" ? "ANULADO PARA EDICIÓN" : "CANCELADO"
      } por el vendedor en calle. Stock devuelto a depósito.`;

      const pedidoActualizado = await tx.pedido.update({
        where: { id: pedidoId },
        data: {
          estado: "CANCELADO",
          notas: (pedido.notas || "") + mensajeAuditoria,
        },
      });

      return pedidoActualizado;
    });

    revalidatePath("/vendedor");
    revalidatePath("/pedidos");
    revalidatePath("/pedidos/armados");
    revalidatePath("/inventario");
    revalidatePath("/ventas");
    return { success: true, data: resultado };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 4. FUNCIONES DE ADMINISTRACIÓN (OFICINA)
// ============================================================================
export async function obtenerTodosLosPedidos() {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return [];

    const pedidos = await prisma.pedido.findMany({
      where: { tenantId: tenant.id },
      include: {
        cliente: {
          select: {
            id: true,
            nombre_razon_social: true,
            dni_cuit: true,
            condicion_iva: true,
            telefono: true,
            direccion: true,
            limite_credito: true,
            dias_aviso_deuda: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            rol: true,
            username: true,
            telefono: true,
            sucursalId: true,
          },
        },
        repartidor: { select: { id: true, nombre: true, rol: true, username: true, telefono: true } },
        listaPrecio: { select: { id: true, nombre: true, margen_defecto: true } },
        detalles: {
          include: { producto: { select: { id: true, nombre_producto: true, codigo_articulo: true } } },
        },
      },
      orderBy: { fecha: "desc" },
    });

    return await adjuntarVentasAPedidos(pedidos);
  } catch (error) {
    console.error("Error al obtener todos los pedidos:", error);
    return [];
  }
}

export async function cambiarEstadoPedidoAdmin(
  pedidoId: number,
  nuevoEstado:
    | "APROBADO"
    | "RECHAZADO"
    | "CANCELADO"
    | "FACTURADO"
    | "ARMADO"
    | "LISTO_ENTREGA"
    | "ENTREGADO"
    | "NO_ENTREGADO",
  tipoComprobante?: string,
  requestedDepositoId?: number | null,
  motivoCancelacion?: string
) {
  try {
    const tenant = await requireTenant();

    const resultado = await prisma.$transaction(
      async (tx) => {
        const pedido = await tx.pedido.findFirst({
          where: { id: pedidoId, tenantId: tenant.id },
          include: {
            detalles: { include: { producto: true } },
            cliente: true,
            listaPrecio: true,
            usuario: true,
          },
        });
        if (!pedido) throw new Error("Pedido no encontrado");

        if (nuevoEstado === "RECHAZADO" || nuevoEstado === "CANCELADO") {
          if (pedido.estado === "RECHAZADO" || pedido.estado === "CANCELADO") {
            throw new Error(`El pedido ya se encuentra ${pedido.estado.toLowerCase()}.`);
          }

          if (pedido.ventaId) {
            throw new Error(
              `ACCESO DENEGADO: El pedido ya tiene una factura/comprobante emitido (Venta #${pedido.ventaId}). Debe anular o procesar la nota de crédito desde Ventas.`
            );
          }

          const session = await getClientSession();
          const sessionUsuarioId = (session as any)?.id ? Number((session as any).id) : null;

          const depositoCentralId = await resolverDepositoId(
            tx,
            tenant.id,
            pedido.usuarioId,
            requestedDepositoId || null
          );

          for (const item of pedido.detalles) {
            await tx.stockUbicacion.upsert({
              where: { productoId_depositoId: { productoId: item.productoId, depositoId: depositoCentralId } },
              update: { cantidad: { increment: item.cantidad } },
              create: { productoId: item.productoId, depositoId: depositoCentralId, cantidad: item.cantidad },
            });

            await tx.movimientoStock.create({
              data: {
                tenantId: tenant.id,
                productoId: item.productoId,
                depositoDestinoId: depositoCentralId,
                cantidad: item.cantidad,
                tipo: "REINGRESO_RECHAZO_REPARTO",
                motivo: `Devolución de stock por Pedido #${pedido.numero} ${nuevoEstado} (Estado anterior: ${pedido.estado})${motivoCancelacion ? ` - Obs: ${motivoCancelacion}` : ""}`,
                usuarioId: sessionUsuarioId || pedido.usuarioId,
              },
            });
          }

          const fechaHora = new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
          const actualizado = await tx.pedido.update({
            where: { id: pedidoId },
            data: {
              estado: nuevoEstado,
              notas: (pedido.notas || "") + `\n\n[ADMINISTRACIÓN ${fechaHora}] -> ${nuevoEstado}. Stock devuelto al inventario (Depósito ID: ${depositoCentralId}).${motivoCancelacion ? ` Motivo: ${motivoCancelacion}` : ""}`,
            },
          });
          return { pedido: actualizado };
        }

        if (nuevoEstado === "APROBADO") {
          const fechaHora = new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
          const actualizado = await tx.pedido.update({
            where: { id: pedidoId },
            data: {
              estado: "APROBADO",
              notas: (pedido.notas || "") + `\n\n[ADMINISTRACIÓN ${fechaHora}] -> APROBADO. En preparación.`,
            },
          });
          return { pedido: actualizado };
        }

        if (nuevoEstado === "ARMADO" || nuevoEstado === "LISTO_ENTREGA") {
          const fechaHora = new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
          const finalRepartidorId = pedido.repartidorId || pedido.usuarioId || null;
          const finalFechaEntrega = pedido.fecha_entrega || new Date();
          const actualizado = await tx.pedido.update({
            where: { id: pedidoId },
            data: {
              estado: nuevoEstado as any,
              repartidorId: finalRepartidorId,
              fecha_entrega: finalFechaEntrega,
              notas: (pedido.notas || "") + `\n\n[ADMINISTRACIÓN ${fechaHora}] -> Pedido ARMADO y listo para reparto.`,
            },
          });
          return { pedido: actualizado };
        }

        if (nuevoEstado === "ENTREGADO") {
          const fechaHora = new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
          const actualizado = await tx.pedido.update({
            where: { id: pedidoId },
            data: {
              estado: "ENTREGADO",
              fecha_entrega: pedido.fecha_entrega || new Date(),
              motivo_no_entrega: null,
              notas: (pedido.notas || "") + `\n\n[ADMINISTRACIÓN ${fechaHora}] -> Marcado como ENTREGADO.`,
            },
          });
          return { pedido: actualizado };
        }

        if (nuevoEstado === "NO_ENTREGADO") {
          const fechaHora = new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
          const actualizado = await tx.pedido.update({
            where: { id: pedidoId },
            data: {
              estado: "NO_ENTREGADO",
              notas: (pedido.notas || "") + `\n\n[ADMINISTRACIÓN ${fechaHora}] -> Marcado como NO ENTREGADO.`,
            },
          });
          return { pedido: actualizado };
        }

        if (nuevoEstado === "FACTURADO") {
          if (pedido.ventaId) {
            throw new Error(`Este pedido ya fue facturado previamente (Venta #${pedido.ventaId}).`);
          }
          if (pedido.estado === "RECHAZADO" || pedido.estado === "CANCELADO") {
            throw new Error("No se puede facturar un pedido cancelado o rechazado.");
          }

          const tipo_comprobante = tipoComprobante || "COMPROBANTE_X";
          const usuarioVendedorId = pedido.usuarioId;
          const sucursalId = pedido.usuario?.sucursalId || null;
          const depositoCentralId = await resolverDepositoId(tx, tenant.id, usuarioVendedorId, null);

          let secuencia = await tx.secuenciaFactura.findUnique({
            where: {
              tenantId_tipo_comprobante: {
                tenantId: tenant.id,
                tipo_comprobante,
              },
            },
          });
          if (!secuencia) {
            secuencia = await tx.secuenciaFactura.create({
              data: {
                tenantId: tenant.id,
                tipo_comprobante,
                punto_venta: 1,
                numero_actual: 0,
              },
            });
          }
          const nuevoNumero = secuencia.numero_actual + 1;

          let afipData: any = null;
          if (["FACTURA_A", "FACTURA_B", "FACTURA_C"].includes(tipo_comprobante)) {
            afipData = await emitirComprobanteAFIP(
              tipo_comprobante,
              secuencia.punto_venta,
              pedido.cliente?.dni_cuit || "",
              pedido.cliente?.condicion_iva || "CONSUMIDOR_FINAL",
              pedido.total
            );
          }

          const parseCaeVtoDate = (rawDate: any): Date | null => {
            if (!rawDate) return null;
            if (rawDate instanceof Date && !isNaN(rawDate.getTime())) return rawDate;
            const strDate = String(rawDate).trim();
            if (/^\d{8}$/.test(strDate)) {
              const year = parseInt(strDate.substring(0, 4), 10);
              const month = parseInt(strDate.substring(4, 6), 10) - 1;
              const day = parseInt(strDate.substring(6, 8), 10);
              return new Date(year, month, day, 12, 0, 0);
            }
            const parsed = new Date(strDate);
            return !isNaN(parsed.getTime()) ? parsed : null;
          };
          const finalDateCae = afipData ? parseCaeVtoDate(afipData.cae_vto) : null;

          const esCuentaCorriente = pedido.metodo_pago === "CUENTA_CORRIENTE";
          const estadoPago = esCuentaCorriente ? "PENDIENTE" : "PAGADO";
          const saldoPendiente = esCuentaCorriente ? pedido.total : 0;

          let fechaVencimientoCC: Date | null = null;
          if (esCuentaCorriente && pedido.cliente && pedido.cliente.dias_aviso_deuda > 0) {
            fechaVencimientoCC = new Date();
            fechaVencimientoCC.setDate(fechaVencimientoCC.getDate() + pedido.cliente.dias_aviso_deuda);
          }

          if (
            esCuentaCorriente &&
            pedido.cliente?.limite_credito !== null &&
            pedido.cliente?.limite_credito !== undefined &&
            pedido.cliente.limite_credito > 0
          ) {
            const deudasPrevias = await tx.venta.aggregate({
              where: { tenantId: tenant.id, clienteId: pedido.clienteId, saldo_pendiente: { gt: 0 } },
              _sum: { saldo_pendiente: true },
            });
            const deudaAcumulada = deudasPrevias._sum.saldo_pendiente || 0;
            if (deudaAcumulada + pedido.total > pedido.cliente.limite_credito) {
              throw new Error(
                `LIMITE_CREDITO_EXCEDIDO: El cliente ya debe $${deudaAcumulada.toFixed(2)} y su tope autorizado es $${pedido.cliente.limite_credito.toFixed(2)}.`
              );
            }
          }

          const ventaData = {
            tenantId: tenant.id,
            fecha_emision: new Date(),
            tipo_comprobante,
            punto_venta: secuencia.punto_venta,
            numero_comprobante: nuevoNumero,
            clienteId: pedido.clienteId,
            listaPrecioId: pedido.listaPrecioId,
            sucursalId,
            depositoOrigenId: depositoCentralId,

            cae: afipData ? afipData.cae : null,
            cae_vto: finalDateCae,
            importe_neto: afipData ? afipData.importe_neto : pedido.subtotal,
            importe_iva: afipData ? afipData.importe_iva : 0,

            metodo_pago: (esCuentaCorriente ? "CUENTA_CORRIENTE" : "CONTADO") as any,
            estado_pago: estadoPago as any,
            saldo_pendiente: saldoPendiente,
            fecha_vencimiento_cc: fechaVencimientoCC,

            notas_venta: `Generado desde Pedido #${pedido.numero}`,
            comentario_venta: pedido.notas,

            subtotal: pedido.subtotal,
            descuento_global: pedido.descuento_global,
            total: pedido.total,

            presupuestoOrigenId: null,
            usuarioId: usuarioVendedorId,

            detalles: {
              create: pedido.detalles.map((item: any) => ({
                productoId: item.productoId,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                descuento_individual: item.descuento_individual,
                precio_final: item.precio_final,
                subtotal: item.subtotal,
                costo_unitario: item.producto?.precio_costo || 0,
              })),
            },

            pagos: {
              create: [
                {
                  metodo_pago: (esCuentaCorriente ? "CUENTA_CORRIENTE" : "CONTADO") as any,
                  monto: pedido.total,
                },
              ],
            },
          };

          const nuevaVenta = await tx.venta.create({
            data: ventaData,
          });

          if (!esCuentaCorriente) {
            const cajaAbierta = sucursalId
              ? await tx.cajaDiaria.findFirst({ where: { tenantId: tenant.id, estado: "ABIERTA", sucursalId } })
              : await tx.cajaDiaria.findFirst({ where: { tenantId: tenant.id, estado: "ABIERTA" } });

            if (cajaAbierta) {
              await tx.movimientoCaja.create({
                data: {
                  cajaId: cajaAbierta.id,
                  tipo: "VENTA",
                  metodo_pago: "CONTADO",
                  monto: pedido.total,
                  descripcion: `Pedido #${pedido.numero} → ${tipo_comprobante.replace("_", " ")} 000${secuencia.punto_venta}-${nuevoNumero}`,
                  ventaId: nuevaVenta.id,
                  usuarioId: pedido.usuarioId,
                },
              });
            }
          }

          if (esCuentaCorriente) {
            await tx.movimientoCuentaCorriente.create({
              data: {
                tenantId: tenant.id,
                clienteId: pedido.clienteId,
                ventaId: nuevaVenta.id,
                tipo: "CARGO",
                monto: pedido.total,
                metodo_pago: "CUENTA_CORRIENTE",
                notas: `Crédito por Pedido #${pedido.numero} → Factura #${nuevoNumero}`,
              },
            });
          }

          for (const item of pedido.detalles) {
            await tx.movimientoStock.create({
              data: {
                tenantId: tenant.id,
                productoId: item.productoId,
                depositoOrigenId: depositoCentralId,
                cantidad: item.cantidad,
                tipo: "VENTA",
                motivo: `Facturación de Pedido #${pedido.numero}`,
                ventaId: nuevaVenta.id,
              },
            });
          }

          await tx.secuenciaFactura.update({
            where: {
              tenantId_tipo_comprobante: {
                tenantId: tenant.id,
                tipo_comprobante,
              },
            },
            data: { numero_actual: nuevoNumero },
          });

          const fechaHora = new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
          let nuevoEstadoLogistico = pedido.estado;
          if (pedido.estado === "PENDIENTE") {
            nuevoEstadoLogistico = "APROBADO";
          }

          const pedidoActualizado = await tx.pedido.update({
            where: { id: pedidoId },
            data: {
              estado: nuevoEstadoLogistico as any,
              ventaId: nuevaVenta.id,
              notas: (pedido.notas || "") + `\n\n[ADMINISTRACIÓN ${fechaHora}] -> FACTURADO como ${tipo_comprobante.replace("_", " ")} #${nuevoNumero}. VentaID: ${nuevaVenta.id}`,
            },
          });

          return { pedido: pedidoActualizado, venta: nuevaVenta };
        }

        throw new Error("Estado no válido.");
      },
      {
        maxWait: 10000,
        timeout: 35000,
      }
    );

    revalidatePath("/pedidos");
    revalidatePath("/pedidos/armados");
    revalidatePath("/historial");
    revalidatePath("/caja");
    revalidatePath("/cuentas-corrientes");
    revalidatePath("/inventario");
    revalidatePath("/vendedor");

    return { success: true, data: resultado };
  } catch (error: any) {
    console.error("Error al procesar pedido:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 5. EDITAR PEDIDO (ADMIN)
// ============================================================================
export async function editarPedidoAdmin(
  pedidoId: number,
  nuevoCarrito: any[],
  subtotal: number,
  total: number,
  notas: string,
  fechaEntrega?: string | Date | null
) {
  try {
    const tenant = await requireTenant();

    const resultado = await prisma.$transaction(async (tx) => {
      const pedidoActual = await tx.pedido.findFirst({
        where: { id: pedidoId, tenantId: tenant.id },
        include: { detalles: true },
      });

      if (!pedidoActual) throw new Error("Pedido no encontrado.");

      if (pedidoActual.estado !== "PENDIENTE" && pedidoActual.estado !== "APROBADO") {
        throw new Error(`El pedido está ${pedidoActual.estado}. No se puede editar.`);
      }

      const depositoCentralId = await resolverDepositoId(tx, tenant.id, pedidoActual.usuarioId, null);

      for (const item of pedidoActual.detalles) {
        await tx.stockUbicacion.upsert({
          where: { productoId_depositoId: { productoId: item.productoId, depositoId: depositoCentralId } },
          update: { cantidad: { increment: item.cantidad } },
          create: { productoId: item.productoId, depositoId: depositoCentralId, cantidad: item.cantidad },
        });
      }

      const configEmpresa = await tx.empresaConfig.findUnique({
        where: { tenantId: tenant.id },
      });
      const permitirStockNegativo = configEmpresa?.permitir_stock_negativo ?? false;

      const deduccionesStockEditar: { productoId: number; depositoId: number; cantidad: number }[] = [];

      for (const item of nuevoCarrito) {
        const cantRequerida = Number(item.cantidad);

        const stocksDisponibles = await tx.stockUbicacion.findMany({
          where: {
            productoId: item.productoId,
            deposito: { tenantId: tenant.id, estado: true },
          },
          include: { deposito: true },
          orderBy: { cantidad: "desc" },
        });

        const totalDisponible = stocksDisponibles.reduce(
          (acc: number, curr: any) => acc + (curr.cantidad > 0 ? curr.cantidad : 0),
          0
        );

        if (!permitirStockNegativo && totalDisponible < cantRequerida) {
          const prod = await tx.producto.findFirst({
            where: { id: item.productoId, tenantId: tenant.id },
          });
          throw new Error(
            `SIN STOCK SUFICIENTE: Solo quedan ${totalDisponible} un. de "${prod?.nombre_producto || item.nombre}". Las ventas sin stock están deshabilitadas.`
          );
        }

        const stockCentral = stocksDisponibles.find((s: any) => s.depositoId === depositoCentralId);
        if (stockCentral && stockCentral.cantidad >= cantRequerida) {
          deduccionesStockEditar.push({
            productoId: item.productoId,
            depositoId: depositoCentralId,
            cantidad: cantRequerida,
          });
        } else {
          const stockAlternativo = stocksDisponibles.find((s: any) => s.cantidad >= cantRequerida);
          if (stockAlternativo) {
            deduccionesStockEditar.push({
              productoId: item.productoId,
              depositoId: stockAlternativo.depositoId,
              cantidad: cantRequerida,
            });
          } else if (permitirStockNegativo && totalDisponible <= 0) {
            deduccionesStockEditar.push({
              productoId: item.productoId,
              depositoId: depositoCentralId,
              cantidad: cantRequerida,
            });
          } else {
            let restante = cantRequerida;

            if (stockCentral && stockCentral.cantidad > 0) {
              const aTomar = Math.min(stockCentral.cantidad, restante);
              deduccionesStockEditar.push({
                productoId: item.productoId,
                depositoId: depositoCentralId,
                cantidad: aTomar,
              });
              restante -= aTomar;
            }

            for (const s of stocksDisponibles) {
              if (restante <= 0) break;
              if (s.depositoId === depositoCentralId) continue;
              if (s.cantidad <= 0) continue;

              const aTomar = Math.min(s.cantidad, restante);
              deduccionesStockEditar.push({
                productoId: item.productoId,
                depositoId: s.depositoId,
                cantidad: aTomar,
              });
              restante -= aTomar;
            }

            if (restante > 0) {
              deduccionesStockEditar.push({
                productoId: item.productoId,
                depositoId: depositoCentralId,
                cantidad: restante,
              });
            }
          }
        }
      }

      for (const d of deduccionesStockEditar) {
        await tx.stockUbicacion.upsert({
          where: { productoId_depositoId: { productoId: d.productoId, depositoId: d.depositoId } },
          update: { cantidad: { decrement: d.cantidad } },
          create: { productoId: d.productoId, depositoId: d.depositoId, cantidad: -d.cantidad },
        });
      }

      await tx.detallePedido.deleteMany({
        where: { pedidoId: pedidoActual.id },
      });

      const fechaHora = new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });

      const dataToUpdate: any = {
        subtotal,
        total,
        notas: notas + `\n\n[ADMINISTRACIÓN ${fechaHora}] -> PEDIDO EDITADO.`,
        detalles: {
          create: nuevoCarrito.map((item: any) => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            descuento_individual: item.descuento_individual || 0,
            precio_final: item.precio_final,
            subtotal: item.subtotal,
          })),
        },
      };

      if (fechaEntrega !== undefined) {
        dataToUpdate.fecha_entrega = parsearFechaEntrega(fechaEntrega);
      }

      const pedidoActualizado = await tx.pedido.update({
        where: { id: pedidoActual.id },
        data: dataToUpdate,
      });

      return pedidoActualizado;
    });

    revalidatePath("/pedidos");
    revalidatePath("/inventario");

    return { success: true, data: resultado };
  } catch (error: any) {
    console.error("Error al editar pedido:", error);
    return { success: false, error: error.message || "Error desconocido al editar." };
  }
}

// ============================================================================
// 6. RECALCULAR PRECIOS DE PEDIDOS PENDIENTES
// ============================================================================
export async function recalcularPreciosPendientes() {
  try {
    const tenant = await requireTenant();

    const resultado = await prisma.$transaction(
      async (tx) => {
        const config = await tx.empresaConfig.findUnique({
          where: { tenantId: tenant.id },
        });
        const redondearA5 = config?.redondear_a_cinco || false;

        const pedidosPendientes = await tx.pedido.findMany({
          where: { tenantId: tenant.id, estado: "PENDIENTE" },
          include: {
            listaPrecio: true,
            detalles: {
              include: {
                producto: {
                  include: {
                    proveedor: true,
                    marca: true,
                    categoria: true,
                    listas_precios: true,
                  },
                },
              },
            },
          },
        });

        if (pedidosPendientes.length === 0) {
          return { count: 0 };
        }

        let actualizados = 0;

        for (const pedido of pedidosPendientes) {
          let nuevoSubtotalPedido = 0;

          for (const detalle of pedido.detalles) {
            const prod = detalle.producto;
            const listaIDNum = pedido.listaPrecioId;

            const pivot = prod.listas_precios?.find((p: any) => p.listaPrecioId === listaIDNum);
            const margenFinal = pivot?.margen_personalizado ?? pedido.listaPrecio.margen_defecto;

            const aumProv = prod.proveedor?.aumento_porcentaje || 0;
            const aumMarca = prod.marca?.aumento_porcentaje || 0;
            const aumCat = prod.categoria?.aumento_porcentaje || 0;

            const nuevoPrecioBase = calcularPrecioConCascada(
              prod.precio_costo,
              prod.descuento_proveedor || 0,
              prod.alicuota_iva || 0,
              aumProv,
              aumMarca,
              aumCat,
              margenFinal,
              redondearA5
            );

            const sinRedondearIndividual = nuevoPrecioBase * (1 - detalle.descuento_individual / 100);
            const nuevoPrecioFinal = Number(redondearPrecio(sinRedondearIndividual, redondearA5).toFixed(2));
            const nuevoSubtotalDetalle = nuevoPrecioFinal * detalle.cantidad;

            nuevoSubtotalPedido += nuevoSubtotalDetalle;

            await tx.detallePedido.update({
              where: { id: detalle.id },
              data: {
                precio_unitario: nuevoPrecioBase,
                precio_final: nuevoPrecioFinal,
                subtotal: nuevoSubtotalDetalle,
              },
            });
          }

          const nuevoTotalPedido = nuevoSubtotalPedido - pedido.descuento_global;
          const fechaHora = new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });

          await tx.pedido.update({
            where: { id: pedido.id },
            data: {
              subtotal: nuevoSubtotalPedido,
              total: nuevoTotalPedido,
              notas: (pedido.notas || "") + `\n\n[SISTEMA ${fechaHora}] -> Precios recalculados masivamente.`,
            },
          });

          actualizados++;
        }

        return { count: actualizados };
      },
      {
        maxWait: 15000,
        timeout: 60000,
      }
    );

    revalidatePath("/pedidos");
    return { success: true, count: resultado.count };
  } catch (error: any) {
    console.error("Error al recalcular precios:", error);
    return { success: false, error: error.message || "Error al recalcular precios." };
  }
}

// ============================================================================
// 10. GESTIÓN DE DESPACHO Y REPARTO
// ============================================================================

export async function obtenerRepartidores() {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return [];

    return await prisma.usuario.findMany({
      where: { tenantId: tenant.id, activo: true },
      select: { id: true, nombre: true, rol: true, username: true },
      orderBy: { nombre: "asc" },
    });
  } catch {
    return [];
  }
}

export async function marcarPedidoListoEntrega(
  pedidoId: number,
  repartidorId?: number | null,
  fechaEntrega?: Date | string | null
) {
  try {
    const tenant = await requireTenant();
    const fechaHora = new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
    const pedido = await prisma.pedido.findFirst({
      where: { id: pedidoId, tenantId: tenant.id },
    });
    if (!pedido) return { success: false, error: "Pedido no encontrado." };

    const notaAuditoria = `\n\n[DESPACHO ${fechaHora}] -> Pedido ARMADO y listo para reparto.`;

    const finalRepartidorId =
      repartidorId !== undefined
        ? repartidorId
          ? Number(repartidorId)
          : null
        : pedido.repartidorId || pedido.usuarioId || null;

    let finalFechaEntrega: Date | null;
    if (fechaEntrega !== undefined) {
      finalFechaEntrega = parsearFechaEntrega(fechaEntrega);
    } else {
      finalFechaEntrega = pedido.fecha_entrega || parsearFechaEntrega(new Date());
    }

    const actualizado = await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        estado: "ARMADO",
        repartidorId: finalRepartidorId,
        fecha_entrega: finalFechaEntrega,
        notas: (pedido.notas || "") + notaAuditoria,
      },
    });

    revalidatePath("/pedidos");
    revalidatePath("/pedidos/armados");
    revalidatePath("/vendedor");
    return { success: true, data: actualizado };
  } catch (error: any) {
    console.error("Error al marcar pedido listo:", error);
    return { success: false, error: error.message || "Error al marcar listo para entrega." };
  }
}

export async function marcarPedidoEntregado(pedidoId: number, notas?: string) {
  try {
    const tenant = await requireTenant();
    const fechaHora = new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
    const pedido = await prisma.pedido.findFirst({
      where: { id: pedidoId, tenantId: tenant.id },
    });
    if (!pedido) return { success: false, error: "Pedido no encontrado." };

    const notaAuditoria = `\n\n[REPARTO ${fechaHora}] -> ENTREGADO con éxito.` + (notas ? ` Obs: ${notas}` : "");

    const actualizado = await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        estado: "ENTREGADO",
        fecha_entrega: new Date(),
        motivo_no_entrega: null,
        notas: (pedido.notas || "") + notaAuditoria,
      },
    });

    revalidatePath("/pedidos");
    revalidatePath("/pedidos/armados");
    revalidatePath("/vendedor");
    return { success: true, data: actualizado };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al registrar entrega." };
  }
}

export async function marcarPedidoNoEntregado(pedidoId: number, motivo: string) {
  try {
    if (!motivo || !motivo.trim()) return { success: false, error: "Debe indicar el motivo por el cual no se entregó." };
    const tenant = await requireTenant();
    const fechaHora = new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
    const pedido = await prisma.pedido.findFirst({
      where: { id: pedidoId, tenantId: tenant.id },
    });
    if (!pedido) return { success: false, error: "Pedido no encontrado." };

    const notaAuditoria = `\n\n[REPARTO ${fechaHora}] -> NO ENTREGADO. Motivo: ${motivo.trim()}`;

    const actualizado = await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        estado: "NO_ENTREGADO",
        motivo_no_entrega: motivo.trim(),
        notas: (pedido.notas || "") + notaAuditoria,
      },
    });

    revalidatePath("/pedidos");
    revalidatePath("/pedidos/armados");
    revalidatePath("/vendedor");
    return { success: true, data: actualizado };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al registrar no entrega." };
  }
}

export async function obtenerPedidosArmados(filtroFecha?: string, repartidorId?: number) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return [];

    const where: any = {
      tenantId: tenant.id,
      estado: { in: ["ARMADO", "LISTO_ENTREGA", "ENTREGADO", "NO_ENTREGADO"] },
    };
    if (repartidorId) {
      where.repartidorId = Number(repartidorId);
    }
    if (filtroFecha) {
      const start = new Date(`${filtroFecha}T00:00:00.000Z`);
      const end = new Date(`${filtroFecha}T23:59:59.999Z`);
      where.fecha_entrega = { gte: start, lte: end };
    }

    const pedidos = await prisma.pedido.findMany({
      where,
      include: {
        cliente: true,
        usuario: { select: { id: true, nombre: true, rol: true, username: true, telefono: true } },
        repartidor: { select: { id: true, nombre: true, rol: true, username: true, telefono: true } },
        detalles: {
          include: {
            producto: { select: { nombre_producto: true, codigo_articulo: true } },
          },
        },
      },
      orderBy: { fecha: "desc" },
    });

    return await adjuntarVentasAPedidos(pedidos);
  } catch (error) {
    console.error("Error al obtener pedidos armados:", error);
    return [];
  }
}

export async function obtenerPedidosParaReparto(repartidorId?: number) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return [];

    const where: any = {
      tenantId: tenant.id,
      estado: { in: ["ARMADO", "LISTO_ENTREGA", "NO_ENTREGADO", "ENTREGADO"] },
    };
    if (repartidorId) {
      where.OR = [{ repartidorId: Number(repartidorId) }, { repartidorId: null }];
    }

    const pedidos = await prisma.pedido.findMany({
      where,
      include: {
        cliente: true,
        usuario: { select: { id: true, nombre: true, rol: true, username: true, telefono: true } },
        repartidor: { select: { id: true, nombre: true, rol: true, username: true, telefono: true } },
        detalles: {
          include: {
            producto: { select: { nombre_producto: true, codigo_articulo: true } },
          },
        },
      },
      orderBy: { fecha: "desc" },
    });

    return await adjuntarVentasAPedidos(pedidos);
  } catch (error) {
    console.error("Error al obtener pedidos para reparto:", error);
    return [];
  }
}

export async function actualizarFechaEntregaPedido(
  pedidoId: number,
  fechaEntrega: string | Date | null | undefined
) {
  try {
    const tenant = await requireTenant();
    const fechaObj = parsearFechaEntrega(fechaEntrega);

    const actualizado = await prisma.pedido.update({
      where: { id: Number(pedidoId), tenantId: tenant.id },
      data: { fecha_entrega: fechaObj },
    });

    revalidatePath("/pedidos");
    revalidatePath("/pedidos/armados");
    revalidatePath("/vendedor");
    return { success: true, data: actualizado };
  } catch (error: any) {
    console.error("Error al actualizar fecha de entrega:", error);
    return { success: false, error: error.message || "Error al actualizar fecha de entrega." };
  }
}

export async function cancelarPedido(
  pedidoId: number,
  motivo?: string,
  depositoId?: number | null
) {
  return await cambiarEstadoPedidoAdmin(pedidoId, "CANCELADO", undefined, depositoId, motivo);
}