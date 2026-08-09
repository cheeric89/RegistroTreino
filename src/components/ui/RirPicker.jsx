import { useEffect, useRef, useState } from "react";

const RIR_OPTIONS = [0, 1, 2, 3, 4];

export default function RirPicker({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const numericValue = value === "" || value == null ? null : Number(value);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  if (disabled) {
    return <span className="rir-picker rir-picker--disabled">—</span>;
  }

  return (
    <div ref={rootRef} className={`rir-picker ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className={`rir-picker__trigger ${numericValue != null ? "has-value" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-label={numericValue == null ? "Elegir RIR" : `RIR ${numericValue}`}
        aria-expanded={open}
      >
        <span>RIR</span>
        <strong>{numericValue == null ? "—" : numericValue}</strong>
      </button>

      {open && (
        <div className="rir-picker__menu" role="group" aria-label="Repeticiones en reserva">
          <div className="rir-picker__copy">
            <strong>¿Cuántas reps te quedaban?</strong>
            <span>0 = al límite · 4 = bastante margen</span>
          </div>
          <div className="rir-picker__options">
            {RIR_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={numericValue === option ? "is-selected" : ""}
                onClick={() => {
                  onChange?.(option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            ))}
            <button
              type="button"
              className="rir-picker__clear"
              onClick={() => {
                onChange?.("");
                setOpen(false);
              }}
            >
              Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
