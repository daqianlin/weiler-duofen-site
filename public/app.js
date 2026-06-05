const state = {
  data: null,
  strategyKey: "weiler",
  resultFilter: "all",
  yearFilter: "all",
  points: [],
  hoverIndex: null,
};

const chart = document.querySelector("#navChart");
const tooltip = document.querySelector("#chartTooltip");
const ctx = chart.getContext("2d");

const formatPercent = (value, digits = 2) => `${Number(value).toFixed(digits)}%`;
const formatNet = (value) => Number(value).toFixed(4);
const dateText = (value) => value.replaceAll("-", "/");
const hexToRgba = (hex, alpha) => {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

function getStrategy() {
  return state.data.strategies[state.strategyKey];
}

function setText(id, value) {
  document.querySelector(`#${id}`).textContent = value;
}

function setActiveButtons() {
  document.querySelectorAll("[data-strategy-switch]").forEach((button) => {
    button.classList.toggle("active", button.dataset.strategySwitch === state.strategyKey);
  });
  document.querySelectorAll("[data-signal-panel]").forEach((panel) => {
    const isActive = panel.dataset.signalPanel === state.strategyKey;
    panel.classList.toggle("active-signal", isActive);
    panel.setAttribute("aria-hidden", String(!isActive));
  });
}

function hydrateLatest() {
  const { latest, meta } = state.data;
  setText("updatedAt", `更新至 ${dateText(meta.updatedAt)}`);
  setText("statsUpdatedAt", dateText(meta.updatedAt));
  setText("weilerStatus", latest.weiler.status);
  setText("weilerEntered", dateText(latest.weiler.enteredAt));
  setText("weilerSuggestion", latest.weiler.suggestion);
  setText("duofenStatus", latest.duofen.status);
  setText("duofenEntered", dateText(latest.duofen.enteredAt));
  setText("duofenSuggestion", latest.duofen.suggestion);
  setText("disclaimer", meta.disclaimer);
}

function hydrateVisitStats() {
  try {
    const key = "weiler-duofen-local-visits";
    const visits = Number(localStorage.getItem(key) || 0) + 1;
    localStorage.setItem(key, String(visits));
    setText("localVisitCount", visits.toLocaleString("zh-CN"));
  } catch (error) {
    setText("localVisitCount", "1");
  }

  window.setTimeout(() => {
    ["busuanzi_value_site_pv", "busuanzi_value_site_uv"].forEach((id) => {
      const el = document.querySelector(`#${id}`);
      if (el && el.textContent.trim() === "--") {
        el.textContent = "统计中";
      }
    });
  }, 2600);
}

function hydrateMetrics() {
  const strategy = getStrategy();
  const metrics = strategy.metrics;
  setText("chartTitle", `${strategy.name} · ${strategy.style}`);
  setText("strategyName", `${strategy.name}（${strategy.benchmark}）`);
  setText("strategyDescription", strategy.description);
  setText("metricReturn", formatPercent(metrics.cumulativeReturnPct));
  setText("metricNet", formatNet(metrics.finalNet));
  setText("metricWinRate", formatPercent(metrics.winRatePct));
  setText("metricDrawdown", formatPercent(metrics.maxDrawdownPct));
  setText("metricTrades", `${metrics.tradeCount} 次`);
  setText("metricHolding", `${metrics.avgHoldingDays} 天`);
  setText("bestTrade", formatPercent(metrics.bestTrade.returnPct));
  setText("bestTradeDate", `${dateText(metrics.bestTrade.buyDate)} 至 ${dateText(metrics.bestTrade.sellDate)}`);
  setText("worstTrade", formatPercent(metrics.worstTrade.returnPct));
  setText("worstTradeDate", `${dateText(metrics.worstTrade.buyDate)} 至 ${dateText(metrics.worstTrade.sellDate)}`);
}

function populateYearFilter() {
  const select = document.querySelector("#yearFilter");
  const current = select.value;
  select.innerHTML = '<option value="all">全部</option>';
  const years = [...new Set(getStrategy().trades.map((trade) => trade.buyDate.slice(0, 4)))].reverse();
  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    select.append(option);
  });
  select.value = years.includes(current) ? current : "all";
  state.yearFilter = select.value;
}

function filteredTrades() {
  return getStrategy()
    .trades.slice()
    .reverse()
    .filter((trade) => state.resultFilter === "all" || trade.result === state.resultFilter)
    .filter((trade) => state.yearFilter === "all" || trade.buyDate.startsWith(state.yearFilter));
}

