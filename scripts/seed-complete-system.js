const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || "mysql://sanuuser:password_seguro@db:3306/tomassidb"
        }
    }
});

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
    return `${salt}:${hash}`;
}

async function main() {
    console.log("🚀 Iniciando siembra masiva de datos mayoristas...");

    // 1. EMPRESA Y CONFIGURACIÓN GENERAL
    await prisma.empresaConfig.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            razon_social: "Sanu Distribuidora Mayorista S.A.",
            nombre_fantasia: "Sanu Distribuidora",
            cuit: "30-71829304-8",
            inicio_actividad: "01/01/2020",
            condicion_iva: "Responsable Inscripto",
            punto_venta: 1,
            modo_produccion_afip: false,
            direccion: "Av. Mitre 1250, San Pedro, Buenos Aires",
            telefono: "03329-425566",
            redes_sociales: "@sanu.distribuidora",
            comision_base_global: 5.0,
            penalizacion_global: 2.0,
            limite_desc_global: 15.0,
            redondear_a_cinco: true
        }
    });

    // 2. SUCURSAL Y DEPÓSITOS
    const sucursal = await prisma.sucursal.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            nombre: "Casa Central San Pedro",
            direccion: "Av. Mitre 1250",
            telefono: "03329-425566",
            estado: true
        }
    });

    const depoCentral = await prisma.deposito.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            nombre: "Depósito Central (Nave 1)",
            sucursalId: sucursal.id,
            estado: true
        }
    });

    const depoSecundario = await prisma.deposito.upsert({
        where: { id: 2 },
        update: {},
        create: {
            id: 2,
            nombre: "Depósito Pulmón / Tránsito",
            sucursalId: sucursal.id,
            estado: true
        }
    });

    // 3. LISTAS DE PRECIOS
    const listaGeneral = await prisma.listaPrecio.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            nombre: "Lista Mostrador / Minorista",
            margen_defecto: 35.0,
            es_default: true
        }
    });

    const listaMayorista = await prisma.listaPrecio.upsert({
        where: { id: 2 },
        update: {},
        create: {
            id: 2,
            nombre: "Lista Mayorista Comercio (-15%)",
            margen_defecto: 20.0,
            es_default: false
        }
    });

    const listaDistribuidor = await prisma.listaPrecio.upsert({
        where: { id: 3 },
        update: {},
        create: {
            id: 3,
            nombre: "Lista Gran Distribuidor (-25%)",
            margen_defecto: 12.0,
            es_default: false
        }
    });

    // 4. USUARIOS (ADMIN, VENDEDORES, REPARTIDORES, CAJEROS)
    const passDefault = hashPassword("123456");
    const passAdmin = hashPassword("admin");

    const admin = await prisma.usuario.upsert({
        where: { username: "admin" },
        update: { password: passAdmin, activo: true },
        create: {
            nombre: "Administrador General",
            username: "admin",
            password: passAdmin,
            rol: "ADMIN",
            permisos: JSON.stringify(["VENTAS", "CAJA", "CLIENTES", "INVENTARIO", "HISTORIAL", "PRESUPUESTOS", "REPORTES", "CONFIGURACION"]),
            activo: true,
            sucursalId: sucursal.id
        }
    });

    const vendedor1 = await prisma.usuario.upsert({
        where: { username: "carlos.lopez" },
        update: { password: passDefault },
        create: {
            nombre: "Carlos López (Preventista Norte)",
            username: "carlos.lopez",
            password: passDefault,
            rol: "VENDEDOR",
            permisos: JSON.stringify(["VENTAS", "CLIENTES", "PRESUPUESTOS"]),
            activo: true,
            sucursalId: sucursal.id,
            comision_personalizada: 5.5,
            limite_desc_vendedor: 12.0
        }
    });

    const vendedor2 = await prisma.usuario.upsert({
        where: { username: "martin.perez" },
        update: { password: passDefault },
        create: {
            nombre: "Martín Pérez (Preventista Sur)",
            username: "martin.perez",
            password: passDefault,
            rol: "VENDEDOR",
            permisos: JSON.stringify(["VENTAS", "CLIENTES", "PRESUPUESTOS"]),
            activo: true,
            sucursalId: sucursal.id,
            comision_personalizada: 6.0,
            limite_desc_vendedor: 10.0
        }
    });

    const chofer1 = await prisma.usuario.upsert({
        where: { username: "roberto.chofer" },
        update: { password: passDefault },
        create: {
            nombre: "Roberto Fernández (Chofer Camión 1)",
            username: "roberto.chofer",
            password: passDefault,
            rol: "VENDEDOR",
            permisos: JSON.stringify(["VENTAS"]),
            activo: true,
            sucursalId: sucursal.id
        }
    });

    const chofer2 = await prisma.usuario.upsert({
        where: { username: "diego.reparto" },
        update: { password: passDefault },
        create: {
            nombre: "Diego Morales (Chofer Sprinter)",
            username: "diego.reparto",
            password: passDefault,
            rol: "VENDEDOR",
            permisos: JSON.stringify(["VENTAS"]),
            activo: true,
            sucursalId: sucursal.id
        }
    });

    const cajero1 = await prisma.usuario.upsert({
        where: { username: "juan.cajero" },
        update: { password: passDefault },
        create: {
            nombre: "Juan Gómez (Cajero Turno Mañana)",
            username: "juan.cajero",
            password: passDefault,
            rol: "CAJERO",
            permisos: JSON.stringify(["VENTAS", "CAJA", "CLIENTES", "HISTORIAL"]),
            activo: true,
            sucursalId: sucursal.id
        }
    });

    // 5. PROVEEDORES, MARCAS Y CATEGORÍAS
    const provSinteplast = await prisma.proveedor.upsert({
        where: { nombre: "Sinteplast S.A." },
        update: {},
        create: {
            nombre: "Sinteplast S.A.",
            cuit: "30-50123456-9",
            telefono: "011-4712-9900",
            email: "pedidos@sinteplast.com.ar",
            direccion: "Av. Corrientes 4500, CABA",
            activo: true,
            aumento_porcentaje: 0
        }
    });

    const provAlba = await prisma.proveedor.upsert({
        where: { nombre: "Alba Pinturas (AkzoNobel)" },
        update: {},
        create: {
            nombre: "Alba Pinturas (AkzoNobel)",
            cuit: "30-50987654-3",
            telefono: "011-4899-1122",
            email: "ventas@alba.com.ar",
            direccion: "Ruta 9 Km 38, Garín",
            activo: true,
            aumento_porcentaje: 0
        }
    });

    const provPlavicon = await prisma.proveedor.upsert({
        where: { nombre: "Plavicon Impermeabilizantes" },
        update: {},
        create: {
            nombre: "Plavicon Impermeabilizantes",
            cuit: "30-52345678-1",
            telefono: "011-4322-8877",
            email: "distribuidores@plavicon.com",
            direccion: "Panamericana Km 28, Don Torcuato",
            activo: true,
            aumento_porcentaje: 0
        }
    });

    const provFerreteria = await prisma.proveedor.upsert({
        where: { nombre: "Distribuidora Ferretera del Litoral" },
        update: {},
        create: {
            nombre: "Distribuidora Ferretera del Litoral",
            cuit: "30-61234567-8",
            telefono: "0341-4567890",
            email: "contacto@ferreteralitoral.com",
            direccion: "Av. Circunvalación 1200, Rosario",
            activo: true,
            aumento_porcentaje: 0
        }
    });

    // Marcas
    const marcaSinteplast = await prisma.marca.upsert({
        where: { nombre_proveedorId: { nombre: "Sinteplast", proveedorId: provSinteplast.id } },
        update: {},
        create: { nombre: "Sinteplast", proveedorId: provSinteplast.id }
    });

    const marcaAlba = await prisma.marca.upsert({
        where: { nombre_proveedorId: { nombre: "Alba", proveedorId: provAlba.id } },
        update: {},
        create: { nombre: "Alba", proveedorId: provAlba.id }
    });

    const marcaPlavicon = await prisma.marca.upsert({
        where: { nombre_proveedorId: { nombre: "Plavicon", proveedorId: provPlavicon.id } },
        update: {},
        create: { nombre: "Plavicon", proveedorId: provPlavicon.id }
    });

    const marcaNorton = await prisma.marca.upsert({
        where: { nombre_proveedorId: { nombre: "Norton Abrasivos", proveedorId: provFerreteria.id } },
        update: {},
        create: { nombre: "Norton Abrasivos", proveedorId: provFerreteria.id }
    });

    // Categorías
    const catLatex = await prisma.categoria.create({
        data: { nombre: "Látex Interior / Exterior", marcaId: marcaSinteplast.id }
    });
    const catSinteticos = await prisma.categoria.create({
        data: { nombre: "Esmaltes Sintéticos y Barnices", marcaId: marcaAlba.id }
    });
    const catImper = await prisma.categoria.create({
        data: { nombre: "Impermeabilizantes y Fibrados", marcaId: marcaPlavicon.id }
    });
    const catHerramientas = await prisma.categoria.create({
        data: { nombre: "Pincelería, Rodillos y Herramientas", marcaId: marcaNorton.id }
    });
    const catSolventes = await prisma.categoria.create({
        data: { nombre: "Diluyentes y Solventes", marcaId: marcaSinteplast.id }
    });

    // 6. PRODUCTOS MAESTROS CON STOCK, ESCALAS Y WMS
    const productosData = [
        {
            codigo_articulo: "LAT-INT-20",
            codigo_barras: "7791234000011",
            nombre_producto: "Látex Interior Profesional Blanco 20 Litros",
            proveedorId: provSinteplast.id,
            marcaId: marcaSinteplast.id,
            categoriaId: catLatex.id,
            precio_costo: 35000.0,
            alicuota_iva: 21.0,
            stock_minimo: 10,
            punto_pedido: 15,
            tiempo_reposicion_dias: 5,
            stockCantidad: 48,
            escalas: [
                { cantidad_minima: 6, precio_unitario: 44000.0 },
                { cantidad_minima: 12, precio_unitario: 41000.0 }
            ]
        },
        {
            codigo_articulo: "LAT-EXT-20",
            codigo_barras: "7791234000028",
            nombre_producto: "Látex Exterior Frente y Muros Blanco 20 Litros",
            proveedorId: provSinteplast.id,
            marcaId: marcaSinteplast.id,
            categoriaId: catLatex.id,
            precio_costo: 42000.0,
            alicuota_iva: 21.0,
            stock_minimo: 8,
            punto_pedido: 12,
            tiempo_reposicion_dias: 5,
            stockCantidad: 32,
            escalas: [
                { cantidad_minima: 6, precio_unitario: 53000.0 },
                { cantidad_minima: 12, precio_unitario: 49500.0 }
            ]
        },
        {
            codigo_articulo: "ESM-SAT-04",
            codigo_barras: "7791234000035",
            nombre_producto: "Esmalte Sintético Satinado Albalux Blanco 4 Litros",
            proveedorId: provAlba.id,
            marcaId: marcaAlba.id,
            categoriaId: catSinteticos.id,
            precio_costo: 18500.0,
            alicuota_iva: 21.0,
            stock_minimo: 12,
            punto_pedido: 20,
            tiempo_reposicion_dias: 7,
            stockCantidad: 65,
            escalas: [
                { cantidad_minima: 6, descuento_porcentaje: 8.0 },
                { cantidad_minima: 12, descuento_porcentaje: 15.0 }
            ]
        },
        {
            codigo_articulo: "IMP-FIB-20",
            codigo_barras: "7791234000042",
            nombre_producto: "Membrana Líquida Fibrada Plavicon Tech Fibrado 20 Kg",
            proveedorId: provPlavicon.id,
            marcaId: marcaPlavicon.id,
            categoriaId: catImper.id,
            precio_costo: 38000.0,
            alicuota_iva: 21.0,
            stock_minimo: 6,
            punto_pedido: 10,
            tiempo_reposicion_dias: 4,
            stockCantidad: 24,
            escalas: [
                { cantidad_minima: 5, precio_unitario: 47500.0 },
                { cantidad_minima: 10, precio_unitario: 44000.0 }
            ]
        },
        {
            codigo_articulo: "ROD-LAN-22",
            codigo_barras: "7791234000059",
            nombre_producto: "Rodillo Profesional Lana Pelo Largo 22 cm",
            proveedorId: provFerreteria.id,
            marcaId: marcaNorton.id,
            categoriaId: catHerramientas.id,
            precio_costo: 4500.0,
            alicuota_iva: 21.0,
            stock_minimo: 20,
            punto_pedido: 40,
            tiempo_reposicion_dias: 3,
            stockCantidad: 140,
            escalas: [
                { cantidad_minima: 12, precio_unitario: 5600.0 },
                { cantidad_minima: 36, precio_unitario: 5100.0 }
            ]
        },
        {
            codigo_articulo: "PIN-N20-CP",
            codigo_barras: "7791234000066",
            nombre_producto: "Pincel Virola 1 N° 20 Cerda Rubia Pura",
            proveedorId: provFerreteria.id,
            marcaId: marcaNorton.id,
            categoriaId: catHerramientas.id,
            precio_costo: 2100.0,
            alicuota_iva: 21.0,
            stock_minimo: 30,
            punto_pedido: 50,
            tiempo_reposicion_dias: 3,
            stockCantidad: 95,
            escalas: [
                { cantidad_minima: 12, descuento_porcentaje: 10.0 },
                { cantidad_minima: 24, descuento_porcentaje: 18.0 }
            ]
        },
        {
            codigo_articulo: "AGU-MIN-05",
            codigo_barras: "7791234000073",
            nombre_producto: "Aguarrás Mineral Puro Desodorizado 5 Litros",
            proveedorId: provSinteplast.id,
            marcaId: marcaSinteplast.id,
            categoriaId: catSolventes.id,
            precio_costo: 8500.0,
            alicuota_iva: 21.0,
            stock_minimo: 15,
            punto_pedido: 25,
            tiempo_reposicion_dias: 5,
            stockCantidad: 55,
            escalas: [
                { cantidad_minima: 8, precio_unitario: 10500.0 }
            ]
        },
        {
            codigo_articulo: "FIJ-CON-04",
            codigo_barras: "7791234000080",
            nombre_producto: "Fijador Sellador al Agua Concentrado 1 a 3 - 4 Litros",
            proveedorId: provSinteplast.id,
            marcaId: marcaSinteplast.id,
            categoriaId: catLatex.id,
            precio_costo: 11000.0,
            alicuota_iva: 21.0,
            stock_minimo: 10,
            punto_pedido: 18,
            tiempo_reposicion_dias: 5,
            stockCantidad: 42,
            escalas: [
                { cantidad_minima: 6, precio_unitario: 13500.0 }
            ]
        },
        {
            codigo_articulo: "END-INT-20",
            codigo_barras: "7791234000097",
            nombre_producto: "Enduido Plástico Interior al Agua 20 Kg",
            proveedorId: provAlba.id,
            marcaId: marcaAlba.id,
            categoriaId: catLatex.id,
            precio_costo: 22000.0,
            alicuota_iva: 21.0,
            stock_minimo: 8,
            punto_pedido: 15,
            tiempo_reposicion_dias: 6,
            stockCantidad: 38,
            escalas: [
                { cantidad_minima: 5, precio_unitario: 27500.0 }
            ]
        },
        {
            codigo_articulo: "BAR-MAR-04",
            codigo_barras: "7791234000103",
            nombre_producto: "Barniz Marino Filtro Solar Brillante 4 Litros",
            proveedorId: provAlba.id,
            marcaId: marcaAlba.id,
            categoriaId: catSinteticos.id,
            precio_costo: 19500.0,
            alicuota_iva: 21.0,
            stock_minimo: 5,
            punto_pedido: 10,
            tiempo_reposicion_dias: 6,
            stockCantidad: 20,
            escalas: []
        }
    ];

    const productosCreados = [];

    for (const p of productosData) {
        const prod = await prisma.producto.upsert({
            where: { codigo_articulo: p.codigo_articulo },
            update: {
                precio_costo: p.precio_costo,
                stock_minimo: p.stock_minimo,
                punto_pedido: p.punto_pedido,
                tiempo_reposicion_dias: p.tiempo_reposicion_dias
            },
            create: {
                codigo_articulo: p.codigo_articulo,
                codigo_barras: p.codigo_barras,
                nombre_producto: p.nombre_producto,
                proveedorId: p.proveedorId,
                marcaId: p.marcaId,
                categoriaId: p.categoriaId,
                precio_costo: p.precio_costo,
                alicuota_iva: p.alicuota_iva,
                stock_minimo: p.stock_minimo,
                punto_pedido: p.punto_pedido,
                tiempo_reposicion_dias: p.tiempo_reposicion_dias
            }
        });

        // Stock físico
        await prisma.stockUbicacion.upsert({
            where: { productoId_depositoId: { productoId: prod.id, depositoId: depoCentral.id } },
            update: { cantidad: p.stockCantidad },
            create: { productoId: prod.id, depositoId: depoCentral.id, cantidad: p.stockCantidad }
        });

        // Escalas de volumen
        for (const esc of p.escalas) {
            await prisma.productoEscalaPrecio.upsert({
                where: { productoId_listaPrecioId_cantidad_minima: { productoId: prod.id, listaPrecioId: null, cantidad_minima: esc.cantidad_minima } },
                update: {},
                create: {
                    productoId: prod.id,
                    cantidad_minima: esc.cantidad_minima,
                    precio_unitario: esc.precio_unitario || null,
                    descuento_porcentaje: esc.descuento_porcentaje || null
                }
            });
        }

        // Lote de ejemplo
        await prisma.loteStock.upsert({
            where: { productoId_depositoId_numero_lote: { productoId: prod.id, depositoId: depoCentral.id, numero_lote: `LOT-2026-${prod.id}` } },
            update: {},
            create: {
                productoId: prod.id,
                depositoId: depoCentral.id,
                numero_lote: `LOT-2026-${prod.id}`,
                fecha_vencimiento: new Date("2028-06-30T00:00:00.000Z"),
                cantidad: p.stockCantidad
            }
        });

        productosCreados.push(prod);
    }

    // 7. CLIENTES CON CUENTAS CORRIENTES Y LÍMITES
    const clientesData = [
        {
            nombre_razon_social: "Pinturería del Centro S.R.L.",
            dni_cuit: "30-71112233-4",
            condicion_iva: "Responsable Inscripto",
            direccion: "Pellegrini 450, San Pedro",
            telefono: "03329-421122",
            email: "compras@pintureriadelcentro.com",
            limite_credito: 800000.0,
            saldo_cc: 150000.0,
            listaPrecioId: listaMayorista.id
        },
        {
            nombre_razon_social: "Ferretería Industrial El Progreso",
            dni_cuit: "30-72223344-5",
            condicion_iva: "Responsable Inscripto",
            direccion: "Av. 3 de Febrero 820, Baradero",
            telefono: "03329-482233",
            email: "progreso@ferreteria.com",
            limite_credito: 500000.0,
            saldo_cc: 85000.0,
            listaPrecioId: listaMayorista.id
        },
        {
            nombre_razon_social: "Constructora San Pedro S.R.L.",
            dni_cuit: "30-73334455-6",
            condicion_iva: "Responsable Inscripto",
            direccion: "Ruta 191 Km 4.5, San Pedro",
            telefono: "03329-429988",
            email: "obras@constructorasanpedro.com",
            limite_credito: 1500000.0,
            saldo_cc: 320000.0,
            listaPrecioId: listaDistribuidor.id
        },
        {
            nombre_razon_social: "Corralón & Materiales La Ribera",
            dni_cuit: "30-74445566-7",
            condicion_iva: "Responsable Inscripto",
            direccion: "Costanera Sur 110, Ramallo",
            telefono: "03407-422110",
            email: "ventas@laribera.com",
            limite_credito: 1000000.0,
            saldo_cc: 0.0,
            listaPrecioId: listaMayorista.id
        },
        {
            nombre_razon_social: "Juan Manuel Benítez (Pintor Profesional)",
            dni_cuit: "20-32456789-2",
            condicion_iva: "Consumidor Final",
            direccion: "Gomendio 340, San Pedro",
            telefono: "03329-15554433",
            email: "juanma_pinturas@gmail.com",
            limite_credito: 150000.0,
            saldo_cc: 25000.0,
            listaPrecioId: listaGeneral.id
        }
    ];

    const clientesCreados = [];
    for (const c of clientesData) {
        let cli = await prisma.cliente.findFirst({ where: { dni_cuit: c.dni_cuit } });
        if (!cli) {
            cli = await prisma.cliente.create({ data: c });
        } else {
            cli = await prisma.cliente.update({ where: { id: cli.id }, data: c });
        }
        clientesCreados.push(cli);
    }

    // 8. CAJA DIARIA ABIERTA CON MOVIMIENTOS
    let cajaAbierta = await prisma.cajaDiaria.findFirst({ where: { estado: 'ABIERTA' } });
    if (!cajaAbierta) {
        cajaAbierta = await prisma.cajaDiaria.create({
            data: {
                fecha_apertura: new Date(),
                saldo_inicial: 50000.0,
                estado: 'ABIERTA',
                sucursalId: sucursal.id,
                movimientos: {
                    create: [
                        {
                            tipo: 'APERTURA',
                            metodo_pago: 'CONTADO',
                            monto: 50000.0,
                            descripcion: 'Fondo de inicio de turno mañana',
                            usuarioId: cajero1.id
                        },
                        {
                            tipo: 'INGRESO_MANUAL',
                            metodo_pago: 'CONTADO',
                            monto: 15000.0,
                            descripcion: 'Ingreso cambio chico (billetes $500 y $1000)',
                            usuarioId: cajero1.id
                        }
                    ]
                }
            }
        });
    }

    // 9. CARTERA DE VALORES (CHEQUES DE CLIENTES Y DIFERIDOS)
    const hoy = new Date();
    const en3Dias = new Date(); en3Dias.setDate(hoy.getDate() + 3);
    const en15Dias = new Date(); en15Dias.setDate(hoy.getDate() + 15);
    const en30Dias = new Date(); en30Dias.setDate(hoy.getDate() + 30);

    const chequesData = [
        {
            numero_cheque: "45812903",
            banco: "Banco Galicia",
            monto: 150000.0,
            fecha_emision: hoy,
            fecha_cobro: en3Dias,
            tipo: "FISICO",
            origen: "TERCERO_CLIENTE",
            estado: "EN_CARTERA",
            clienteId: clientesCreados[0].id,
            nombre_librador: clientesCreados[0].nombre_razon_social,
            cuit_librador: clientesCreados[0].dni_cuit,
            notas: "Pago parcial factura CC #1029"
        },
        {
            numero_cheque: "88120491",
            banco: "Banco Santander",
            monto: 320000.0,
            fecha_emision: hoy,
            fecha_cobro: en15Dias,
            tipo: "ECHEQ",
            origen: "TERCERO_CLIENTE",
            estado: "EN_CARTERA",
            clienteId: clientesCreados[2].id,
            nombre_librador: clientesCreados[2].nombre_razon_social,
            cuit_librador: clientesCreados[2].dni_cuit,
            notas: "eCheq diferido Obra Hospital"
        },
        {
            numero_cheque: "12049281",
            banco: "Banco Nación",
            monto: 85000.0,
            fecha_emision: hoy,
            fecha_cobro: en30Dias,
            tipo: "FISICO",
            origen: "TERCERO_CLIENTE",
            estado: "EN_CARTERA",
            clienteId: clientesCreados[1].id,
            nombre_librador: clientesCreados[1].nombre_razon_social,
            cuit_librador: clientesCreados[1].dni_cuit,
            notas: "Cheque a 30 días"
        },
        {
            numero_cheque: "99120482",
            banco: "Banco Macro",
            monto: 210000.0,
            fecha_emision: hoy,
            fecha_cobro: en15Dias,
            tipo: "ECHEQ",
            origen: "TERCERO_CLIENTE",
            estado: "ENDOSADO_PROVEEDOR",
            proveedorId: provSinteplast.id,
            clienteId: clientesCreados[0].id,
            nombre_librador: clientesCreados[0].nombre_razon_social,
            notas: "Endosado a Sinteplast en pago de Orden Compra #881"
        }
    ];

    for (const ch of chequesData) {
        await prisma.cheque.create({
            data: {
                ...ch,
                movimientos_hist: {
                    create: {
                        estado_origen: ch.estado,
                        estado_destino: ch.estado,
                        motivo: "Ingreso inicial de prueba en cartera"
                    }
                }
            }
        });
    }

    // 10. PEDIDOS PARA REPARTO
    const pedido1 = await prisma.pedido.upsert({
        where: { numero: 101 },
        update: {},
        create: {
            numero: 101,
            clienteId: clientesCreados[0].id,
            usuarioId: vendedor1.id,
            repartidorId: chofer1.id,
            listaPrecioId: listaMayorista.id,
            estado: "ARMADO",
            subtotal: 180000.0,
            descuento_global: 0,
            total: 180000.0,
            metodo_pago: "CONTADO",
            notas: "Entregar por la mañana antes de las 12hs",
            detalles: {
                create: [
                    {
                        productoId: productosCreados[0].id,
                        cantidad: 3,
                        precio_unitario: 44000.0,
                        precio_final: 44000.0,
                        subtotal: 132000.0
                    },
                    {
                        productoId: productosCreados[4].id,
                        cantidad: 8,
                        precio_unitario: 6000.0,
                        precio_final: 6000.0,
                        subtotal: 48000.0
                    }
                ]
            }
        }
    });

    const pedido2 = await prisma.pedido.upsert({
        where: { numero: 102 },
        update: {},
        create: {
            numero: 102,
            clienteId: clientesCreados[1].id,
            usuarioId: vendedor1.id,
            repartidorId: chofer1.id,
            listaPrecioId: listaMayorista.id,
            estado: "ARMADO",
            subtotal: 95000.0,
            descuento_global: 0,
            total: 95000.0,
            metodo_pago: "CUENTA_CORRIENTE",
            notas: "Cobrar flete bonificado",
            detalles: {
                create: [
                    {
                        productoId: productosCreados[2].id,
                        cantidad: 4,
                        precio_unitario: 23750.0,
                        precio_final: 23750.0,
                        subtotal: 95000.0
                    }
                ]
            }
        }
    });

    const pedido3 = await prisma.pedido.upsert({
        where: { numero: 103 },
        update: {},
        create: {
            numero: 103,
            clienteId: clientesCreados[2].id,
            usuarioId: vendedor2.id,
            repartidorId: chofer2.id,
            listaPrecioId: listaDistribuidor.id,
            estado: "LISTO_ENTREGA",
            subtotal: 340000.0,
            descuento_global: 0,
            total: 340000.0,
            metodo_pago: "TRANSFERENCIA",
            notas: "Descargar en obrador central",
            detalles: {
                create: [
                    {
                        productoId: productosCreados[3].id,
                        cantidad: 6,
                        precio_unitario: 45000.0,
                        precio_final: 45000.0,
                        subtotal: 270000.0
                    },
                    {
                        productoId: productosCreados[6].id,
                        cantidad: 7,
                        precio_unitario: 10000.0,
                        precio_final: 10000.0,
                        subtotal: 70000.0
                    }
                ]
            }
        }
    });

    // 11. HOJA DE RUTA CON PEDIDOS ASIGNADOS
    const ruta1 = await prisma.hojaDeRuta.upsert({
        where: { numero: 1 },
        update: {},
        create: {
            numero: 1,
            fecha_despacho: new Date(),
            repartidorId: chofer1.id,
            vehiculo: "Camión Ford 4000 (AA-123-BB)",
            zona: "Ruta 9 Norte / San Pedro - Baradero",
            estado: "EN_RUTA",
            km_inicial: 124500,
            notas: "Salida 08:30 hs. Regreso estimado 14:00 hs.",
            detalles: {
                create: [
                    {
                        pedidoId: pedido1.id,
                        orden_parada: 1,
                        estado_entrega: "PENDIENTE"
                    },
                    {
                        pedidoId: pedido2.id,
                        orden_parada: 2,
                        estado_entrega: "PENDIENTE"
                    }
                ]
            }
        }
    });

    // 12. VENTAS FACTURADAS
    const secuenciaFactura = await prisma.secuenciaFactura.upsert({
        where: { tipo_comprobante: "FACTURA_A" },
        update: { numero_actual: { increment: 1 } },
        create: { tipo_comprobante: "FACTURA_A", punto_venta: 1, numero_actual: 1 }
    });

    await prisma.venta.create({
        data: {
            tipo_comprobante: "FACTURA_A",
            punto_venta: 1,
            numero_comprobante: secuenciaFactura.numero_actual,
            importe_neto: 289256.2,
            importe_iva: 60743.8,
            subtotal: 350000.0,
            total: 350000.0,
            clienteId: clientesCreados[2].id,
            listaPrecioId: listaDistribuidor.id,
            metodo_pago: "TRANSFERENCIA",
            estado_pago: "PAGADO",
            usuarioId: vendedor2.id,
            sucursalId: sucursal.id,
            detalles: {
                create: [
                    {
                        productoId: productosCreados[0].id,
                        cantidad: 5,
                        precio_unitario: 42000.0,
                        precio_final: 42000.0,
                        subtotal: 210000.0,
                        costo_unitario: 35000.0
                    },
                    {
                        productoId: productosCreados[3].id,
                        cantidad: 3,
                        precio_unitario: 46666.67,
                        precio_final: 46666.67,
                        subtotal: 140000.0,
                        costo_unitario: 38000.0
                    }
                ]
            },
            pagos: {
                create: [
                    {
                        metodo_pago: "TRANSFERENCIA",
                        monto: 350000.0
                    }
                ]
            }
        }
    });

    // 13. LIQUIDACIÓN DE COMISIONES DE PRUEBA
    await prisma.liquidacionComision.create({
        data: {
            usuarioId: vendedor1.id,
            mes: new Date().getMonth() + 1,
            anio: new Date().getFullYear(),
            total_ventas: 480000.0,
            total_cobranzas: 350000.0,
            porcentaje_comision: 5.5,
            monto_comision: 26400.0,
            estado: "PENDIENTE",
            notas: "Comisiones calculadas sobre facturación bruta"
        }
    });

    console.log("✅ ¡Siembra mayorista completada con éxito!");
}

main()
    .catch((e) => {
        console.error("❌ Error en la siembra:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
