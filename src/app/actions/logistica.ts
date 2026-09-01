"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getClientSession } from "./auth";
import { requireTenant, getTenantContext } from "@/lib/tenant-context";

// ============================================================================
// 1. CONSULTAS DE HOJAS DE RUTA Y PEDIDOS DISPONIBLES
// ============================================================================

export async function obtenerHojasDeRuta(filtros?: {
  fecha_desde?: string;
  fecha_hasta?: string;
  repartidorId?: number;
  estado?: string;
}) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Tenant no encontrado" };

    const where: any = { tenantId: tenant.id };

    if (filtros?.estado && filtros.estado !== "TODOS") {
      where.estado = filtros.estado;
    }

    if (filtros?.repartidorId && Number(filtros.repartidorId) > 0) {
      where.repartidorId = Number(filtros.repartidorId);
    }

    if (filtros?.fecha_desde || filtros?.fecha_hasta) {
      where.fecha_despacho = {};
      if (filtros.fecha_desde) where.fecha_despacho.gte = new Date(`${filtros.fecha_desde}T00:00:00.000Z`);
      if (filtros.fecha_hasta) where.fecha_despacho.lte = new Date(`${filtros.fecha_hasta}T23:59:59.999Z`);
    }

    const rutas = await prisma.hojaDeRuta.findMany({
      where,
      include: {
        repartidor: { select: { id: true, nombre: true, username: true } },
        detalles: {
          include: {
            pedido: {
              include: {
                cliente: { select: { id: true, nombre_razon_social: true, direccion: true, telefono: true } },
                usuario: { select: { id: true, nombre: true, rol: true, username: true, telefono: true } },
                detalles: true,
              },
            },
          },
          orderBy: { orden_parada: "asc" },
        },
        rendiciones: {
          select: { id: true, total_rendido: true, total_esperado: true, diferencia: true, estado: true },
        },
      },
      orderBy: { fecha_despacho: "desc" },
      take: 100,
    });

    return { success: true, data: rutas };
  } catch (error: any) {
    console.error("Error al obtener hojas de ruta:", error);
    return { success: false, error: error.message || "Error al cargar hojas de ruta." };
  }
}

