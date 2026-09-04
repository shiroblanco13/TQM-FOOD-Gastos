import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { GoogleDriveNotConfiguredError } from "../lib/googleDriveClient.js";
import { loadOrBootstrapUsuarios, loadUsuarios, loadGastos, loadConfig } from "../lib/db.js";
import { verifyPassword } from "../lib/crypto.js";

const AppCtx = createContext(null);

const SESSION_KEY = "gastos_tqm_session";

export function AppProvider({ children }) {
  const [status, setStatus] = useState("cargando"); // cargando | necesita-config | listo | error
  const [error, setError] = useState("");
  const [bootstrapPasswords, setBootstrapPasswords] = useState(null);

  const [usuarios, setUsuarios] = useState([]);
  const [usuariosFileId, setUsuariosFileId] = useState(null);
  const [usuariosModifiedTime, setUsuariosModifiedTime] = useState(null);

  const [gastos, setGastos] = useState([]);
  const [gastosFileId, setGastosFileId] = useState(null);
  const [gastosModifiedTime, setGastosModifiedTime] = useState(null);

  const [config, setConfig] = useState({ tarifaKm: 0.26 });
  const [configFileId, setConfigFileId] = useState(null);
  const [configModifiedTime, setConfigModifiedTime] = useState(null);

  const [session, setSession] = useState(() => {
    try {
      const raw = window.sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const bootAndLoad = useCallback(async () => {
    setStatus("cargando");
    setError("");
    try {
      const { usuarios: u, fileId: uId, modifiedTime: uMt, bootstrapPasswords: bp } = await loadOrBootstrapUsuarios();
      setUsuarios(u);
      setUsuariosFileId(uId);
      setUsuariosModifiedTime(uMt);
      if (bp) setBootstrapPasswords(bp);

      const { gastos: g, fileId: gId, modifiedTime: gMt } = await loadGastos();
      setGastos(g);
      setGastosFileId(gId);
      setGastosModifiedTime(gMt);

      const { config: c, fileId: cId, modifiedTime: cMt } = await loadConfig();
      setConfig(c);
      setConfigFileId(cId);
      setConfigModifiedTime(cMt);

      setStatus("listo");
    } catch (e) {
      if (e instanceof GoogleDriveNotConfiguredError) {
        setStatus("necesita-config");
      } else {
        setError(e.message || "Error desconocido al conectar con Google Drive.");
        setStatus("error");
      }
    }
  }, []);

  useEffect(() => {
    bootAndLoad();
  }, [bootAndLoad]);

  const refreshUsuarios = useCallback(async () => {
    const { usuarios: u, fileId, modifiedTime } = await loadUsuarios();
    setUsuarios(u);
    setUsuariosFileId(fileId);
    setUsuariosModifiedTime(modifiedTime);
    return u;
  }, []);

  const refreshGastos = useCallback(async () => {
    const { gastos: g, fileId, modifiedTime } = await loadGastos();
    setGastos(g);
    setGastosFileId(fileId);
    setGastosModifiedTime(modifiedTime);
    return g;
  }, []);

  async function login(username, password) {
    const uname = username.trim().toLowerCase();
    const user = usuarios.find((u) => u.username.toLowerCase() === uname);
    if (!user || !user.activo) throw new Error("Usuario o contraseña incorrectos.");
    const ok = await verifyPassword(password, user.passwordSalt, user.passwordHash, user.passwordIter);
    if (!ok) throw new Error("Usuario o contraseña incorrectos.");
    const s = { username: user.username, nombre: user.nombre, rol: user.rol, debeCambiarPassword: !!user.debeCambiarPassword };
    setSession(s);
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    return s;
  }

  function logout() {
    setSession(null);
    window.sessionStorage.removeItem(SESSION_KEY);
  }

  function updateSessionFlag(changes) {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...changes };
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      return next;
    });
  }

  const value = {
    status, error, bootstrapPasswords, clearBootstrapPasswords: () => setBootstrapPasswords(null),
    retry: bootAndLoad,
    usuarios, usuariosFileId, usuariosModifiedTime, setUsuarios,
    setUsuariosMeta: (fileId, modifiedTime) => { setUsuariosFileId(fileId); setUsuariosModifiedTime(modifiedTime); },
    refreshUsuarios,
    gastos, gastosFileId, gastosModifiedTime, setGastos,
    setGastosMeta: (fileId, modifiedTime) => { setGastosFileId(fileId); setGastosModifiedTime(modifiedTime); },
    refreshGastos,
    config, configFileId, configModifiedTime, setConfig,
    setConfigMeta: (fileId, modifiedTime) => { setConfigFileId(fileId); setConfigModifiedTime(modifiedTime); },
    session, login, logout, updateSessionFlag,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp debe usarse dentro de <AppProvider>");
  return ctx;
}
