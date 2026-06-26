import { ChevronLeft, Clock, Dumbbell } from "lucide-react";

export default function WorkoutDetail({ workout, onBack, onRepeat }) {
  if (!workout) return null;

  const formatDuration = (seconds) => {
    if (!seconds) return "No disponible";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }

    return `${minutes}min`;
  };

  return (
    <div className="screen">

      {/* Topbar */}
      <div className="topbar">
        <button
          type="button"
          className="back-btn"
          onClick={onBack}
        >
          <ChevronLeft size={20} />
        </button>

        <div className="topbar-title">
          <span className="step-label">
            Sesión guardada
          </span>

          <h2>{workout.day}</h2>
        </div>
      </div>


      <div className="form-scroll">
<div
  style={{
    background: "#1e1e24",
    border: "1px solid #333",
    borderRadius: "16px",
    padding: "14px 16px",
    marginBottom: "20px",
  }}
>
  {/* Fecha */}
  <div
    style={{
      color: "#888",
      fontSize: "0.85rem",
      marginBottom: "10px",
    }}
  >
    {workout.date}
  </div>

  {/* Estadísticas */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
    }}
  >
    {/* Duración */}
    <div
      style={{
        flex: 1,
        textAlign: "center",
      }}
    >
      <Clock size={18} color="#a855f7" />

      <p
        style={{
          margin: "10px 0 4px",
          fontWeight: "800",
          fontSize: "1.25rem",
          color: "#ffffff",
          letterSpacing: "-0.5px",
        }}
      >
        {formatDuration(workout.duration)}
      </p>

      <small
        style={{
          color: "#8b8b9b",
          fontSize: "0.85rem",
          letterSpacing: "0.6px",
          textTransform: "uppercase",
        }}
      >
        DURACIÓN
      </small>
    </div>

    {/* Separador */}
    <div
      style={{
        width: "1px",
        height: "42px",
        background:
          "linear-gradient(to bottom, transparent, rgba(168, 85, 247, 0.5), transparent)",
      }}
    />

    {/* Volumen */}
    <div
      style={{
        flex: 1,
        textAlign: "center",
      }}
    >
      <Dumbbell size={18} color="#a855f7" />

      <p
        style={{
          margin: "10px 0 4px",
          fontWeight: "800",
          fontSize: "1.25rem",
          color: "#ffffff",
          letterSpacing: "-0.5px",
        }}
      >
        {workout.volume || 0} kg
      </p>

      <small
        style={{
          color: "#8b8b9b",
          fontSize: "0.85rem",
          letterSpacing: "0.6px",
          textTransform: "uppercase",
        }}
      >
        VOLUMEN
      </small>
    </div>
  </div>
  <div
  style={{
    marginTop: "28px",
    padding: "22px",
    background: "linear-gradient(135deg, #1f1b2e, #2b2342)",
    border: "1px solid rgba(168,85,247,.25)",
    borderRadius: "18px",
    textAlign: "center",
  }}
>
  <h3
    style={{
      color: "#fff",
      marginBottom: "8px",
      fontSize: "1.2rem",
    }}
  >
    🔄 Repetir entrenamiento
  </h3>

  <p
    style={{
      color: "#9ca3af",
      fontSize: ".92rem",
      lineHeight: "1.5",
      marginBottom: "18px",
    }}
  >
    Crea una nueva sesión usando esta misma rutina.
    Se copiarán los ejercicios y las series, pero no los pesos ni las repeticiones.
  </p>

  <button
    className="cta-button"
    onClick={() => onRepeat(workout)}
      // luego irá la lógica
    
  >
    Repetir entrenamiento
  </button>
</div>
</div>


        {/* Ejercicios */}
        {workout.exercises.map((category, index) => (
          <div
            key={index}
            className="wf-cat-block"
          >
            <h3
  style={{
    color: "#a855f7",
    textTransform: "uppercase",
    letterSpacing: "2px",
    marginBottom: "16px",
    marginLeft: "12px",
    fontSize: "1.15rem",
    fontWeight: "800",
    textShadow: "0 0 10px rgba(168, 85, 247, 0.35)",
  }}
>
  {category.name}
</h3>   


            {category.exercises.map((exercise, i) => (
              <div
                key={i}
                className="wf-ex-card"
              >
                <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
  }}
>
  <div
    style={{
      width: "4px",
      height: "24px",
      background: "#a855f7",
      borderRadius: "999px",
      boxShadow: "0 0 12px rgba(168, 85, 247, 0.7)",
    }}
  />

  <span
    style={{
      color: "#ffffff",
      fontSize: "1.15rem",
      fontWeight: "700",
      letterSpacing: "0.3px",
    }}
  >
    {exercise.name || "Ejercicio sin nombre"}
  </span>
</div>


                {exercise.sets.map((set, s) => (
                  <div
  key={s}
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "10px",
    padding: "10px 14px",
    background: "#141418",
    borderRadius: "12px",
  }}
>
  <span
  style={{
    background: "linear-gradient(135deg, #a855f7, #7c3aed)",
    color: "white",
    padding: "6px 12px",
    borderRadius: "999px",
    fontSize: "0.78rem",
    fontWeight: "800",
    minWidth: "68px",
    textAlign: "center",
    boxShadow: "0 0 8px rgba(168, 85, 247, 0.35)",
    letterSpacing: "0.5px",
  }}
>
  Serie {s + 1}
</span>

  <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "8px",
  }}
>
  <span
    style={{
      color: "#ffffff",
      fontSize: "1.05rem",
      fontWeight: "800",
    }}
  >
    {set.weight || 0} kg
  </span>

  <span
    style={{
      color: "#7c7c8f",
      fontSize: "0.95rem",
      fontWeight: "600",
    }}
  >
    × {set.reps || 0} reps
  </span>
</div>
</div>
                ))}

              </div>
            ))}
          </div>
        ))}

      </div>

    </div>
  );
}