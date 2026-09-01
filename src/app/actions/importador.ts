"use server";

import prisma from "@/lib/prisma";
import * as xlsx from "xlsx";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/tenant-context";

export async function importarProductosExcel(formData: FormData) {
  try {
    const tenant = await requireTenant();

    const file = formData.get("file") as File;
    const depositoId = Number(formData.get("depositoId"));
    const listasIds: number[] = formData.get("listasIds") ? JSON.parse(formData.get("listasIds") as string) : [];
    const tipoPrecio = (formData.get("tipoPrecio") as string) || "COSTO_BASE";

    if (!file || !depositoId) {
      return { success: false, error: "Falta proporcionar el archivo o el depósito de destino." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2) {
      return { success: false, error: "El archivo parece estar vacío o no tiene registros." };
    }

    const generarCodigoInteligente = (nombre: string, categoria: string, proveedor: string) => {
      const text = `${nombre.trim().toUpperCase()}|${categoria.trim().toUpperCase()}|${proveedor.trim().toUpperCase()}`;
      let hash = 5381;
      for (let i = 0; i < text.length; i++) {
        hash = (hash * 33) ^ text.charCodeAt(i);
      }
      return "AUT-" + (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
    };

    let fallas = 0;
    let procesados = 0;
    let saltados = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      const isEmpty =
        !row ||
        row.length === 0 ||
        row.every((cell: any) => cell === null || cell === undefined || String(cell).trim() === "");
      if (isEmpty) {
        saltados++;
        continue;
      }

      const rawNombre = String(row[1] ?? "").trim();
      const rawStockStr = String(row[3] ?? "0").replace(",", ".");
      const rawStock = parseFloat(rawStockStr || "0");
      const rawMarcaName = String(row[4] ?? "GENÉRICO").trim().toUpperCase() || "GENÉRICO";
      const rawCategoriaName = String(row[5] ?? "SIN CATEGORÍA").trim().toUpperCase() || "SIN CATEGORÍA";
      const rawProveedorName = String(row[7] ?? "PROVEEDOR GENÉRICO").trim().toUpperCase() || "PROVEEDOR GENÉRICO";

      let rawCodigo = String(row[0] ?? "").trim();
      if (!rawCodigo && rawNombre) {
        rawCodigo = generarCodigoInteligente(rawNombre, rawCategoriaName, rawProveedorName);
      }

      const rawPrecioStr = String(row[2] ?? "0").replace(",", ".");
      const rawPrecio = parseFloat(rawPrecioStr || "0");
      let alicuotaIva = 21;

      if (tipoPrecio === "PRECIO_FINAL") {
        alicuotaIva = 0;
      }

      if (!rawCodigo || !rawNombre || isNaN(rawPrecio)) {
        fallas++;
        continue;
      }

      try {
        let proveedorObj = await prisma.proveedor.findUnique({
          where: { tenantId_nombre: { tenantId: tenant.id, nombre: rawProveedorName } },
        });
        if (!proveedorObj) {
          proveedorObj = await prisma.proveedor.create({
            data: { tenantId: tenant.id, nombre: rawProveedorName },
          });
        }

        let marcaObj = await prisma.marca.findUnique({
          where: {
            tenantId_nombre_proveedorId: {
              tenantId: tenant.id,
              nombre: rawMarcaName,
              proveedorId: proveedorObj.id,
            },
          },
        });
        if (!marcaObj) {
          marcaObj = await prisma.marca.create({
            data: {
              tenantId: tenant.id,
              nombre: rawMarcaName,
              proveedorId: proveedorObj.id,
            },
          });
        }

        let categoriaObj = await prisma.categoria.findFirst({
          where: { tenantId: tenant.id, nombre: rawCategoriaName, marcaId: marcaObj.id },
        });
        if (!categoriaObj) {
          categoriaObj = await prisma.categoria.create({
            data: {
              tenantId: tenant.id,
              nombre: rawCategoriaName,
              marcaId: marcaObj.id,
            },
          });
        }

        const producto = await prisma.producto.upsert({
          where: {
            tenantId_codigo_articulo: {
              tenantId: tenant.id,
              codigo_articulo: rawCodigo,
            },
          },
          update: {
            nombre_producto: rawNombre,
            precio_costo: rawPrecio,
            alicuota_iva: alicuotaIva,
            proveedorId: proveedorObj.id,
            marcaId: marcaObj.id,
            categoriaId: categoriaObj.id,
          },
          create: {
            tenantId: tenant.id,
            codigo_articulo: rawCodigo,
            codigo_barras: "0",
            nombre_producto: rawNombre,
            precio_costo: rawPrecio,
            alicuota_iva: alicuotaIva,
            tipo_medicion: "UNIDAD",
            moneda: "ARS",
            proveedorId: proveedorObj.id,
            marcaId: marcaObj.id,
            categoriaId: categoriaObj.id,
          },
        });

        const stockAnteriorObj = await prisma.stockUbicacion.findUnique({
          where: { productoId_depositoId: { productoId: producto.id, depositoId: depositoId } },
        });

        const stockAInsertar = isNaN(rawStock) ? 0 : rawStock;

        await prisma.stockUbicacion.upsert({
          where: {
            productoId_depositoId: { productoId: producto.id, depositoId: depositoId },
          },
          update: { cantidad: stockAInsertar },
          create: {
            productoId: producto.id,
            depositoId: depositoId,
            cantidad: stockAInsertar,
          },
        });

        if (!stockAnteriorObj || stockAnteriorObj.cantidad !== stockAInsertar) {
          await prisma.movimientoStock.create({
            data: {
              tenantId: tenant.id,
              productoId: producto.id,
              depositoOrigenId: depositoId,
              tipo: "AJUSTE",
              cantidad: stockAInsertar - (stockAnteriorObj?.cantidad || 0),
              motivo: "Importación Masiva Excel",
            },
          });
        }

        for (const listaId of listasIds) {
          await prisma.productoListaPrecio.upsert({
            where: {
              productoId_listaPrecioId: { productoId: producto.id, listaPrecioId: listaId },
            },
            update: {},
            create: {
              productoId: producto.id,
              listaPrecioId: listaId,
            },
          });
        }

        procesados++;
      } catch (filaError) {
        console.error(`Error procesando fila ${i}:`, filaError);
        fallas++;
      }
    }

    revalidatePath("/inventario");
    return {
      success: true,
      mensaje: `Importación finalizada: ${procesados} procesados correctamente, ${fallas} filas fallidas, ${saltados} filas vacías ignoradas.`,
    };
  } catch (e: any) {
    console.error("Error grosero importando productos:", e);
    return { success: false, error: e.message || "Fallo catastrófico procesando el archivo de productos." };
  }
}

export async function importarClientesExcel(formData: FormData) {
  try {
    const tenant = await requireTenant();

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "Falta proporcionar el archivo." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2) {
      return { success: false, error: "El archivo parece estar vacío o no tiene registros." };
    }

    let fallas = 0;
    let procesados = 0;
    let saltados = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      const isEmpty =
        !row ||
        row.length === 0 ||
        row.every((cell: any) => cell === null || cell === undefined || String(cell).trim() === "");
      if (isEmpty) {
        saltados++;
        continue;
      }

      const rawNombre = String(row[0] ?? "").trim();
      const rawTipo = String(row[1] ?? "").trim().toLowerCase();
      const rawCUIT = String(row[2] ?? "").trim();
      const rawDNI = String(row[3] ?? "").trim();
      const rawDireccion = String(row[4] ?? "").trim();
      const rawTelefono = String(row[7] ?? "").trim();

      let condicionIvaParseada = "Consumidor Final";
      if (rawTipo.includes("inscripto")) {
        condicionIvaParseada = "Responsable Inscripto";
      } else if (rawTipo.includes("exento")) {
        condicionIvaParseada = "Exento";
      } else if (rawTipo.includes("monotributo")) {
        condicionIvaParseada = "Monotributo";
      } else if (rawTipo.includes("final") || rawTipo === "cf") {
        condicionIvaParseada = "Consumidor Final";
      }

      if (!rawNombre) {
        fallas++;
        continue;
      }

      let documentoFinal = rawCUIT !== "" ? rawCUIT : rawDNI;
      if (documentoFinal === "") {
        documentoFinal = null as any;
      }

      try {
        let clienteObj = null;

        if (documentoFinal) {
          clienteObj = await prisma.cliente.findUnique({
            where: {
              tenantId_dni_cuit: {
                tenantId: tenant.id,
                dni_cuit: documentoFinal,
              },
            },
          });
        }

        if (clienteObj) {
          await prisma.cliente.update({
            where: { id: clienteObj.id },
            data: {
              nombre_razon_social: rawNombre,
              direccion: rawDireccion,
              telefono: rawTelefono,
              condicion_iva: condicionIvaParseada,
            },
          });
        } else {
          await prisma.cliente.create({
            data: {
              tenantId: tenant.id,
              nombre_razon_social: rawNombre,
              dni_cuit: documentoFinal || null,
              direccion: rawDireccion,
              telefono: rawTelefono,
              condicion_iva: condicionIvaParseada,
            },
          });
        }

        procesados++;
      } catch (filaError) {
        console.error(`Error procesando fila de cliente ${i}:`, filaError);
        fallas++;
      }
    }

    revalidatePath("/clientes");
    return {
      success: true,
      mensaje: `Importación finalizada: ${procesados} procesados correctamente, ${fallas} filas fallidas, ${saltados} filas vacías ignoradas.`,
    };
  } catch (e: any) {
    console.error("Error grosero importando clientes:", e);
    return { success: false, error: e.message || "Fallo catastrófico procesando el archivo de clientes." };
  }
}