export async function obtenerHojaDeRutaDetalle(id: number) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Tenant no encontrado" };

    const ruta = await prisma.hojaDeRuta.findFirst({
      where: { id: Number(id), tenantId: tenant.id },
      include: {
        repartidor: { select: { id: true, nombre: true, username: true } },
        detalles: {
          include: {
            pedido: {
              include: {
                cliente: true,
                usuario: { select: { id: true, nombre: true, rol: true, username: true, telefono: true } },
                listaPrecio: true,
                detalles: {
                  include: {
                    producto: {
                      select: {
                        id: true,
                        nombre_producto: true,
                        codigo_articulo: true,
                        tipo_medicion: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { orden_parada: "asc" },
        },
        rendiciones: {
          include: {
            cobros_detalle: {
              include: {
                pedido: {
                  include: { cliente: { select: { nombre_razon_social: true } } },
                },
              },
            },
            cheques: true,
            caja: true,
          },
        },
      },
    });

    if (!ruta) return { success: false, error: "Hoja de ruta no encontrada." };
    return { success: true, data: ruta };
  } catch (error: any) {
    console.error("Error al obtener detalle de hoja de ruta:", error);
    return { success: false, error: error.message };
  }
}

export async function obtenerPedidosParaAsignarRuta(repartidorId?: number) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Tenant no encontrado" };

    const rutasActivas = await prisma.hojaDeRuta.findMany({
      where: { tenantId: tenant.id, estado: { in: ["BORRADOR", "EN_PREPARACION", "EN_RUTA"] } },
      select: { id: true },
    });

    const pedidosEnRuta = await prisma.detalleHojaDeRuta.findMany({
      where: { hojaDeRutaId: { in: rutasActivas.map((r) => r.id) } },
      select: { pedidoId: true },
    });

    const idsEnRuta = pedidosEnRuta.map((p) => p.pedidoId);

    const where: any = {
      tenantId: tenant.id,
      id: { notIn: idsEnRuta },
      estado: { in: ["APROBADO", "ARMADO", "LISTO_ENTREGA"] },
    };

    if (repartidorId && Number(repartidorId) > 0) {
      where.OR = [{ repartidorId: Number(repartidorId) }, { repartidorId: null }];
    }

    const pedidos = await prisma.pedido.findMany({
      where,
      include: {
        cliente: { select: { id: true, nombre_razon_social: true, direccion: true, telefono: true, dni_cuit: true } },
        usuario: { select: { id: true, nombre: true } },
        detalles: {
          include: {
            producto: { select: { id: true, nombre_producto: true, tipo_medicion: true } },
          },
        },
      },
      orderBy: { fecha: "asc" },
    });

    return { success: true, data: pedidos };
  } catch (error: any) {
    console.error("Error al obtener pedidos para ruta:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 2. CREACIÓN Y GESTIÓN DE HOJAS DE RUTA
// ============================================================================

export async function crearHojaDeRuta(data: {
  repartidorId: number;
  fecha_despacho: string;
  vehiculo?: string;
  zona?: string;
  km_inicial?: number;
  notas?: string;
  pedidosIds: number[];
}) {
  try {
    if (!data.pedidosIds || data.pedidosIds.length === 0) {
      throw new Error("Debe seleccionar al menos un pedido para armar la hoja de ruta.");
    }

    const tenant = await requireTenant();

    const resultado = await prisma.$transaction(async (tx) => {
      const secuencia = await tx.secuenciaHojaDeRuta.upsert({
        where: { tenantId: tenant.id },
        update: { numero_actual: { increment: 1 } },
        create: { tenantId: tenant.id, numero_actual: 1 },
      });
      const nuevoNumero = secuencia.numero_actual;

      const ruta = await tx.hojaDeRuta.create({
        data: {
          tenantId: tenant.id,
          numero: nuevoNumero,
          fecha_despacho: new Date(`${data.fecha_despacho}T12:00:00.000Z`),
          repartidorId: Number(data.repartidorId),
          vehiculo: data.vehiculo || null,
          zona: data.zona || null,
          km_inicial: data.km_inicial ? Number(data.km_inicial) : null,
          notas: data.notas || null,
          estado: "EN_PREPARACION",
          detalles: {
            create: data.pedidosIds.map((pedidoId, index) => ({
              pedidoId: Number(pedidoId),
              orden_parada: index + 1,
              estado_entrega: "PENDIENTE",
            })),
          },
        },
      });

      for (const pedidoId of data.pedidosIds) {
        await tx.pedido.update({
          where: { id: Number(pedidoId) },
          data: {
            repartidorId: Number(data.repartidorId),
            estado: "ARMADO",
            fecha_entrega: new Date(`${data.fecha_despacho}T12:00:00.000Z`),
          },
        });
      }

      return ruta;
    });

    revalidatePath("/logistica/hojas-de-ruta");
    revalidatePath("/pedidos");
    revalidatePath("/pedidos/armados");

    return { success: true, data: resultado };
  } catch (error: any) {
    console.error("Error al crear hoja de ruta:", error);
    return { success: false, error: error.message || "Error al crear la hoja de ruta." };
  }
}

export async function cambiarEstadoHojaDeRuta(
  id: number,
  nuevoEstado: "EN_PREPARACION" | "EN_RUTA" | "CANCELADA"
) {
  try {
    const tenant = await requireTenant();

    await prisma.$transaction(async (tx) => {
      const ruta = await tx.hojaDeRuta.findFirst({
        where: { id: Number(id), tenantId: tenant.id },
        include: { detalles: true },
      });

      if (!ruta) throw new Error("Hoja de ruta no encontrada.");
      if (ruta.estado === "RENDIDA") throw new Error("No se puede modificar una hoja de ruta ya rendida.");

      await tx.hojaDeRuta.update({
        where: { id: Number(id) },
        data: { estado: nuevoEstado },
      });

      if (nuevoEstado === "EN_RUTA") {
        for (const det of ruta.detalles) {
          await tx.pedido.update({
            where: { id: det.pedidoId },
            data: { estado: "LISTO_ENTREGA" },
          });
        }
      }

      if (nuevoEstado === "CANCELADA") {
        for (const det of ruta.detalles) {
          await tx.pedido.update({
            where: { id: det.pedidoId },
            data: { estado: "APROBADO" },
          });
        }
      }
    });

    revalidatePath("/logistica/hojas-de-ruta");
    revalidatePath("/pedidos");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 3. CONSOLIDADO DE CARGA PARA PICKING DEL DEPÓSITO
// ============================================================================

export async function obtenerConsolidadoCarga(hojaDeRutaId: number) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Tenant no encontrado" };

    const ruta = await prisma.hojaDeRuta.findFirst({
      where: { id: Number(hojaDeRutaId), tenantId: tenant.id },
      include: {
        repartidor: true,
        detalles: {
          include: {
            pedido: {
              include: {
                cliente: true,
                detalles: {
                  include: {
                    producto: {
                      include: {
                        marca: true,
                        categoria: true,
                        stocks: { include: { deposito: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!ruta) return { success: false, error: "Hoja de ruta no encontrada." };

    const consolidadoMap = new Map<
      number,
      {
        productoId: number;
        codigo_articulo: string;
        nombre_producto: string;
        marca: string;
        categoria: string;
        tipo_medicion: string;
        cantidad_total: number;
        pedidos_detalle: { pedidoNumero: number; cliente: string; cantidad: number }[];
      }
    >();

    for (const detalleRuta of ruta.detalles) {
      const pedido = detalleRuta.pedido;
      for (const item of pedido.detalles) {
        const prod = item.producto;
        if (!consolidadoMap.has(prod.id)) {
          consolidadoMap.set(prod.id, {
            productoId: prod.id,
            codigo_articulo: prod.codigo_articulo,
            nombre_producto: prod.nombre_producto,
            marca: prod.marca?.nombre || "Sin marca",
            categoria: prod.categoria?.nombre || "General",
            tipo_medicion: prod.tipo_medicion,
            cantidad_total: 0,
            pedidos_detalle: [],
          });
        }

        const entry = consolidadoMap.get(prod.id)!;
        entry.cantidad_total += item.cantidad;
        entry.pedidos_detalle.push({
          pedidoNumero: pedido.numero,
          cliente: pedido.cliente.nombre_razon_social,
          cantidad: item.cantidad,
        });
      }
    }

    const itemsConsolidados = Array.from(consolidadoMap.values()).sort((a, b) =>
      a.nombre_producto.localeCompare(b.nombre_producto)
    );

    const totalPedidos = ruta.detalles.length;
    const totalImporte = ruta.detalles.reduce((acc, d) => acc + d.pedido.total, 0);

    return {
      success: true,
      data: {
        ruta,
        itemsConsolidados,
        totalPedidos,
        totalImporte,
      },
    };
  } catch (error: any) {
    console.error("Error al generar consolidado de carga:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 4. RENDICIÓN DE REPARTO
// ============================================================================

export type RendicionItemPayload = {
  pedidoId: number;
  estado_entrega: "ENTREGADO" | "RECHAZADO_TOTAL" | "ENTREGA_PARCIAL";
  motivo_rechazo?: string;
  monto_cobrado_efectivo: number;
  monto_cobrado_transferencia: number;
  comprobante_transferencia?: string;
  monto_cuenta_corriente: number;
  cheques?: {
    numero_cheque: string;
    banco: string;
    cuit_librador?: string;
    nombre_librador?: string;
    monto: number;
    fecha_cobro: string;
    tipo: "FISICO" | "ECHEQ";
  }[];
};

export async function procesarRendicionChofer(data: {
  hojaDeRutaId: number;
  km_final?: number;
  observaciones?: string;
  cobros: RendicionItemPayload[];
}) {
  try {
    const tenant = await requireTenant();
    const session = await getClientSession();
    const usuarioId = (session as any)?.id ? Number((session as any).id) : null;
    const sucursalId = (session as any)?.sucursalId ? Number((session as any).sucursalId) : null;

    const resultado = await prisma.$transaction(
      async (tx) => {
        const ruta = await tx.hojaDeRuta.findFirst({
          where: { id: Number(data.hojaDeRutaId), tenantId: tenant.id },
          include: {
            repartidor: true,
            detalles: {
              include: {
                pedido: {
                  include: {
                    detalles: true,
                    cliente: true,
                  },
                },
              },
            },
          },
        });

        if (!ruta) throw new Error("Hoja de ruta no encontrada.");
        if (ruta.estado === "RENDIDA") throw new Error("Esta hoja de ruta ya fue rendida previamente.");

        const cajaAbierta = sucursalId
          ? await tx.cajaDiaria.findFirst({ where: { tenantId: tenant.id, estado: "ABIERTA", sucursalId } })
          : await tx.cajaDiaria.findFirst({ where: { tenantId: tenant.id, estado: "ABIERTA" } });

        if (!cajaAbierta) {
          throw new Error("Debe tener una Caja Diaria ABIERTA para procesar la rendición del reparto.");
        }

        let totalEfectivo = 0;
        let totalCheques = 0;
        let totalTransferencias = 0;
        let totalCredito = 0;
        let totalRechazos = 0;
        let totalEsperado = 0;

        const detalleCobrosCreate: any[] = [];
        const chequesCreate: any[] = [];

        for (const itemCobro of data.cobros) {
          const detRuta = ruta.detalles.find((d: any) => d.pedidoId === itemCobro.pedidoId);
          if (!detRuta) continue;

          const pedido = detRuta.pedido;
          totalEsperado += pedido.total;

          const totalCobradoPedido =
            (itemCobro.monto_cobrado_efectivo || 0) +
            (itemCobro.monto_cobrado_transferencia || 0) +
            (itemCobro.cheques?.reduce((acc, c) => acc + c.monto, 0) || 0) +
            (itemCobro.monto_cuenta_corriente || 0);

          await tx.detalleHojaDeRuta.update({
            where: { id: detRuta.id },
            data: {
              estado_entrega: itemCobro.estado_entrega,
              motivo_rechazo: itemCobro.motivo_rechazo || null,
              monto_cobrado: totalCobradoPedido,
            },
          });

          if (itemCobro.estado_entrega === "ENTREGADO") {
            await tx.pedido.update({
              where: { id: pedido.id },
              data: {
                estado: "ENTREGADO",
                fecha_entrega: new Date(),
              },
            });

            totalEfectivo += itemCobro.monto_cobrado_efectivo || 0;
            totalTransferencias += itemCobro.monto_cobrado_transferencia || 0;
            totalCredito += itemCobro.monto_cuenta_corriente || 0;

            if (itemCobro.monto_cobrado_efectivo > 0) {
              detalleCobrosCreate.push({
                pedidoId: pedido.id,
                metodo_pago: "CONTADO",
                monto: itemCobro.monto_cobrado_efectivo,
                comprobante: "Efectivo en mano",
              });
            }

            if (itemCobro.monto_cobrado_transferencia > 0) {
              detalleCobrosCreate.push({
                pedidoId: pedido.id,
                metodo_pago: "TRANSFERENCIA",
                monto: itemCobro.monto_cobrado_transferencia,
                comprobante: itemCobro.comprobante_transferencia || "Transferencia bancaria",
              });
            }

            if (itemCobro.cheques && itemCobro.cheques.length > 0) {
              for (const ch of itemCobro.cheques) {
                totalCheques += ch.monto;
                detalleCobrosCreate.push({
                  pedidoId: pedido.id,
                  metodo_pago: "CHEQUE",
                  monto: ch.monto,
                  comprobante: `${ch.banco} - N° ${ch.numero_cheque}`,
                });

                chequesCreate.push({
                  tenantId: tenant.id,
                  numero_cheque: ch.numero_cheque,
                  banco: ch.banco,
                  cuit_librador: ch.cuit_librador || null,
                  nombre_librador: ch.nombre_librador || pedido.cliente.nombre_razon_social,
                  monto: ch.monto,
                  fecha_emision: new Date(),
                  fecha_cobro: new Date(ch.fecha_cobro),
                  tipo: ch.tipo || "FISICO",
                  origen: "TERCERO_CLIENTE",
                  estado: "EN_CARTERA",
                  clienteId: pedido.clienteId,
                  notas: `Recibido en Reparto HR #${ruta.numero} (Pedido #${pedido.numero})`,
                });
              }
            }

            if (itemCobro.monto_cuenta_corriente > 0 && pedido.ventaId) {
              await tx.movimientoCuentaCorriente.create({
                data: {
                  tenantId: tenant.id,
                  clienteId: pedido.clienteId,
                  ventaId: pedido.ventaId,
                  tipo: "CARGO",
                  monto: itemCobro.monto_cuenta_corriente,
                  metodo_pago: "CUENTA_CORRIENTE",
                  notas: `Saldo pendiente de entrega en Reparto HR #${ruta.numero}`,
                  usuarioId,
                },
              });
            }
          }

          if (itemCobro.estado_entrega === "RECHAZADO_TOTAL") {
            totalRechazos += pedido.total;

            await tx.pedido.update({
              where: { id: pedido.id },
              data: {
                estado: "NO_ENTREGADO",
                motivo_no_entrega: itemCobro.motivo_rechazo || "Rechazado por cliente en reparto",
              },
            });

            const depoDestino = await tx.deposito.findFirst({
              where: { tenantId: tenant.id, estado: true },
              orderBy: { id: "asc" },
            });
            const depoId = depoDestino?.id || 1;

            for (const itemDet of pedido.detalles) {
              await tx.stockUbicacion.upsert({
                where: { productoId_depositoId: { productoId: itemDet.productoId, depositoId: depoId } },
                update: { cantidad: { increment: itemDet.cantidad } },
                create: { productoId: itemDet.productoId, depositoId: depoId, cantidad: itemDet.cantidad },
              });

              await tx.movimientoStock.create({
                data: {
                  tenantId: tenant.id,
                  productoId: itemDet.productoId,
                  depositoDestinoId: depoId,
                  cantidad: itemDet.cantidad,
                  tipo: "REINGRESO_RECHAZO_REPARTO",
                  motivo: `Reingreso por rechazo en Hoja de Ruta #${ruta.numero} (Pedido #${pedido.numero})`,
                  usuarioId,
                },
              });
            }
          }
        }

        const totalRendido = totalEfectivo + totalCheques + totalTransferencias + totalCredito;
        const diferencia = totalRendido - (totalEsperado - totalRechazos);

        const rendicion = await tx.rendicionReparto.create({
          data: {
            tenantId: tenant.id,
            hojaDeRutaId: ruta.id,
            cajaId: cajaAbierta.id,
            fecha: new Date(),
            total_efectivo: totalEfectivo,
            total_cheques: totalCheques,
            total_transferencias: totalTransferencias,
            total_credito: totalCredito,
            total_rechazos: totalRechazos,
            total_esperado: totalEsperado,
            total_rendido: totalRendido,
            diferencia,
            estado: Math.abs(diferencia) < 0.01 ? "CONCILIADA" : "CON_DIFERENCIA",
            observaciones: data.observaciones || null,
            cobros_detalle: {
              create: detalleCobrosCreate,
            },
            cheques: {
              create: chequesCreate,
            },
          },
        });

        if (totalEfectivo > 0) {
          await tx.movimientoCaja.create({
            data: {
              cajaId: cajaAbierta.id,
              tipo: "RENDICION_REPARTO",
              metodo_pago: "CONTADO",
              monto: totalEfectivo,
              descripcion: `Rendición de Reparto HR #${ruta.numero} (${ruta.repartidor.nombre}) - Efectivo`,
              usuarioId,
            },
          });
        }

        await tx.hojaDeRuta.update({
          where: { id: ruta.id },
          data: {
            estado: "RENDIDA",
            km_final: data.km_final ? Number(data.km_final) : null,
          },
        });

        return rendicion;
      },
      {
        maxWait: 15000,
        timeout: 45000,
      }
    );

    revalidatePath("/logistica/hojas-de-ruta");
    revalidatePath("/caja");
    revalidatePath("/pedidos");
    revalidatePath("/inventario");
    revalidatePath("/finanzas/cartera-valores");

    return { success: true, data: resultado };
  } catch (error: any) {
    console.error("Error al procesar rendición de chofer:", error);
    return { success: false, error: error.message || "Error al procesar la rendición." };
  }
}
