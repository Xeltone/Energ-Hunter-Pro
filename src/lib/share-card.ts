export type ShareStats = {
  name: string;
  rank: string;
  drank: number;
  caffeine: number;
  sugar: number;
  avg: number;
  spent: number;
};

/** Рисует карточку статистики на canvas (без внешних библиотек). */
export async function renderShareCard(s: ShareStats): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue("--color-accent").trim() || "#ffb320";
  const font = "'Segoe UI', Inter, system-ui, sans-serif";

  ctx.fillStyle = "#0b0c10";
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, 0, 50, W / 2, 0, 900);
  g.addColorStop(0, `${accent}55`);
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = accent;
  ctx.font = `700 40px ${font}`;
  ctx.fillText("⚡ ENERGY HUNTER", 80, 120);

  ctx.fillStyle = "#f1f3f7";
  ctx.font = `700 96px ${font}`;
  ctx.fillText(s.name.slice(0, 18), 80, 300);
  ctx.fillStyle = accent;
  ctx.font = `600 52px ${font}`;
  ctx.fillText(s.rank, 80, 380);

  const rows: [string, string][] = [
    ["Выпито банок", String(s.drank)],
    ["Кофеин, мг", String(s.caffeine)],
    ["Сахар, г", String(s.sugar)],
    ["Средняя оценка", s.avg.toFixed(1)],
    ["Потрачено, ₽", String(s.spent)],
  ];
  rows.forEach(([label, value], i) => {
    const y = 520 + i * 150;
    ctx.fillStyle = "#14161c";
    ctx.beginPath();
    ctx.roundRect(80, y - 80, W - 160, 120, 28);
    ctx.fill();
    ctx.fillStyle = "#8b919d";
    ctx.font = `500 36px ${font}`;
    ctx.fillText(label, 120, y - 8);
    ctx.fillStyle = "#f1f3f7";
    ctx.font = `700 56px ${font}`;
    ctx.textAlign = "right";
    ctx.fillText(value, W - 120, y - 2);
    ctx.textAlign = "left";
  });

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}

/** Системное «Поделиться» с файлом, иначе — скачивание PNG. */
export async function shareStatsCard(s: ShareStats): Promise<"shared" | "downloaded"> {
  const blob = await renderShareCard(s);
  const file = new File([blob], "energy-hunter.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Моя статистика Energy Hunter" });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "shared";
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "energy-hunter.png";
  a.click();
  URL.revokeObjectURL(a.href);
  return "downloaded";
}
