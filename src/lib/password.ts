import { randomBytes, pbkdf2Sync } from "crypto";

const ITERATIONS = 100_000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

/**
 * Genera un hash seguro para una contraseña.
 * Formato de salida: `salt:hash` (ambos en hex)
 */
export function hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
    return `${salt}:${hash}`;
}

/**
 * Verifica una contraseña contra un hash almacenado.
 * Soporta tanto el formato hasheado (salt:hash) como contraseñas legacy en texto plano.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
    // Si el hash almacenado no tiene el formato salt:hash,
    // es una contraseña legacy en texto plano → comparar directamente
    if (!storedHash.includes(":") || storedHash.length < 50) {
        return password === storedHash;
    }

    const [salt, hash] = storedHash.split(":");
    const verifyHash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
    return hash === verifyHash;
}
