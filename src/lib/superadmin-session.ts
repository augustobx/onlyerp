import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getSessionKey } from "@/lib/session-secret";

export const SUPERADMIN_COOKIE_NAME = 'onlyerp_superadmin_session';

export type SuperAdminPayload = {
  id: number;
  username: string;
  nombre: string;
  email?: string | null;
  isSuperAdmin: true;
};

export async function crearSuperAdminSesion(admin: { id: number; username: string; nombre: string; email?: string | null }) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
  const expUnix = Math.floor(expiresAt.getTime() / 1000);

  const payload: SuperAdminPayload = {
    id: admin.id,
    username: admin.username,
    nombre: admin.nombre,
    email: admin.email,
    isSuperAdmin: true,
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expUnix)
    .sign(getSessionKey());

  const cookieStore = await cookies();
  cookieStore.set(SUPERADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function getSuperAdminSession(): Promise<SuperAdminPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SUPERADMIN_COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSessionKey());
    if (payload.isSuperAdmin === true) {
      return payload as unknown as SuperAdminPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function requireSuperAdmin(): Promise<SuperAdminPayload> {
  const session = await getSuperAdminSession();
  if (!session) {
    throw new Error("Acceso no autorizado: se requiere sesión de SuperAdmin.");
  }
  return session;
}

export async function cerrarSuperAdminSesion() {
  const cookieStore = await cookies();
  cookieStore.delete(SUPERADMIN_COOKIE_NAME);
}