function renderTrades() {
  const rows = document.querySelector("#tradeRows");
  const cards = document.querySelector("#tradeCards");
  const trades = filteredTrades();
  rows.innerHTML = "";
  cards.innerHTML = "";

  trades.forEach((trade) => {
    const resultClass = trade.result === "盈利" ? "win" : "loss";
    const valueClass = trade.return >= 0 ? "positive" : "negative";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${dateText(trade.buyDate)}</td>
      <td>${dateText(trade.sellDate)}</td>
      <td class="${valueClass}">${formatPercent(trade.returnPct)}</td>
      <td>${formatNet(trade.net)}</td>
      <td><span class="tag ${resultClass}">${trade.result}</span></td>
    `;
    rows.append(row);

    const card = document.createElement("article");
    card.className = "trade-card";
    card.innerHTML = `
      <div class="trade-card-top">
        <strong class="${valueClass}">${formatPercent(trade.returnPct)}</strong>
        <span class="tag ${resultClass}">${trade.result}</span>
      </div>
      <div class="trade-card-grid">
        <span>${dateText(trade.buyDate)} 至 ${dateText(trade.sellDate)}</span>
        <span>净值 ${formatNet(trade.net)}</span>
      </div>
    `;
    cards.append(card);
  });
}

function scaleCanvas() {
  const rect = chart.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  chart.width = Math.round(rect.width * ratio);
  chart.height = Math.round(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return rect;
}

function makeMergedSeries() {
  const strategy = getStrategy();
  const nav = strategy.nav.filter((x) => x.date !== "start");
  const benchmark = strategy.benchmarkSeries;
  const length = Math.min(nav.length, benchmark.length);
  return nav.slice(-length).map((item, index) => ({
    date: item.date,
    nav: item.value,
    benchmark: benchmark[index]?.value ?? null,
  }));
}

function drawLine(points, getValue, color, area, width, bounds, plot) {
  const values = points.map(getValue).filter((value) => value !== null);
  const min = bounds.min;
  const max = bounds.max;
  const xFor = (index) => plot.x + (index / Math.max(points.length - 1, 1)) * plot.w;
  const yFor = (value) => plot.y + plot.h - ((value - min) / (max - min || 1)) * plot.h;

  ctx.beginPath();
  points.forEach((point, index) => {
    const value = getValue(point);
    const x = xFor(index);
    const y = yFor(value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  if (area) {
    ctx.lineTo(xFor(points.length - 1), plot.y + plot.h);
    ctx.lineTo(xFor(0), plot.y + plot.h);
    ctx.closePath();
    const fill = ctx.createLinearGradient(0, plot.y, 0, plot.y + plot.h);
    fill.addColorStop(0, area);
    fill.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

function pointPosition(index, value, bounds, plot) {
  return {
    x: plot.x + (index / Math.max(state.points.length - 1, 1)) * plot.w,
    y: plot.y + plot.h - ((value - bounds.min) / (bounds.max - bounds.min || 1)) * plot.h,
  };
}

function drawHoverMarker(points, bounds, plot) {
  if (state.hoverIndex === null || !points[state.hoverIndex]) return;
  const strategy = getStrategy();
  const point = points[state.hoverIndex];
  const position = pointPosition(state.hoverIndex, point.nav, bounds, plot);

  ctx.save();
  ctx.beginPath();
  ctx.arc(position.x, position.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = strategy.color;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(position.x, position.y, 10, 0, Math.PI * 2);
  ctx.strokeStyle = hexToRgba(strategy.color, 0.34);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawChart() {
  if (!state.data) return;
  const rect = scaleCanvas();
  const strategy = getStrategy();
  const points = makeMergedSeries();
  state.points = points;
  const isSmall = rect.width < 560;
  const plot = {
    x: isSmall ? 38 : 56,
    y: 22,
    w: rect.width - (isSmall ? 52 : 78),
    h: rect.height - 84,
  };
  const allValues = points.flatMap((point) => [point.nav, point.benchmark].filter(Boolean));
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const pad = (rawMax - rawMin) * 0.12 || 1;
  const bounds = { min: Math.max(0, rawMin - pad), max: rawMax + pad };

  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = "#fbfcfd";
  ctx.fillRect(0, 0, rect.width, rect.height);

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#64748b";
  ctx.font = "12px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  for (let i = 0; i <= 4; i += 1) {
    const y = plot.y + (plot.h / 4) * i;
    const value = bounds.max - ((bounds.max - bounds.min) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.w, y);
    ctx.stroke();
    ctx.fillText(value.toFixed(value > 10 ? 0 : 1), 4, y + 4);
  }

  drawLine(points, (point) => point.benchmark, "#9aa9b8", "rgba(154,169,184,0.18)", 2, bounds, plot);
  drawLine(points, (point) => point.nav, strategy.color, hexToRgba(strategy.color, 0.12), 3, bounds, plot);
  drawHoverMarker(points, bounds, plot);

  const labelCount = isSmall ? 3 : 5;
  ctx.fillStyle = "#64748b";
  for (let i = 0; i < labelCount; i += 1) {
    const index = Math.round((points.length - 1) * (i / Math.max(labelCount - 1, 1)));
    const x = plot.x + (index / Math.max(points.length - 1, 1)) * plot.w;
    ctx.fillText(points[index].date.slice(0, 4), x - 14, plot.y + plot.h + 24);
  }

  const legendY = rect.height - 18;
  ctx.fillStyle = strategy.color;
  ctx.fillRect(plot.x, legendY - 9, 18, 4);
  ctx.fillStyle = "#334155";
  ctx.fillText(`${strategy.shortName}净值`, plot.x + 26, legendY - 5);
  ctx.fillStyle = "#9aa9b8";
  ctx.fillRect(plot.x + 112, legendY - 9, 18, 4);
  ctx.fillStyle = "#334155";
  ctx.fillText(strategy.benchmark, plot.x + 138, legendY - 5);

  chart.dataset.plot = JSON.stringify({ ...plot, min: bounds.min, max: bounds.max });
}

function showTooltip(event) {
  const rect = chart.getBoundingClientRect();
  const plot = JSON.parse(chart.dataset.plot || "{}");
  if (!plot.w || !state.points.length) return;
  const x = event.clientX - rect.left;
  if (x < plot.x || x > plot.x + plot.w) {
    tooltip.hidden = true;
    return;
  }
  const index = Math.max(
    0,
    Math.min(state.points.length - 1, Math.round(((x - plot.x) / plot.w) * (state.points.length - 1))),
  );
  state.hoverIndex = index;
  drawChart();
  const point = state.points[index];
  const pointX = plot.x + (index / Math.max(state.points.length - 1, 1)) * plot.w;
  tooltip.hidden = false;
  tooltip.style.left = `${pointX + 16}px`;
  tooltip.style.top = `${event.clientY - rect.top}px`;
  tooltip.innerHTML = `
    <strong>${dateText(point.date)}</strong>
    <span>${getStrategy().shortName}净值：${formatNet(point.nav)}</span>
    <span>${getStrategy().benchmark}：${formatNet(point.benchmark)}</span>
  `;
}

function hideTooltip() {
  state.hoverIndex = null;
  drawChart();
  tooltip.hidden = true;
}

function switchStrategy(key) {
  state.strategyKey = key;
  setActiveButtons();
  populateYearFilter();
  hydrateMetrics();
  renderTrades();
  drawChart();
}

function restoreHashPosition() {
  if (!window.location.hash) return;
  const target = document.querySelector(window.location.hash);
  if (!target) return;
  requestAnimationFrame(() => {
    target.scrollIntoView({ block: "start" });
  });
}

async function init() {
  const response = await fetch("./public/data/site-data.json");
  state.data = await response.json();
  hydrateLatest();
  hydrateVisitStats();
  setActiveButtons();
  hydrateMetrics();
  populateYearFilter();
  renderTrades();
  drawChart();
  restoreHashPosition();
}

document.querySelectorAll("[data-strategy-switch]").forEach((button) => {
  button.addEventListener("click", () => switchStrategy(button.dataset.strategySwitch));
});

document.querySelector("#resultFilter").addEventListener("change", (event) => {
  state.resultFilter = event.target.value;
  renderTrades();
});

document.querySelector("#yearFilter").addEventListener("change", (event) => {
  state.yearFilter = event.target.value;
  renderTrades();
});

chart.addEventListener("mousemove", showTooltip);
chart.addEventListener("touchmove", (event) => showTooltip(event.touches[0]), { passive: true });
chart.addEventListener("mouseleave", hideTooltip);
chart.addEventListener("touchend", hideTooltip);
window.addEventListener("resize", drawChart);
window.addEventListener("hashchange", restoreHashPosition);

init();
