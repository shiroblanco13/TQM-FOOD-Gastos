import { ROLES } from "../theme.js";

export function isAdminLike(rol) {
  return rol === ROLES.SUPERADMIN || rol === ROLES.ADMIN;
}

export function canApprove(session) {
  return isAdminLike(session?.rol);
}

export function canExport(session) {
  return isAdminLike(session?.rol);
}

export function canManageUsers(session) {
  return isAdminLike(session?.rol);
}

export function canConfigureDrive(session) {
  return session?.rol === ROLES.SUPERADMIN;
}

export function canDeleteUsers(session) {
  return session?.rol === ROLES.SUPERADMIN;
}

/** ¿Puede `session` crear un usuario con el rol `nuevoRol`? */
export function canAssignRole(session, nuevoRol) {
  if (session?.rol === ROLES.SUPERADMIN) return true;
  if (session?.rol === ROLES.ADMIN) return nuevoRol === ROLES.EMPLEADO;
  return false;
}

/**
 * ¿Puede `session` editar/desactivar/resetear la contraseña de `target`?
 * Regla dura: un usuario "protegido" (el superadmin inicial) no puede ser
 * tocado por nadie que no sea él mismo, y ni siquiera él puede quitarse
 * la protección o el rol de superadmin.
 */
export function canEditUser(session, target) {
  if (!session || !target) return false;
  if (target.protegido) return session.username === target.username;
  if (session.rol === ROLES.SUPERADMIN) return true;
  if (session.rol === ROLES.ADMIN) return target.rol === ROLES.EMPLEADO;
  return session.username === target.username; // cualquiera puede editar su propio perfil básico
}

export function canDeleteUser(session, target) {
  if (target.protegido) return false;
  return canDeleteUsers(session);
}

/** Cambios que ni el propio superadmin protegido puede aplicarse a sí mismo. */
export function violatesProtection(target, changes) {
  if (!target.protegido) return false;
  if ("activo" in changes && changes.activo === false) return true;
  if ("rol" in changes && changes.rol !== ROLES.SUPERADMIN) return true;
  if ("protegido" in changes && changes.protegido === false) return true;
  return false;
}
