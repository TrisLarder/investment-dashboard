const fmt = (value, digits = 2) => value == null ? "—" : Number(value).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
const direction = value => value == null ? "flat" : value > 0 ? "up" : value < 0 ? "down" : "flat";
const signed = (value, suffix = "%", digits = 2) => value == null ? "—" : `${value > 0 ? "+" : ""}${fmt(value, digits)}${suffix}`;
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
let DATA = null;

function valueText(metric) {
  if (!metric || metric.value == null) return "—";
  if (metric.kind === "yield") return `${fmt(metric.value, metric.decimals ?? 2)}%`;
  if (metric.kind === "spread") return metric.suffix ? `${fmt(metric.value, metric.decimals ?? 0)}${metric.suffix}` : `${fmt(metric.value, metric.decimals ?? 2)}%`;
  if (metric.kind === "position") return fmt(metric.value, 0);
  if (metric.prefix) return `${metric.prefix}${fmt(metric.value, metric.decimals ?? 2)}`;
  return `${fmt(metric.value, metric.decimals ?? 2)}${metric.suffix || ""}`;
}

function availability(metric) {
  if (!metric || metric.value == null) return "unavailable";
  if (metric.stale) return "stale";
  if (metric.proxy) return "proxy";
  return "current";
}

function metricCard(metric) {
  if (!metric) return "";
  const state = availability(metric);
  const stateLabel = state === "current" ? "" : `<span class="data-state ${state}">${state}</span>`;
  return `<article class="metric ${state}">
    <div class="metric-top"><div class="label">${escapeHtml(metric.label)}</div>${stateLabel}</div>
    <div class="value">${valueText(metric)}</div>
    <div class="moves"><span class="${direction(metric.change_1d)}">1D ${signed(metric.change_1d, metric.change_unit || "%")}</span><span class="${direction(metric.change_5d)}">5D ${signed(metric.change_5d, metric.change_unit || "%")}</span></div>
    <div class="source" title="${escapeHtml(metric.feed_error || metric.source || "")}">${escapeHtml(metric.date || "Unavailable")}</div>
  </article>`;
}

function renderHead() {
  document.querySelector("#headline-grid").innerHTML = (DATA.headline || []).map(key => metricCard(DATA.series[key])).join("");
  document.querySelector("#asof").textContent = `Updated ${DATA.generated_at || "—"}`;
  document.querySelector("#build-id").textContent = DATA.build || "";
  const status = document.querySelector("#market-status");
  status.textContent = DATA.market_status || "Latest available";
  status.className = `pill ${(DATA.feed_health || []).some(feed => feed.status === "error") ? "arm" : "normal"}`;
}

function statusClass(status) {
  const normalised = (status || "").toLowerCase();
  return ["normal", "arm", "confirm", "fire", "supportive", "tightening"].includes(normalised) ? normalised : "neutral";
}

function renderSignals() {
  for (const key of ["real_estate", "carry"]) {
    const signal = DATA.signals?.[key];
    if (!signal) continue;
    const prefix = key === "real_estate" ? "re" : "carry";
    const badge = document.querySelector(`#${prefix}-signal`);
    badge.textContent = signal.status;
    badge.className = `pill ${statusClass(signal.status)}`;
    document.querySelector(`#${prefix}-summary`).textContent = signal.summary;
    document.querySelector(`#${prefix}-drivers`).innerHTML = (signal.drivers || []).map(driver => `<div class="mini"><span class="k">${escapeHtml(driver.label)}</span><span class="v">${escapeHtml(driver.value)}</span></div>`).join("");
  }
}

function tableFor(section) {
  const rows = (DATA.sections?.[section] || []).map(key => DATA.series[key]).filter(Boolean).map(metric => {
    const state = availability(metric);
    const detail = metric.expiry ? ` · exp ${metric.expiry}` : "";
    return `<tr class="${state}">
      <td><strong>${escapeHtml(metric.label)}</strong><br><span class="source">${escapeHtml(metric.source || "")}${escapeHtml(detail)}</span></td>
      <td>${valueText(metric)}</td>
      <td class="${direction(metric.change_1d)}">${signed(metric.change_1d, metric.change_unit || "%")}</td>
      <td class="${direction(metric.change_5d)}">${signed(metric.change_5d, metric.change_unit || "%")}</td>
      <td>${escapeHtml(metric.signal || (metric.proxy ? "PROXY" : "—"))}</td>
      <td><span class="observation ${state}" title="${escapeHtml(metric.feed_error || "")}">${escapeHtml(metric.date || "Unavailable")}</span></td>
    </tr>`;
  }).join("");
  return `<div class="table-wrap"><table><thead><tr><th>Indicator</th><th>Level</th><th>1D</th><th>5D</th><th>Signal</th><th>Observation</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderTab(tab) {
  document.querySelector("#tab-content").innerHTML = tableFor(tab);
  document.querySelectorAll(".tab").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
}

async function boot() {
  try {
    const response = await fetch(`data/latest.json?v=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    DATA = await response.json();
    renderHead();
    renderSignals();
    renderTab("rates");
    document.querySelectorAll(".tab").forEach(button => button.addEventListener("click", () => renderTab(button.dataset.tab)));
  } catch (error) {
    const status = document.querySelector("#market-status");
    status.textContent = "Data unavailable";
    status.className = "pill fire";
    document.querySelector("#asof").textContent = "Check the updater workflow";
  }
}

boot();
