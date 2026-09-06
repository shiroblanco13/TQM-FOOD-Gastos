import React, { useRef, useState } from "react";
import { COLORS, inputStyle } from "../theme.js";
import { hasMapsKey, newSessionToken, fetchAddressSuggestions } from "../lib/googleMaps.js";

export default function AddressAutocomplete({ value, onChange, placeholder }) {
  const [sugerencias, setSugerencias] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const sessionRef = useRef(null);
  const timeoutRef = useRef(null);

  async function handleInput(texto) {
    onChange(texto);
    if (!hasMapsKey()) return;

    if (!sessionRef.current) sessionRef.current = await newSessionToken();
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      try {
        const results = await fetchAddressSuggestions(texto, sessionRef.current);
        setSugerencias(results);
        setAbierto(results.length > 0);
      } catch {
        setSugerencias([]);
        setAbierto(false);
      }
    }, 300);
  }

  function elegir(sugerencia) {
    onChange(sugerencia.text);
    setSugerencias([]);
    setAbierto(false);
    sessionRef.current = null; // la sesión termina al elegir; la próxima búsqueda abre una nueva
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        style={inputStyle}
        value={value}
        placeholder={placeholder}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => sugerencias.length > 0 && setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
      />
      {abierto && sugerencias.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, marginTop: -6,
          background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: 8,
          boxShadow: "0 4px 10px rgba(28,37,54,0.12)", overflow: "hidden",
        }}>
          {sugerencias.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); elegir(s); }}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "8px 10px",
                border: "none", borderBottom: `1px solid ${COLORS.line}`, background: "#fff",
                fontSize: 12.5, color: COLORS.ink, cursor: "pointer",
              }}
            >
              {s.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
