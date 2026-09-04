import { hashPassword, generateTempPassword } from "./crypto.js";
import { ROLES } from "../theme.js";

const SEED_DEFS = [
  { username: "s.alegre", nombre: "Sabas Alegre Alegre", rol: ROLES.SUPERADMIN, protegido: true },
  { username: "b.bori", nombre: "Bernardo Bori", rol: ROLES.ADMIN, protegido: false },
  { username: "m.marin", nombre: "M. Marín", rol: ROLES.EMPLEADO, protegido: false },
  { username: "m.zarioh", nombre: "M. Zarioh", rol: ROLES.EMPLEADO, protegido: false },
  { username: "i.ballesta", nombre: "I. Ballesta", rol: ROLES.EMPLEADO, protegido: false },
];

/**
 * Crea los usuarios iniciales con contraseñas temporales aleatorias (nunca
 * contraseñas fijas conocidas de antemano). Cada uno deberá cambiarla en su
 * primer inicio de sesión. Las contraseñas en claro se devuelven una única
 * vez para que el superadministrador que hace la puesta en marcha las reparta.
 */
export async function buildSeedUsers() {
  const plainPasswords = {};
  const usuarios = [];
  for (const def of SEED_DEFS) {
    const temp = generateTempPassword();
    const { salt, hash, iterations } = await hashPassword(temp);
    plainPasswords[def.username] = temp;
    usuarios.push({
      username: def.username,
      nombre: def.nombre,
      rol: def.rol,
      protegido: def.protegido,
      activo: true,
      passwordSalt: salt,
      passwordHash: hash,
      passwordIter: iterations,
      debeCambiarPassword: true,
      solicitudReset: false,
      creadoEn: Date.now(),
    });
  }
  return { usuarios, plainPasswords };
}
