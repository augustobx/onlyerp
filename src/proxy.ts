import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getSessionKey } from '@/lib/session-secret';

// Este diccionario conecta las rutas de la URL con los permisos que creamos en la base de datos
const RUTAS_MODULOS: Record<string, string> = {
    '/ventas': 'VENTAS',
    '/caja': 'CAJA',
    '/cuentas-corrientes': 'CLIENTES',
    '/clientes': 'CLIENTES',
    '/inventario': 'INVENTARIO',
    '/historial': 'HISTORIAL',
    '/reportes': 'REPORTES',
    '/configuracion': 'CONFIGURACION',
    '/presupuestos': 'PRESUPUESTOS',
    '/pedidos': 'VENTAS',
    '/pedidos/armados': 'VENTAS',
    '/combos': 'INVENTARIO',
    '/compras': 'INVENTARIO',
    '/listas-precio': 'INVENTARIO',
    '/proveedores': 'INVENTARIO',
    '/transferencias': 'INVENTARIO',
    '/categorias': 'INVENTARIO',
};

// Rutas exclusivas de ADMIN — ningún otro rol puede acceder
const RUTAS_SOLO_ADMIN = ['/usuarios', '/importar', '/configuracion/sucursales'];

// Rutas que un VENDEDOR puede acceder (todo lo demás está bloqueado)
const RUTAS_VENDEDOR_PERMITIDAS = ['/vendedor', '/login'];

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Si ya existe una sesión tenant válida, /login no debe volver a mostrarse.
    // Esto evita renderizar AppShell + formulario de login simultáneamente.
    const existingSessionToken = request.cookies.get('onlyerp_session')?.value;

    if (pathname === '/login' && existingSessionToken) {
        try {
            await jwtVerify(existingSessionToken, getSessionKey());
            return NextResponse.redirect(new URL('/', request.url));
        } catch {
            // Sesión inválida o vencida: permitir mostrar el login normalmente.
        }
    }

    // 1. Dejar pasar archivos del sistema, imágenes, PWA assets, y la página de login libremente.
    // También dejamos pasar la ruta /imprimir para que los tickets no pidan login al abrirse en ventana nueva.
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname === '/login' ||
        pathname === '/suspendido' ||
        pathname.startsWith('/superadmin') ||
        pathname.startsWith('/imprimir') ||
        pathname === '/manifest.json' ||
        pathname === '/sw.js' ||
        pathname === '/favicon.ico' ||
        pathname.startsWith('/icons')
    ) {
        return NextResponse.next();
    }

    // 2. Buscar si el usuario tiene el token de sesión guardado
    const sessionToken = existingSessionToken;

    // Si no tiene token, ¡afuera! Lo mandamos a loguearse.
    if (!sessionToken) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
        // 3. Desencriptar el token y leer quién es
        const { payload } = await jwtVerify(sessionToken, getSessionKey());
        const rol = payload.rol as string;
        const permisos = (payload.permisos as string[]) || [];

        // ============================================================
        // REGLA #1: VENDEDORES — Solo pueden acceder a /vendedor
        // ============================================================
        if (rol === 'VENDEDOR') {
            const permitido = RUTAS_VENDEDOR_PERMITIDAS.some(ruta => pathname.startsWith(ruta));
            if (!permitido) {
                // Si intenta ir a cualquier otra ruta, lo mandamos a /vendedor
                return NextResponse.redirect(new URL('/vendedor', request.url));
            }
            return NextResponse.next();
        }

        // ============================================================
        // REGLA #2: ADMIN — Acceso VIP total al sistema. Pasa directo.
        // ============================================================
        if (rol === 'ADMIN') return NextResponse.next();

        // ============================================================
        // REGLA #3: CAJEROS — Acceso por permisos configurados
        // ============================================================

        // A) Rutas exclusivas de ADMIN — siempre bloqueadas para cajeros
        if (RUTAS_SOLO_ADMIN.some(ruta => pathname.startsWith(ruta))) {
            return NextResponse.redirect(new URL('/', request.url));
        }

        // B) Revisar si la ruta a la que intenta entrar requiere un permiso específico
        const moduloRequerido = Object.keys(RUTAS_MODULOS).find(ruta => pathname.startsWith(ruta));

        if (moduloRequerido) {
            const permisoNecesario = RUTAS_MODULOS[moduloRequerido];

            // Si el cajero NO tiene el permiso tildado en su cuenta, lo rebotamos al inicio.
            if (!permisos.includes(permisoNecesario)) {
                return NextResponse.redirect(new URL('/', request.url));
            }
        }

        // Si pasó todas las pruebas, lo dejamos pasar a la pantalla
        return NextResponse.next();

    } catch (error) {
        // Si el token expiró o alguien lo modificó, lo mandamos al login.
        return NextResponse.redirect(new URL('/login', request.url));
    }
}

// Configuración del matcher — excluye archivos estáticos para que el proxy no pierda tiempo
export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons).*)'],
};
