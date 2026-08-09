const formatDuration = (seconds) => {
  const totalMinutes = Math.max(0, Math.round((Number(seconds) || 0) / 60));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
};

const roundedRect = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

const drawMetric = (ctx, x, y, width, label, value) => {
  roundedRect(ctx, x, y, width, 150, 28);
  ctx.fillStyle = "rgba(255,255,255,.055)";
  ctx.fill();
  ctx.strokeStyle = "rgba(216,180,254,.14)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#a78bfa";
  ctx.font = "700 26px Arial";
  ctx.fillText(label.toUpperCase(), x + 28, y + 45);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "800 44px Arial";
  ctx.fillText(String(value), x + 28, y + 105);
};

export const createWorkoutShareBlob = async ({ workout, summary }) => {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear la tarjeta");

  const background = ctx.createLinearGradient(0, 0, 1080, 1350);
  background.addColorStop(0, "#080b14");
  background.addColorStop(0.52, "#151023");
  background.addColorStop(1, "#070910");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1080, 1350);

  const glow = ctx.createRadialGradient(170, 120, 0, 170, 120, 570);
  glow.addColorStop(0, "rgba(168,85,247,.34)");
  glow.addColorStop(1, "rgba(168,85,247,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 900, 800);

  ctx.fillStyle = "#c084fc";
  ctx.font = "900 34px Arial";
  ctx.fillText("TREINO", 72, 100);
  ctx.fillStyle = "#64748b";
  ctx.font = "700 22px Arial";
  ctx.fillText("TRAIN · TRACK · PROGRESS", 72, 138);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "900 70px Arial";
  ctx.fillText(workout?.day || "Entrenamiento", 72, 270);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 28px Arial";
  ctx.fillText(workout?.date || new Date().toLocaleDateString("es-CL"), 74, 320);

  drawMetric(ctx, 72, 390, 288, "Duración", formatDuration(workout?.duration));
  drawMetric(ctx, 396, 390, 288, "Volumen", `${Math.round(summary?.totalVolume || 0).toLocaleString("es-CL")} kg`);
  drawMetric(ctx, 720, 390, 288, "PRs", summary?.prCount || 0);

  drawMetric(ctx, 72, 574, 288, "Ejercicios", summary?.totalExercises || 0);
  drawMetric(ctx, 396, 574, 288, "Series", summary?.completedSets || 0);
  drawMetric(ctx, 720, 574, 288, "Cumplimiento", `${summary?.completionRate || 0}%`);

  roundedRect(ctx, 72, 780, 936, 310, 34);
  ctx.fillStyle = "rgba(0,0,0,.2)";
  ctx.fill();
  ctx.strokeStyle = "rgba(168,85,247,.18)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#a78bfa";
  ctx.font = "800 25px Arial";
  ctx.fillText("MEJOR SERIE", 108, 835);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "900 52px Arial";
  const best = summary?.bestSessionSet;
  const bestWeight = Number(best?.weight) || 0;
  const bestReps = Number(best?.reps) || 0;
  const bestText = best ? `${bestWeight.toLocaleString("es-CL")} kg × ${bestReps}` : "—";
  ctx.fillText(bestText, 108, 915);
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "700 30px Arial";
  ctx.fillText(best?.exerciseName || "Sigue registrando para crear tu referencia", 108, 970);

  if ((summary?.prCount || 0) > 0) {
    ctx.fillStyle = "#fbbf24";
    ctx.font = "800 27px Arial";
    ctx.fillText(`🏆 ${summary.prCount} ${summary.prCount === 1 ? "nuevo récord personal" : "nuevos récords personales"}`, 108, 1030);
  } else {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 27px Arial";
    ctx.fillText("Cada sesión deja una referencia para la siguiente.", 108, 1030);
  }

  ctx.fillStyle = "#f8fafc";
  ctx.font = "800 30px Arial";
  ctx.fillText("Haz que cada sesión sume.", 72, 1215);
  ctx.fillStyle = "#64748b";
  ctx.font = "600 23px Arial";
  ctx.fillText("registro-treino.vercel.app", 72, 1260);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No se pudo exportar la tarjeta")), "image/png", 0.96);
  });
};

export const shareWorkoutCard = async ({ workout, summary }) => {
  const blob = await createWorkoutShareBlob({ workout, summary });
  const safeName = String(workout?.day || "entrenamiento")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "entrenamiento";
  const file = new File([blob], `treino-${safeName}.png`, { type: "image/png" });

  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({
      title: `${workout?.day || "Entrenamiento"} · Treino`,
      text: `Completé ${summary?.completedSets || 0} series y ${Math.round(summary?.totalVolume || 0).toLocaleString("es-CL")} kg de volumen en Treino.`,
      files: [file],
    });
    return { shared: true, downloaded: false };
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return { shared: false, downloaded: true };
};
