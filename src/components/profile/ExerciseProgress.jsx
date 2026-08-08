import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Dumbbell,
  Minus,
  Search,
  Target,
  TrendingUp,
} from "lucide-react";
import { buildExerciseProgress } from "../../utils/exerciseProgress";

const METRICS = {
  weight: {
    label: "Peso",
    shortLabel: "kg",
    value: (point) => point.weight,
    format: (value) => `${Number(value).toLocaleString("es-CL")} kg`,
  },
  reps: {
    label: "Reps",
    shortLabel: "reps",
    value: (point) => point.reps,
    format: (value) => `${Number(value).toLocaleString("es-CL")} reps`,
  },
  volume: {
    label: "Volumen",
    shortLabel: "kg",
    value: (point) => point.volume,
    format: (value) => `${Math.round(Number(value)).toLocaleString("es-CL")} kg`,
  },
};

const CHART = {
  width: 680,
  height: 300,
  left: 58,
  right: 22,
  top: 24,
  bottom: 50,
};

const normalize = (value = "") =>
  value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const formatDelta = (value) => {
  const numeric = Number(value) || 0;
  if (numeric === 0) return "Sin cambios";
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toLocaleString("es-CL")} kg`;
};

function getChartGeometry(points, metricKey) {
  const metric = METRICS[metricKey];
  const values = points.map((point) => Number(metric.value(point)) || 0);
  const plotWidth = CHART.width - CHART.left - CHART.right;
  const plotHeight = CHART.height - CHART.top - CHART.bottom;

  if (!values.length) {
    return { coords: [], ticks: [], min: 0, max: 1, plotWidth, plotHeight };
  }

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin;
  const padding = span > 0 ? span * 0.16 : Math.max(rawMax * 0.12, 1);
  const min = Math.max(0, rawMin - padding);
  const max = Math.max(min + 1, rawMax + padding);

  const coords = points.map((point, index) => {
    const value = Number(metric.value(point)) || 0;
    const x =
      points.length === 1
        ? CHART.left + plotWidth / 2
        : CHART.left + (index / (points.length - 1)) * plotWidth;
    const ratio = (value - min) / (max - min);
    const y = CHART.top + plotHeight - ratio * plotHeight;
    return { x, y, value, point, index };
  });

  const ticks = Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3;
    const value = max - ratio * (max - min);
    return {
      value,
      y: CHART.top + ratio * plotHeight,
    };
  });

  return { coords, ticks, min, max, plotWidth, plotHeight };
}

function ProgressLineChart({ points, metricKey, selectedIndex, onSelectPoint }) {
  const metric = METRICS[metricKey];
  const geometry = useMemo(
    () => getChartGeometry(points, metricKey),
    [metricKey, points]
  );

  const path = geometry.coords
    .map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x} ${coord.y}`)
    .join(" ");

  const areaPath = geometry.coords.length
    ? `${path} L ${geometry.coords.at(-1).x} ${CHART.height - CHART.bottom} L ${geometry.coords[0].x} ${CHART.height - CHART.bottom} Z`
    : "";

  const labelIndexes = useMemo(() => {
    if (points.length <= 4) return points.map((_, index) => index);
    return [0, Math.round((points.length - 1) / 3), Math.round(((points.length - 1) * 2) / 3), points.length - 1];
  }, [points]);

  return (
    <div className="exercise-chart-wrap">
      <svg
        className="exercise-line-chart"
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        role="img"
        aria-label={`Evolución de ${metric.label.toLocaleLowerCase("es")} a través de ${points.length} sesiones`}
      >
        <defs>
          <linearGradient id={`exercise-chart-fill-${metricKey}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {geometry.ticks.map((tick, index) => (
          <g key={`${tick.y}-${index}`}>
            <line
              className="exercise-chart-gridline"
              x1={CHART.left}
              x2={CHART.width - CHART.right}
              y1={tick.y}
              y2={tick.y}
            />
            <text
              className="exercise-chart-y-label"
              x={CHART.left - 10}
              y={tick.y + 4}
              textAnchor="end"
            >
              {metricKey === "volume"
                ? Math.round(tick.value).toLocaleString("es-CL")
                : Number(tick.value.toFixed(1)).toLocaleString("es-CL")}
            </text>
          </g>
        ))}

        {areaPath && (
          <path
            className="exercise-chart-area"
            d={areaPath}
            fill={`url(#exercise-chart-fill-${metricKey})`}
          />
        )}
        {path && <path className="exercise-chart-line" d={path} />}

        {geometry.coords.map((coord) => {
          const selected = coord.index === selectedIndex;
          return (
            <g
              key={`${coord.point.timestamp}-${coord.index}`}
              className={`exercise-chart-point ${selected ? "is-selected" : ""}`}
              role="button"
              tabIndex="0"
              aria-label={`${coord.point.dateLabel}: ${metric.format(coord.value)}`}
              onClick={() => onSelectPoint(coord.index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectPoint(coord.index);
                }
              }}
            >
              {selected && <circle className="exercise-chart-point-halo" cx={coord.x} cy={coord.y} r="13" />}
              <circle className="exercise-chart-point-dot" cx={coord.x} cy={coord.y} r={selected ? 6 : 4.5} />
            </g>
          );
        })}

        {labelIndexes.map((index) => {
          const coord = geometry.coords[index];
          if (!coord) return null;
          return (
            <text
              key={`label-${index}`}
              className="exercise-chart-x-label"
              x={coord.x}
              y={CHART.height - 19}
              textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
            >
              {points[index].dateLabel}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function DeltaBadge({ value }) {
  const numeric = Number(value) || 0;
  const Icon = numeric > 0 ? ArrowUpRight : numeric < 0 ? ArrowDownRight : Minus;
  const state = numeric > 0 ? "positive" : numeric < 0 ? "negative" : "neutral";

  return (
    <span className={`exercise-progress-delta exercise-progress-delta--${state}`}>
      <Icon size={14} />
      {formatDelta(numeric)}
    </span>
  );
}

export default function ExerciseProgress({ workouts = [] }) {
  const exercises = useMemo(() => buildExerciseProgress(workouts), [workouts]);
  const [selectedKey, setSelectedKey] = useState("");
  const [metricKey, setMetricKey] = useState("weight");
  const [selectedPointIndex, setSelectedPointIndex] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!exercises.length) {
      setSelectedKey("");
      return;
    }

    if (!selectedKey || !exercises.some((exercise) => exercise.key === selectedKey)) {
      setSelectedKey(exercises[0].key);
    }
  }, [exercises, selectedKey]);

  const selectedExercise = useMemo(
    () => exercises.find((exercise) => exercise.key === selectedKey) || exercises[0] || null,
    [exercises, selectedKey]
  );

  useEffect(() => {
    if (selectedExercise?.points?.length) {
      setSelectedPointIndex(selectedExercise.points.length - 1);
    }
  }, [selectedExercise?.key, selectedExercise?.points?.length]);

  const filteredExercises = useMemo(() => {
    const query = normalize(search);
    if (!query) return exercises;
    return exercises.filter((exercise) =>
      normalize(`${exercise.name} ${exercise.categories.join(" ")}`).includes(query)
    );
  }, [exercises, search]);

  if (!exercises.length) {
    return (
      <section className="exercise-progress-section">
        <div className="exercise-progress-heading">
          <div>
            <span className="card-kicker">Evolución individual</span>
            <h2>Progreso por ejercicio</h2>
            <p>Cuando repitas un ejercicio, aquí podrás comparar tus marcas sesión a sesión.</p>
          </div>
          <TrendingUp size={21} />
        </div>
        <div className="exercise-progress-empty">
          <Dumbbell size={26} />
          <strong>Aún no hay ejercicios para comparar</strong>
          <p>Registra al menos una sesión con peso o repeticiones para empezar.</p>
        </div>
      </section>
    );
  }

  const points = selectedExercise?.points || [];
  const selectedPoint = points[selectedPointIndex] || points.at(-1) || null;
  const metric = METRICS[metricKey];
  const latest = selectedExercise?.latest;
  const first = selectedExercise?.first;
  const sessionChange =
    first && latest && first.weight > 0
      ? ((latest.weight - first.weight) / first.weight) * 100
      : null;

  return (
    <section className="exercise-progress-section">
      <div className="exercise-progress-heading">
        <div>
          <span className="card-kicker">Evolución individual</span>
          <h2>Progreso por ejercicio</h2>
          <p>Entra a un ejercicio y revisa cómo han cambiado tus marcas con el tiempo.</p>
        </div>
        <TrendingUp size={21} />
      </div>

      <div className="exercise-progress-explorer">
        <aside className="exercise-progress-browser">
          <label className="exercise-progress-search">
            <Search size={16} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar ejercicio..."
              aria-label="Buscar ejercicio"
            />
          </label>

          <div className="exercise-progress-list" aria-label="Ejercicios registrados">
            {filteredExercises.map((exercise) => (
              <button
                key={exercise.key}
                type="button"
                className={`exercise-progress-list-item ${exercise.key === selectedExercise?.key ? "is-active" : ""}`}
                onClick={() => setSelectedKey(exercise.key)}
              >
                <div>
                  <strong>{exercise.name}</strong>
                  <span>{exercise.categories.slice(0, 2).join(" · ")}</span>
                </div>
                <div className="exercise-progress-list-item__meta">
                  <strong>{exercise.bestWeight || "—"} kg</strong>
                  <span>{exercise.sessions} ses.</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {selectedExercise && (
          <div className="exercise-progress-detail">
            <header className="exercise-progress-detail__header">
              <div>
                <span className="card-kicker">{selectedExercise.categories.join(" · ")}</span>
                <h3>{selectedExercise.name}</h3>
                <p>
                  {selectedExercise.sessions} {selectedExercise.sessions === 1 ? "sesión registrada" : "sesiones registradas"}
                </p>
              </div>
              <DeltaBadge value={selectedExercise.weightDelta} />
            </header>

            <div className="exercise-progress-kpis">
              <article>
                <Dumbbell size={17} />
                <span>Mejor peso</span>
                <strong>{selectedExercise.bestWeight || "—"} kg</strong>
                <small>
                  {selectedExercise.bestWeightReps > 0
                    ? `${selectedExercise.bestWeightReps} reps en esa marca`
                    : "Sin reps registradas"}
                </small>
              </article>
              <article>
                <BarChart3 size={17} />
                <span>Mejor volumen</span>
                <strong>{Math.round(selectedExercise.bestVolume).toLocaleString("es-CL")} kg</strong>
                <small>en una sesión</small>
              </article>
              <article>
                <CalendarDays size={17} />
                <span>Sesiones</span>
                <strong>{selectedExercise.sessions}</strong>
                <small>con este ejercicio</small>
              </article>
              <article>
                <Target size={17} />
                <span>Desde el inicio</span>
                <strong>
                  {sessionChange === null
                    ? "—"
                    : `${sessionChange >= 0 ? "+" : ""}${Math.round(sessionChange)}%`}
                </strong>
                <small>en peso de referencia</small>
              </article>
            </div>

            <div className="exercise-progress-chart-card">
              <div className="exercise-progress-chart-toolbar">
                <div>
                  <span className="card-kicker">Historial de marcas</span>
                  <h3>{metric.label}</h3>
                </div>
                <div className="exercise-progress-metric-tabs" role="tablist" aria-label="Métrica del gráfico">
                  {Object.entries(METRICS).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={metricKey === key}
                      className={metricKey === key ? "is-active" : ""}
                      onClick={() => setMetricKey(key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {points.length > 1 ? (
                <ProgressLineChart
                  points={points}
                  metricKey={metricKey}
                  selectedIndex={selectedPointIndex}
                  onSelectPoint={setSelectedPointIndex}
                />
              ) : (
                <div className="exercise-progress-single-point">
                  <TrendingUp size={25} />
                  <strong>Primera referencia guardada</strong>
                  <p>Cuando vuelvas a registrar este ejercicio aparecerá aquí la línea de evolución.</p>
                </div>
              )}

              {selectedPoint && (
                <div className="exercise-progress-point-detail" aria-live="polite">
                  <div>
                    <span>{selectedPoint.dateLabel}</span>
                    <strong>{selectedPoint.day}</strong>
                  </div>
                  <div>
                    <span>{metric.label}</span>
                    <strong>{metric.format(metric.value(selectedPoint))}</strong>
                  </div>
                  <div>
                    <span>Mejor serie</span>
                    <strong>{selectedPoint.bestSetReps} × {selectedPoint.weight} kg</strong>
                  </div>
                  <div>
                    <span>Volumen</span>
                    <strong>{Math.round(selectedPoint.volume).toLocaleString("es-CL")} kg</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
