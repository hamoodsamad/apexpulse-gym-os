export function renderRevenueBarChart(
  canvas: HTMLCanvasElement,
  series: Array<{ month: string; amount: number }>,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(rect.width, 320);
  const height = Math.max(rect.height, 200);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  const padLeft = 56;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxVal = Math.max(...series.map((s) => s.amount), 100);

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = "#64748b";
  ctx.textAlign = "right";

  for (let i = 0; i <= 4; i += 1) {
    const ratio = i / 4;
    const y = padTop + plotH - ratio * plotH;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    const labelVal = Math.round(maxVal * ratio);
    ctx.fillText(`$${labelVal}`, padLeft - 8, y + 4);
  }

  const slotW = plotW / Math.max(series.length, 1);
  const barW = Math.min(44, slotW * 0.56);

  ctx.textAlign = "center";
  series.forEach((pt, idx) => {
    const barH = (pt.amount / maxVal) * plotH;
    const x = padLeft + idx * slotW + (slotW - barW) / 2;
    const y = padTop + plotH - barH;

    ctx.fillStyle = "#0f766e";
    ctx.fillRect(x, y, barW, Math.max(barH, 2));

    ctx.fillStyle = "#475569";
    ctx.font = '11px "Public Sans", sans-serif';
    ctx.fillText(pt.month, x + barW / 2, height - 10);
  });
}

export function renderAttendanceBarChart(
  canvas: HTMLCanvasElement,
  series: Array<{ date: string; valid: number; denied: number }>,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(rect.width, 320);
  const height = Math.max(rect.height, 200);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  const padLeft = 40;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxVal = Math.max(...series.map((s) => s.valid + s.denied), 5);

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = "#64748b";
  ctx.textAlign = "right";

  for (let i = 0; i <= 4; i += 1) {
    const ratio = i / 4;
    const y = padTop + plotH - ratio * plotH;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    ctx.fillText(String(Math.round(maxVal * ratio)), padLeft - 8, y + 4);
  }

  const slotW = plotW / Math.max(series.length, 1);
  const barW = Math.min(24, slotW * 0.6);

  ctx.textAlign = "center";
  series.forEach((pt, idx) => {
    const validH = (pt.valid / maxVal) * plotH;
    const deniedH = (pt.denied / maxVal) * plotH;
    const x = padLeft + idx * slotW + (slotW - barW) / 2;

    const validY = padTop + plotH - validH;
    ctx.fillStyle = "#16a34a";
    ctx.fillRect(x, validY, barW, validH);

    if (deniedH > 0) {
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(x, validY - deniedH, barW, deniedH);
    }

    if (idx % 2 === 0 || series.length <= 7) {
      ctx.fillStyle = "#475569";
      ctx.font = '10.5px "Public Sans", sans-serif';
      ctx.fillText(pt.date.slice(5), x + barW / 2, height - 10);
    }
  });
}
