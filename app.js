/* ═══════════════════════════════════════════════════════════════
   PremValue — app.js  v2  (Finance + Value + Clubs expansion)
   ═══════════════════════════════════════════════════════════════ */

Chart.defaults.color       = "#94a3b8";
Chart.defaults.borderColor = "rgba(255,255,255,0.06)";
Chart.defaults.font.family = "'Inter', sans-serif";

const C = {
  purple:"#8b5cf6", purpleLt:"#a78bfa", cyan:"#22d3ee",
  pink:"#ec4899",   green:"#10b981",    yellow:"#f59e0b",
  red:"#ef4444",    blue:"#3b82f6",     orange:"#f97316",
};

// ── Team metadata (color · emoji · crest) ────────────────────
const TEAM = {
  "Liverpool":               { color:"#c8102e", bg:"#1a0508", emoji:"🔴", crest:"https://crests.football-data.org/64.png"  },
  "Arsenal":                 { color:"#ef0107", bg:"#1a0001", emoji:"🔴", crest:"https://crests.football-data.org/57.png"  },
  "Manchester City":         { color:"#6cabdd", bg:"#051520", emoji:"🩵", crest:"https://crests.football-data.org/65.png"  },
  "Chelsea":                 { color:"#034694", bg:"#010b1a", emoji:"🔵", crest:"https://crests.football-data.org/61.png"  },
  "Newcastle United":        { color:"#241f20", bg:"#0a0a0a", emoji:"⚫", crest:"https://crests.football-data.org/67.png"  },
  "Aston Villa":             { color:"#95bfe5", bg:"#0d0515", emoji:"💜", crest:"https://crests.football-data.org/58.png"  },
  "Nottingham Forest":       { color:"#dd0000", bg:"#190000", emoji:"🌳", crest:"https://crests.football-data.org/351.png" },
  "Bournemouth":             { color:"#da291c", bg:"#190100", emoji:"🍒", crest:"https://crests.football-data.org/1044.png"},
  "Brighton & Hove Albion":  { color:"#0057b8", bg:"#010e20", emoji:"🔵", crest:"https://crests.football-data.org/397.png" },
  "Tottenham Hotspur":       { color:"#132257", bg:"#060b1a", emoji:"⚪", crest:"https://crests.football-data.org/73.png"  },
  "Brentford":               { color:"#e30613", bg:"#190001", emoji:"🐝", crest:"https://crests.football-data.org/402.png" },
  "Fulham":                  { color:"#cccccc", bg:"#0d0d0d", emoji:"⚪", crest:"https://crests.football-data.org/63.png"  },
  "Wolverhampton Wanderers": { color:"#fdb913", bg:"#191100", emoji:"🟡", crest:"https://crests.football-data.org/76.png"  },
  "Manchester United":       { color:"#da291c", bg:"#190100", emoji:"🔴", crest:"https://crests.football-data.org/66.png"  },
  "West Ham United":         { color:"#7a263a", bg:"#0f0409", emoji:"🟣", crest:"https://crests.football-data.org/563.png" },
  "Crystal Palace":          { color:"#1b458f", bg:"#020917", emoji:"🦅", crest:"https://crests.football-data.org/354.png" },
  "Everton":                 { color:"#003399", bg:"#000a1a", emoji:"🔵", crest:"https://crests.football-data.org/62.png"  },
  "Leicester City":          { color:"#003090", bg:"#000a1a", emoji:"🦊", crest:"https://crests.football-data.org/338.png" },
  "Ipswich Town":            { color:"#003594", bg:"#000a1a", emoji:"🔵", crest:"https://crests.football-data.org/349.png" },
  "Southampton":             { color:"#d71920", bg:"#190001", emoji:"🔴", crest:"https://crests.football-data.org/340.png" },
};
const tc  = n => TEAM[n]?.color  || C.purple;
const tbg = n => TEAM[n]?.bg     || "#0d0d1c";
const te  = n => TEAM[n]?.emoji  || "⚽";
const tCrest = n => TEAM[n]?.crest || "";

const SHORT = {
  "Liverpool":"Liverpool","Arsenal":"Arsenal","Manchester City":"Man City",
  "Chelsea":"Chelsea","Newcastle United":"Newcastle","Aston Villa":"Aston Villa",
  "Nottingham Forest":"Nott'm Forest","Bournemouth":"Bournemouth",
  "Brighton & Hove Albion":"Brighton","Tottenham Hotspur":"Spurs",
  "Brentford":"Brentford","Fulham":"Fulham",
  "Wolverhampton Wanderers":"Wolves","Manchester United":"Man Utd",
  "West Ham United":"West Ham","Crystal Palace":"C. Palace",
  "Everton":"Everton","Leicester City":"Leicester",
  "Ipswich Town":"Ipswich","Southampton":"Southampton",
};
const sn = n => SHORT[n] || n;

// Build a crest <img> element (with emoji fallback)
function crestImg(team, size = 24) {
  const url = tCrest(team);
  if (!url) return `<span style="font-size:${size * 0.6}px">${te(team)}</span>`;
  return `<img src="${url}" alt="${team}" width="${size}" height="${size}"
    style="object-fit:contain;vertical-align:middle;margin-right:6px;border-radius:3px"
    onerror="this.style.display='none';this.nextSibling.style.display='inline'">
    <span style="display:none;font-size:${size * 0.5}px">${te(team)}</span>`;
}

// Player initials avatar
function playerAvatar(name, club, size = 48) {
  const parts = name.split(" ");
  const init  = (parts[0][0] + (parts[parts.length - 1][0] || "")).toUpperCase();
  const col   = tc(club);
  const bg    = col + "33";
  return `<div class="p-avatar" style="width:${size}px;height:${size}px;background:${bg};border:2px solid ${col};font-size:${size * 0.35}px;color:${col}">${init}</div>`;
}

// Position icon & label
const POS_ICON  = { FW:"⚽", MF:"🔀", DF:"🛡️", GK:"🧤", CB:"🛡️" };
const POS_LABEL = { FW:"Forward", MF:"Midfielder", DF:"Defender", GK:"Goalkeeper", CB:"Defender" };
const posIcon   = p => POS_ICON[p]  || "⚽";
const posLabel  = p => POS_LABEL[p] || p;

// ── Chart registry ────────────────────────────────────────────
const charts = {};
function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

// ── State ─────────────────────────────────────────────────────
let DATA = {};
let activeSection = "overview";
let selectedTeam = "";
let financeSort = { key: "value_rank", direction: "asc" };
let tacticsTeams = ["Liverpool", "Arsenal"];
let playerFilters = {
  search: "", club: "all", position: "all", age: "all",
  minMinutes: 500, valuation: "all", bargainOnly: false,
};
let xiSettings = { formation: "4-3-3", minMinutes: 900, maxValue: "", maxPerClub: 3 };
const DEFAULT_VALUE_POLICY = {
  explorer_min_minutes: 500,
  featured_min_minutes: 900,
  valuation_stale_days: 180,
};

const valuePolicy = () => ({ ...DEFAULT_VALUE_POLICY, ...(DATA._meta?.player_value_policy || {}) });
const financeSource = id => (DATA.finance_sources || []).find(source => source.id === id);
const hasFreshValue = p => p.market_value_m > 0 && p.valuation_status === "fresh";
const isExplorerEligible = p => p.mins >= valuePolicy().explorer_min_minutes && p.market_value_m > 0;
const isFeaturedEligible = p => p.mins >= valuePolicy().featured_min_minutes && hasFreshValue(p);
const teamMetric = team => (DATA.team_metrics || []).find(metric => metric.team === team);
const standingFor = team => (DATA.standings || []).find(standing => standing.team === team);
const squadFor = team => (DATA.squads || []).find(squad => squad.team === team);
const financeFor = team => (DATA.finances || []).find(finance => finance.team === team);
const squadValuationFor = team => (DATA.squad_valuations || []).find(value => value.team === team);
const fmt = (value, digits = 1) => Number(value).toFixed(digits);
const signed = (value, digits = 1) => `${value > 0 ? "+" : ""}${fmt(value, digits)}`;
const encodedTeam = team => encodeURIComponent(team);

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const requestedSection = params.get("section");
  if (["overview", "attack", "defence", "standings", "tactics", "finance", "value", "clubs", "xi", "facts"].includes(requestedSection)) {
    activeSection = requestedSection;
  }
  selectedTeam = params.get("team") || "";
  playerFilters = {
    search: params.get("search") || "",
    club: params.get("club") || "all",
    position: params.get("position") || "all",
    age: params.get("age") || "all",
    minMinutes: Number(params.get("mins") || 500),
    valuation: params.get("valuation") || "all",
    bargainOnly: params.get("bargains") === "1",
  };
  xiSettings = {
    formation: params.get("formation") || "4-3-3",
    minMinutes: Number(params.get("xiMins") || 900),
    maxValue: params.get("budget") || "",
    maxPerClub: Number(params.get("clubLimit") || 3),
  };
}

function syncUrlState() {
  const params = new URLSearchParams();
  if (activeSection !== "overview") params.set("section", activeSection);
  if (selectedTeam) params.set("team", selectedTeam);
  if (playerFilters.search) params.set("search", playerFilters.search);
  if (playerFilters.club !== "all") params.set("club", playerFilters.club);
  if (playerFilters.position !== "all") params.set("position", playerFilters.position);
  if (playerFilters.age !== "all") params.set("age", playerFilters.age);
  if (playerFilters.minMinutes !== 500) params.set("mins", playerFilters.minMinutes);
  if (playerFilters.valuation !== "all") params.set("valuation", playerFilters.valuation);
  if (playerFilters.bargainOnly) params.set("bargains", "1");
  if (xiSettings.formation !== "4-3-3") params.set("formation", xiSettings.formation);
  if (xiSettings.minMinutes !== 900) params.set("xiMins", xiSettings.minMinutes);
  if (xiSettings.maxValue) params.set("budget", xiSettings.maxValue);
  if (xiSettings.maxPerClub !== 3) params.set("clubLimit", xiSettings.maxPerClub);
  const query = params.toString();
  history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
}

function confidenceBadge(source) {
  if (!source) return "";
  return `<span class="confidence-badge confidence-${source.confidence}" title="${source.notes}">
    ${source.confidence} confidence
  </span>`;
}

function sourceLink(source, label) {
  if (!source) return "";
  return `<a class="source-link" href="${source.source_url}" target="_blank"
    rel="noopener noreferrer" title="${source.notes}">${label || source.source_name}</a>`;
}

function valuationBadge(player) {
  const status = player.valuation_status || "missing";
  const title = player.valuation_date
    ? `${player.valuation_date} · ${player.valuation_age_days} days before cutoff`
    : "No published valuation date";
  return `<span class="valuation-badge valuation-${status}" title="${title}">${status}</span>`;
}

// ── Load generated dashboard bundle ───────────────────────────
async function loadAll() {
  try {
    if (window.INLINE_DATA) {
      DATA = window.INLINE_DATA;
    } else {
      const res = await fetch("data/dashboard.json");
      if (!res.ok) throw new Error("dashboard");
      DATA = await res.json();
    }
    init();
  } catch (err) {
    console.error("Data load failed:", err);
    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;
      min-height:100vh;font-family:Inter,sans-serif;color:#a78bfa;background:#07070f;
      flex-direction:column;gap:1rem">
      <div style="font-size:3rem">⚠️</div><h2>Data load failed</h2>
      <p style="color:#64748b">Error: ${err.message}</p></div>`;
  }
}

function init() {
  readUrlState();
  renderKPIs();
  renderHeroChips();
  renderStandingsTable();
  renderScorersTable();
  renderGKTable();
  renderFacts();
  renderWageGrid();
  renderFinanceMethodology();
  renderDataHealth();
  renderValuationDiscrepancies();
  renderTacticControls();
  renderTeamEfficiencyTable();
  renderPlayerControls();
  renderClubs();
  renderXiControls();
  renderXi();
  showSection(activeSection, { scroll: false });
}

/* ════════════════════════════════════════════════════════════
   KPIs & HERO
   ════════════════════════════════════════════════════════════ */
function renderKPIs() {
  const s   = DATA.standings;
  const champ = s[0];
  const topScorer = DATA.scorers[0];
  const relegated = s.slice(-3).map(t => sn(t.team)).join(", ");
  const totalGoals = s.reduce((a, t) => a + t.GF, 0);

  const kpis = [
    {
      icon: crestImg(champ.team, 32), value: sn(champ.team),
      label: "2024–2025 Champions", sub: `${champ.Pts} points · ${champ.W}W ${champ.D}D ${champ.L}L`,
      accent: `linear-gradient(90deg,${C.yellow},${C.green})`
    },
    {
      icon: "👟", value: `${topScorer.goals} Goals`,
      label: `Golden Boot — ${topScorer.player}`, sub: `${topScorer.club} · ${topScorer.apps} apps`,
      accent: `linear-gradient(90deg,${C.purple},${C.pink})`
    },
    {
      icon: "⚽", value: totalGoals.toLocaleString(),
      label: "Total Goals Scored", sub: `${DATA.facts["Average goals per match"]} per match avg`,
      accent: `linear-gradient(90deg,${C.cyan},${C.purple})`
    },
    {
      icon: "📉", value: "3 Clubs",
      label: "Relegated", sub: relegated,
      accent: `linear-gradient(90deg,${C.red},${C.pink})`
    },
  ];

  document.getElementById("kpiGrid").innerHTML = kpis.map((k, i) => `
    <div class="kpi-card" style="--kpi-accent:${k.accent};animation-delay:${i * 0.07}s">
      <div class="kpi-icon">${k.icon}</div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join("");
}

function renderHeroChips() {
  const f = DATA.facts;
  const chips = [
    { label: "Season",        val: f["Season dates"]          || "Aug 2024 – May 2025" },
    { label: "Matches",       val: f["Total matches played"]  || "380"                 },
    { label: "Avg Attendance",val: f["Average attendance"]    || "40,423"              },
  ];
  document.getElementById("heroChips").innerHTML = chips.map(c =>
    `<span class="chip">${c.label}: <strong>${c.val}</strong></span>`
  ).join("");
}

/* ════════════════════════════════════════════════════════════
   SECTION NAVIGATION
   ════════════════════════════════════════════════════════════ */
function showSection(name, { scroll = true } = {}) {
  activeSection = name;
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  document.getElementById(`section${cap}`)?.classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b => {
    const isActive = b.dataset.section === name;
    b.classList.toggle("active", isActive);
    b.setAttribute("aria-pressed", String(isActive));
  });
  renderAllCharts();
  syncUrlState();
  if (scroll) document.querySelector(".main")?.scrollIntoView({ behavior: "smooth" });
}

function renderAllCharts() {
  if (activeSection === "overview")  { renderOverviewPts(); renderOverviewGFGA(); renderOverviewWDL(); }
  if (activeSection === "attack")    { renderAttackScorers(); renderAttackAssists(); renderAttackTeamGoals(); }
  if (activeSection === "defence")   { renderDefGA(); renderDefCS(); renderDefScatter(); }
  if (activeSection === "tactics")   { renderTactics(); }
  if (activeSection === "finance")   { renderFinanceCharts(); }
  if (activeSection === "value")     { renderPlayerExplorer(); }
}

function renderTacticControls() {
  const options = (DATA.standings || []).map(team => `<option value="${team.team}">${team.team}</option>`).join("");
  const first = document.getElementById("tacticsTeamA");
  const second = document.getElementById("tacticsTeamB");
  if (!first || !second) return;
  first.innerHTML = options;
  second.innerHTML = options;
  first.value = tacticsTeams[0];
  second.value = tacticsTeams[1];
}

function renderTactics() {
  const first = document.getElementById("tacticsTeamA");
  const second = document.getElementById("tacticsTeamB");
  const body = document.getElementById("tacticsBody");
  if (!first || !second || !body) return;
  tacticsTeams = [first.value, second.value];
  const a = squadFor(first.value);
  const b = squadFor(second.value);
  if (!a || !b) return;
  const fields = [
    { key: "goals", label: "Goals", digits: 0 },
    { key: "xG", label: "Expected goals", digits: 1 },
    { key: "xGA", label: "Expected goals against", digits: 1, inverse: true },
    { key: "possession", label: "Possession %", digits: 1 },
    { key: "tackles", label: "Tackles won", digits: 0 },
    { key: "clean_sheets", label: "Clean sheets", digits: 0 },
    { key: "yellow_cards", label: "Yellow cards", digits: 0, inverse: true },
    { key: "performance_score", label: "Performance score", digits: 1 },
  ];
  const average = key => DATA.squads.reduce((sum, row) => sum + (row[key] || 0), 0) / DATA.squads.length;
  const maximum = key => Math.max(...DATA.squads.map(row => row[key] || 0));
  const normalized = (row, field) => {
    const max = maximum(field.key);
    if (!max || row[field.key] == null) return 0;
    const value = row[field.key] / max * 100;
    return field.inverse ? 100 - value : value;
  };
  document.getElementById("tacticsHeadA").textContent = a.team;
  document.getElementById("tacticsHeadB").textContent = b.team;
  body.innerHTML = fields.map(field => `
    <tr><td>${field.label}</td><td>${a[field.key] == null ? "–" : fmt(a[field.key], field.digits)}</td>
    <td>${b[field.key] == null ? "–" : fmt(b[field.key], field.digits)}</td>
    <td>${fmt(average(field.key), field.digits)}</td></tr>`).join("");
  destroyChart("cTactics");
  const ctx = document.getElementById("cTactics"); if (!ctx) return;
  charts["cTactics"] = new Chart(ctx, {
    type: "radar",
    data: {
      labels: fields.map(field => field.label),
      datasets: [
        { label: a.team, data: fields.map(field => normalized(a, field)), borderColor: tc(a.team), backgroundColor: tc(a.team) + "22", pointBackgroundColor: tc(a.team) },
        { label: b.team, data: fields.map(field => normalized(b, field)), borderColor: tc(b.team), backgroundColor: tc(b.team) + "22", pointBackgroundColor: tc(b.team) },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: "rgba(255,255,255,.12)" }, angleLines: { color: "rgba(255,255,255,.12)" } } },
      plugins: { legend: { labels: { color: "#94a3b8" } } },
    },
  });
}

/* ════════════════════════════════════════════════════════════
   OVERVIEW CHARTS
   ════════════════════════════════════════════════════════════ */
function renderOverviewPts() {
  destroyChart("cOverviewPts");
  const ctx = document.getElementById("cOverviewPts"); if (!ctx) return;
  const d = DATA.standings;
  charts["cOverviewPts"] = new Chart(ctx, {
    type: "bar", data: {
      labels: d.map(t => sn(t.team)),
      datasets: [{ label: "Points", data: d.map(t => t.Pts),
        backgroundColor: d.map(t => tc(t.team) + "cc"), borderColor: d.map(t => tc(t.team)),
        borderWidth: 1.5, borderRadius: 5, borderSkipped: false }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: "y",
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${c.parsed.x} pts  ·  ${d[c.dataIndex].W}W ${d[c.dataIndex].D}D ${d[c.dataIndex].L}L` } } },
      scales: { x: { grid: { color: "rgba(255,255,255,0.05)" }, min: 0, max: 90 },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } } }
    }
  });
}

function renderOverviewGFGA() {
  destroyChart("cOverviewGFGA");
  const ctx = document.getElementById("cOverviewGFGA"); if (!ctx) return;
  const d = DATA.standings;
  charts["cOverviewGFGA"] = new Chart(ctx, {
    type: "bar", data: {
      labels: d.map(t => sn(t.team)),
      datasets: [
        { label: "Goals For",     data: d.map(t => t.GF), backgroundColor: C.green + "bb", borderColor: C.green, borderWidth: 1, borderRadius: 3 },
        { label: "Goals Against", data: d.map(t => t.GA), backgroundColor: C.red   + "88", borderColor: C.red,   borderWidth: 1, borderRadius: 3 },
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: "y",
      plugins: { legend: { labels: { color: "#94a3b8", boxWidth: 10, font: { size: 11 } } } },
      scales: { x: { grid: { color: "rgba(255,255,255,0.05)" } }, y: { grid: { display: false }, ticks: { font: { size: 9 } } } }
    }
  });
}

function renderOverviewWDL() {
  destroyChart("cOverviewWDL");
  const ctx = document.getElementById("cOverviewWDL"); if (!ctx) return;
  const d = DATA.standings.slice(0, 10);
  charts["cOverviewWDL"] = new Chart(ctx, {
    type: "bar", data: {
      labels: d.map(t => sn(t.team)),
      datasets: [
        { label: "Wins",   data: d.map(t => t.W), backgroundColor: C.green  + "cc", borderColor: C.green,  borderWidth: 1, borderRadius: 3 },
        { label: "Draws",  data: d.map(t => t.D), backgroundColor: C.yellow + "aa", borderColor: C.yellow, borderWidth: 1, borderRadius: 3 },
        { label: "Losses", data: d.map(t => t.L), backgroundColor: C.red    + "99", borderColor: C.red,    borderWidth: 1, borderRadius: 3 },
      ]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#94a3b8", boxWidth: 10, font: { size: 11 } } } },
      scales: { x: { stacked: true, grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 40 } },
        y: { stacked: true, max: 38, grid: { color: "rgba(255,255,255,0.05)" } } }
    }
  });
}

/* ════════════════════════════════════════════════════════════
   ATTACK CHARTS
   ════════════════════════════════════════════════════════════ */
function renderAttackScorers() {
  destroyChart("cAttackScorers");
  const ctx = document.getElementById("cAttackScorers"); if (!ctx) return;
  const d = DATA.scorers.slice(0, 20);
  charts["cAttackScorers"] = new Chart(ctx, {
    type: "bar", data: {
      labels: d.map(p => p.player),
      datasets: [
        { label: "Goals",   data: d.map(p => p.goals),   backgroundColor: d.map(p => tc(p.club) + "cc"), borderColor: d.map(p => tc(p.club)), borderWidth: 1.5, borderRadius: 5, borderSkipped: false },
        { label: "Assists", data: d.map(p => p.assists),  backgroundColor: C.cyan + "66", borderColor: C.cyan, borderWidth: 1, borderRadius: 3, borderSkipped: false },
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: "y",
      plugins: { legend: { labels: { color: "#94a3b8", boxWidth: 10 } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${c.parsed.x}  (${d[c.dataIndex].club})` } } },
      scales: { x: { grid: { color: "rgba(255,255,255,0.05)" } }, y: { grid: { display: false }, ticks: { font: { size: 10.5 } } } }
    }
  });
}

function renderAttackAssists() {
  destroyChart("cAttackAssists");
  const ctx = document.getElementById("cAttackAssists"); if (!ctx) return;
  const d = DATA.assists.slice(0, 12);
  charts["cAttackAssists"] = new Chart(ctx, {
    type: "bar", data: {
      labels: d.map(p => p.player),
      datasets: [{ label: "Assists", data: d.map(p => p.assists),
        backgroundColor: d.map(p => tc(p.club) + "cc"), borderColor: d.map(p => tc(p.club)),
        borderWidth: 1.5, borderRadius: 5, borderSkipped: false }]
    },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: "y",
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => ` Assists: ${c.parsed.x}  (${d[c.dataIndex].club})` } } },
      scales: { x: { grid: { color: "rgba(255,255,255,0.05)" } }, y: { grid: { display: false }, ticks: { font: { size: 10.5 } } } }
    }
  });
}

function renderAttackTeamGoals() {
  destroyChart("cAttackTeamGoals");
  const ctx = document.getElementById("cAttackTeamGoals"); if (!ctx) return;
  const d = [...DATA.standings].sort((a, b) => b.GF - a.GF);
  charts["cAttackTeamGoals"] = new Chart(ctx, {
    type: "bar", data: {
      labels: d.map(t => sn(t.team)),
      datasets: [{ label: "Goals", data: d.map(t => t.GF),
        backgroundColor: d.map(t => tc(t.team) + "cc"), borderColor: d.map(t => tc(t.team)),
        borderWidth: 1.5, borderRadius: 4, borderSkipped: false }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.parsed.y} goals` } } },
      scales: { x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45 } },
        y: { grid: { color: "rgba(255,255,255,0.05)" } } }
    }
  });
}

/* ════════════════════════════════════════════════════════════
   DEFENCE CHARTS
   ════════════════════════════════════════════════════════════ */
function renderDefGA() {
  destroyChart("cDefGA");
  const ctx = document.getElementById("cDefGA"); if (!ctx) return;
  const d = [...DATA.standings].sort((a, b) => a.GA - b.GA);
  charts["cDefGA"] = new Chart(ctx, {
    type: "bar", data: {
      labels: d.map(t => sn(t.team)),
      datasets: [{ label: "Goals Against", data: d.map(t => t.GA),
        backgroundColor: d.map(t => tc(t.team) + "cc"), borderColor: d.map(t => tc(t.team)),
        borderWidth: 1.5, borderRadius: 5, borderSkipped: false }]
    },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: "y",
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.parsed.x} goals conceded` } } },
      scales: { x: { grid: { color: "rgba(255,255,255,0.05)" } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } }
    }
  });
}

function renderDefCS() {
  destroyChart("cDefCS");
  const ctx = document.getElementById("cDefCS"); if (!ctx) return;
  const d = [...DATA.goalkeeping].sort((a, b) => b.clean_sheets - a.clean_sheets);
  charts["cDefCS"] = new Chart(ctx, {
    type: "bar", data: {
      labels: d.map(g => g.goalkeeper.split(" ").slice(-1)[0]),
      datasets: [{ label: "Clean Sheets", data: d.map(g => g.clean_sheets),
        backgroundColor: d.map(g => tc(g.club) + "cc"), borderColor: d.map(g => tc(g.club)),
        borderWidth: 1.5, borderRadius: 4, borderSkipped: false }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${d[c.dataIndex].goalkeeper} (${d[c.dataIndex].club}): ${c.parsed.y} clean sheets` } } },
      scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { grid: { color: "rgba(255,255,255,0.05)" } } }
    }
  });
}

function renderDefScatter() {
  destroyChart("cDefScatter");
  const ctx = document.getElementById("cDefScatter"); if (!ctx) return;
  const d = DATA.standings;
  charts["cDefScatter"] = new Chart(ctx, {
    type: "scatter", data: {
      datasets: [{ label: "Team",
        data: d.map(t => ({ x: t.GA, y: t.GD, team: t.team })),
        backgroundColor: d.map(t => tc(t.team) + "cc"), borderColor: d.map(t => tc(t.team)),
        borderWidth: 1.5, pointRadius: 8, pointHoverRadius: 11 }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${c.raw.team}  GA: ${c.raw.x}  GD: ${c.raw.y}` } } },
      scales: {
        x: { title: { display: true, text: "Goals Against",    color: "#64748b" }, grid: { color: "rgba(255,255,255,0.05)" } },
        y: { title: { display: true, text: "Goal Difference",  color: "#64748b" }, grid: { color: "rgba(255,255,255,0.05)" } }
      }
    }
  });
}

/* ════════════════════════════════════════════════════════════
   FINANCE SECTION
   ════════════════════════════════════════════════════════════ */

function buildFinanceMetrics() {
  return DATA.team_metrics.map(metric => ({
    ...standingFor(metric.team),
    ...financeFor(metric.team),
    ...metric,
    cpp: metric.cost_per_point,
    cpg: metric.cost_per_goal,
    valueIndex: metric.value_index,
  }));
}

function renderFinanceKPIs(metrics) {
  const sorted   = [...metrics].sort((a, b) => a.valueIndex - b.valueIndex);
  const best     = sorted[0];
  const worst    = sorted[sorted.length - 1];
  const bigSpend = [...metrics].sort((a, b) => b.wage_bill_m - a.wage_bill_m)[0];
  const topVal   = [...metrics].sort((a, b) => b.squad_value_m - a.squad_value_m)[0];

  document.getElementById("financeKpis").innerHTML = [
    { icon: crestImg(best.team, 32), value: sn(best.team),    label: "Best Value Team",      sub: `£${best.cpp}M per point · Index ${best.valueIndex}`, accent: `linear-gradient(90deg,${C.green},${C.cyan})` },
    { icon: crestImg(worst.team, 32),value: sn(worst.team),   label: "Worst Value Team",     sub: `£${worst.cpp}M per point · Index ${worst.valueIndex}`, accent: `linear-gradient(90deg,${C.red},${C.pink})` },
    { icon: "💷",                     value: `£${bigSpend.wage_bill_m}M`, label: `Biggest Wage Bill — ${sn(bigSpend.team)}`, sub: `${bigSpend.Pts} pts · ${bigSpend.W}W`, accent: `linear-gradient(90deg,${C.orange},${C.yellow})` },
    { icon: "📊",                     value: `€${topVal.squad_value_m}M`, label: `Highest Squad Value — ${sn(topVal.team)}`, sub: `${topVal.Pts} pts this season`, accent: `linear-gradient(90deg,${C.purple},${C.blue})` },
  ].map((k, i) => `
    <div class="kpi-card" style="--kpi-accent:${k.accent};animation-delay:${i * 0.07}s">
      <div class="kpi-icon">${k.icon}</div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join("");
}

function renderFinanceCharts() {
  const metrics = buildFinanceMetrics();

  renderFinanceKPIs(metrics);
  renderFinanceScatter(metrics);

  // Squad value chart
  destroyChart("cFinSquadVal");
  const ctx1 = document.getElementById("cFinSquadVal"); if (!ctx1) return;
  const byVal = [...metrics].sort((a, b) => b.squad_value_m - a.squad_value_m);
  charts["cFinSquadVal"] = new Chart(ctx1, {
    type: "bar", data: {
      labels: byVal.map(t => sn(t.team)),
      datasets: [{ label: "Squad Value (€M)", data: byVal.map(t => t.squad_value_m),
        backgroundColor: byVal.map(t => tc(t.team) + "cc"), borderColor: byVal.map(t => tc(t.team)),
        borderWidth: 1.5, borderRadius: 5, borderSkipped: false }]
    },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: "y",
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => ` €${c.parsed.x}M player aggregate` } } },
      scales: { x: { grid: { color: "rgba(255,255,255,0.05)" } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } }
    }
  });

  // Wage bill chart
  destroyChart("cFinWages");
  const ctx2 = document.getElementById("cFinWages"); if (!ctx2) return;
  const byWage = [...metrics].sort((a, b) => b.wage_bill_m - a.wage_bill_m);
  charts["cFinWages"] = new Chart(ctx2, {
    type: "bar", data: {
      labels: byWage.map(t => sn(t.team)),
      datasets: [{ label: "Wage Bill (£M/yr)", data: byWage.map(t => t.wage_bill_m),
        backgroundColor: byWage.map(t => tc(t.team) + "cc"), borderColor: byWage.map(t => tc(t.team)),
        borderWidth: 1.5, borderRadius: 4, borderSkipped: false }]
    },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: { x: { grid: { color: "rgba(255,255,255,0.05)" } }, y: { grid: { display: false }, ticks: { font: { size: 9 } } } }
    }
  });

  // Cost per point chart
  destroyChart("cFinCPP");
  const ctx3 = document.getElementById("cFinCPP"); if (!ctx3) return;
  const byCpp = [...metrics].sort((a, b) => a.cpp - b.cpp);
  const avgCpp = metrics.reduce((s, m) => s + m.cpp, 0) / metrics.length;
  charts["cFinCPP"] = new Chart(ctx3, {
    type: "bar", data: {
      labels: byCpp.map(t => sn(t.team)),
      datasets: [{ label: "Cost/Point (£M)", data: byCpp.map(t => t.cpp),
        backgroundColor: byCpp.map(t => t.cpp <= avgCpp ? C.green + "bb" : C.red + "99"),
        borderColor:     byCpp.map(t => t.cpp <= avgCpp ? C.green       : C.red),
        borderWidth: 1.5, borderRadius: 4, borderSkipped: false }]
    },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: "y",
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => ` £${c.parsed.x}M per point` } } },
      scales: { x: { grid: { color: "rgba(255,255,255,0.05)" } }, y: { grid: { display: false }, ticks: { font: { size: 9 } } } }
    }
  });

  // Team Value Index
  destroyChart("cFinValueIndex");
  const ctx4 = document.getElementById("cFinValueIndex"); if (!ctx4) return;
  const byIdx = [...metrics].sort((a, b) => a.valueIndex - b.valueIndex);
  charts["cFinValueIndex"] = new Chart(ctx4, {
    type: "bar", data: {
      labels: byIdx.map(t => sn(t.team)),
      datasets: [{ label: "Value Index", data: byIdx.map(t => t.valueIndex),
        backgroundColor: byIdx.map(t => t.valueIndex <= 1 ? C.green + "bb" : C.red + "99"),
        borderColor:     byIdx.map(t => t.valueIndex <= 1 ? C.green       : C.red),
        borderWidth: 1.5, borderRadius: 5, borderSkipped: false }]
    },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: "y",
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => {
          const t = byIdx[c.dataIndex];
          return ` Index: ${c.parsed.x}  (${c.parsed.x <= 1 ? "✅ Better than avg" : "❌ Worse than avg"})  |  ${t.Pts} pts`;
        }}}},
      scales: {
        x: { grid: { color: "rgba(255,255,255,0.05)" },
          ticks: { callback: v => v.toFixed(1) } },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });
}

function renderFinanceScatter(metrics) {
  destroyChart("cFinSpendPoints");
  const ctx = document.getElementById("cFinSpendPoints"); if (!ctx) return;
  const strongest = [...metrics].sort((a, b) => Math.abs(b.residual_points) - Math.abs(a.residual_points)).slice(0, 6);
  const strongestTeams = new Set(strongest.map(team => team.team));
  const trend = [...metrics]
    .sort((a, b) => a.wage_bill_m - b.wage_bill_m)
    .map(team => ({ x: team.wage_bill_m, y: team.predicted_points }));
  charts["cFinSpendPoints"] = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          type: "line", label: "Expected points", data: trend,
          borderColor: C.cyan, borderDash: [7, 5], borderWidth: 2,
          pointRadius: 0, pointHoverRadius: 0, fill: false,
        },
        {
          label: "Clubs",
          data: metrics.map(team => ({
            x: team.wage_bill_m, y: team.points, team: team.team,
            predicted: team.predicted_points, residual: team.residual_points,
            cpp: team.cost_per_point, index: team.value_index,
          })),
          backgroundColor: metrics.map(team => tc(team.team) + "dd"),
          borderColor: metrics.map(team => strongestTeams.has(team.team) ? C.yellow : tc(team.team)),
          borderWidth: metrics.map(team => strongestTeams.has(team.team) ? 3 : 1.5),
          pointRadius: metrics.map(team => strongestTeams.has(team.team) ? 10 : 7),
          pointHoverRadius: 12,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      onClick: (event, elements) => {
        const point = elements.find(element => element.datasetIndex === 1);
        if (point) openTeamDetail(encodedTeam(metrics[point.index].team));
      },
      plugins: {
        legend: { labels: { color: "#94a3b8", boxWidth: 12 } },
        tooltip: { callbacks: { label: context => {
          if (context.datasetIndex === 0) return ` Expected points: ${fmt(context.parsed.y, 1)}`;
          const point = context.raw;
          return ` ${point.team} · £${point.x}M wages · ${point.y} pts · expected ${fmt(point.predicted, 1)} · residual ${signed(point.residual, 1)} · £${fmt(point.cpp, 2)}M/pt · index ${fmt(point.index, 2)}`;
        }}},
      },
      scales: {
        x: { title: { display: true, text: "Annual wage bill (£M)", color: "#64748b" }, grid: { color: "rgba(255,255,255,0.05)" } },
        y: { title: { display: true, text: "League points", color: "#64748b" }, grid: { color: "rgba(255,255,255,0.05)" } },
      },
    },
  });
}

function setFinanceSort(key) {
  financeSort = {
    key,
    direction: financeSort.key === key && financeSort.direction === "asc" ? "desc" : "asc",
  };
  renderTeamEfficiencyTable();
}

function renderTeamEfficiencyTable() {
  const body = document.getElementById("efficiencyBody"); if (!body || !DATA.team_metrics) return;
  const direction = financeSort.direction === "asc" ? 1 : -1;
  const rows = [...DATA.team_metrics].sort((a, b) => {
    const left = a[financeSort.key];
    const right = b[financeSort.key];
    return (typeof left === "string" ? left.localeCompare(right) : left - right) * direction;
  });
  body.innerHTML = rows.map(team => {
    const indexClass = team.value_index < .95 ? "metric-good" : team.value_index > 1.05 ? "metric-bad" : "metric-neutral";
    const residualClass = team.residual_points > 3 ? "metric-good" : team.residual_points < -3 ? "metric-bad" : "metric-neutral";
    return `
      <tr>
        <td class="num-col">${team.value_rank}</td>
        <td class="name-col sticky-col">${crestImg(team.team, 22)} ${team.team}</td>
        <td>${team.league_position}</td><td class="pts-col">${team.points}</td><td>${team.goals_for}</td>
        <td>€${fmt(team.squad_value_m)}M</td><td>£${fmt(team.wage_bill_m)}M</td>
        <td>£${fmt(team.cost_per_point, 2)}M</td><td>£${fmt(team.cost_per_goal, 2)}M</td>
        <td class="${indexClass}">${fmt(team.value_index, 2)}</td>
        <td class="${residualClass}">${signed(team.residual_points)}</td>
        <td><button class="table-action" onclick="openTeamDetail('${encodedTeam(team.team)}')">View team</button></td>
      </tr>`;
  }).join("");
}

function renderFinanceMethodology() {
  const el = document.getElementById("financeMethodology"); if (!el) return;
  const sources = DATA.finance_sources || [];
  el.innerHTML = `
    <div class="method-title">Finance data methodology</div>
    <div class="method-copy">
      Wage bills use rounded Capology combined gross annual base-payroll estimates for 2024-2025.
      Capology notes that historical combined payrolls may include mid-season transfers and exclude
      bonuses and club staff. Canonical squad values are reproducible euro aggregates of dated
      player valuations. Curated Transfermarkt club totals remain low-confidence comparison references.
    </div>
    <div class="method-links">
      ${sources.map(source => `
        ${sourceLink(source)}
        ${confidenceBadge(source)}
      `).join("")}
    </div>`;
}

function renderDataHealth() {
  const health = DATA._meta?.health || [];
  const html = `
    <div class="method-title">Data health</div>
    <div class="health-grid">${health.map(item => `
      <div class="health-item health-${item.severity}">
        <strong>${item.summary}</strong><span>${item.details}</span>
      </div>`).join("")}</div>`;
  ["overviewDataHealth", "financeDataHealth"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  });
}

function renderValuationDiscrepancies() {
  const body = document.getElementById("valuationDiscrepancyBody"); if (!body) return;
  body.innerHTML = [...(DATA.squad_valuations || [])]
    .sort((a, b) => Math.abs(b.difference_pct) - Math.abs(a.difference_pct))
    .map(row => `<tr>
      <td class="name-col">${crestImg(row.team, 20)} ${row.team}</td>
      <td>€${fmt(row.squad_value_eur_m)}M</td><td>£${fmt(row.external_reference_gbp_m)}M</td>
      <td>€${fmt(row.external_reference_eur_m)}M</td><td>${signed(row.difference_eur_m)}M</td>
      <td class="${row.severity === "warning" ? "metric-bad" : "metric-neutral"}">${signed(row.difference_pct)}%</td>
      <td>${row.valued_player_count} valued · ${row.missing_player_value_count} missing</td>
      <td><span class="valuation-badge ${row.severity === "warning" ? "valuation-stale" : "valuation-fresh"}">${row.severity}</span></td>
    </tr>`).join("");
}

// ── Famous Player Wage Cards ──────────────────────────────────
function renderWageGrid() {
  const el = document.getElementById("wageGrid"); if (!el) return;
  const maxWage = 400; // max weekly wage for scale

  el.innerHTML = DATA.finances.map(f => {
    const st = DATA.standings.find(s => s.team === f.team) || {};
    const valuation = squadValuationFor(f.team);
    const squadSource = financeSource(f.squad_value_source);
    const payrollSource = financeSource(f.wage_bill_source);
    const playerWageSource = financeSource(f.famous_player_wage_source);
    return `
    <div class="wage-card">
      <div class="wage-card-header" style="background:linear-gradient(135deg,${tbg(f.team)},${tc(f.team)}22)">
        <div class="wage-club-logo">${crestImg(f.team, 44)}</div>
        <div class="wage-club-info">
          <div class="wage-club-name">${f.team}</div>
          <div class="wage-club-meta">
            <span class="tag-pill" style="background:${tc(f.team)}22;color:${tc(f.team)}">#${st.position || "–"}</span>
            <span class="tag-pill">€${valuation?.squad_value_eur_m ?? "–"}M squad</span>
            <span class="tag-pill">£${f.wage_bill_m}M/yr wages</span>
          </div>
        </div>
      </div>
      <div class="wage-players">
        ${f.famous_players.map(p => `
          <div class="wage-row">
            <div class="wage-row-left">
              ${playerAvatar(p.player, f.team, 36)}
              <div class="wage-row-info">
                <div class="wage-player-name">${p.player}</div>
                <div class="wage-position">${posIcon(p.position)} ${posLabel(p.position)}</div>
              </div>
            </div>
            <div class="wage-row-right">
              <div class="wage-amount">£${p.weekly_k}K/wk</div>
              <div class="wage-bar-wrap">
                <div class="wage-bar-fill" style="width:${Math.round(p.weekly_k / maxWage * 100)}%;background:${tc(f.team)}"></div>
              </div>
            </div>
          </div>`).join("")}
      </div>
      <div class="wage-provenance">
        <span>Sources:</span>
        ${sourceLink(squadSource, "squad value")} ${confidenceBadge(squadSource)}
        ${sourceLink(payrollSource, "payroll")} ${confidenceBadge(payrollSource)}
        ${sourceLink(playerWageSource, "player wages")} ${confidenceBadge(playerWageSource)}
      </div>
    </div>`;
  }).join("");
}

/* ════════════════════════════════════════════════════════════
   VALUE FOR MONEY SECTION
   ════════════════════════════════════════════════════════════ */

// Keep a defensive runtime dedupe in case the generated bundle is bypassed.
function cleanPlayers() {
  const seen = new Set();
  return DATA.players.filter(p => {
    const canonicalName = p.player.replace(/\s+\([^)]*\)$/, "");
    const key = `${canonicalName}|${p.club}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function computeVFM(players) {
  return players.map(p => {
    const perf90 = p.role_score || 0;
    const vfm    = p.market_value_m > 0 ? parseFloat((perf90 / p.market_value_m).toFixed(3)) : 0;
    return { ...p, perf90, vfm };
  });
}

function computeBargains(players) {
  const groups = {};
  players.filter(p => isExplorerEligible(p) && hasFreshValue(p)).forEach(p => {
    const pos = p.position === "CB" ? "DF" : p.position;
    if (p.market_value_m > 0) {
      if (!groups[pos]) groups[pos] = [];
      groups[pos].push(p);
    }
  });

  const medianOf = arr => {
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  const medians = {};
  Object.entries(groups).forEach(([pos, ps]) => {
    medians[pos] = {
      perf90: medianOf(ps.map(p => p.perf90)),
      value:  medianOf(ps.map(p => p.market_value_m)),
    };
  });

  return players.map(p => {
    const pos = p.position === "CB" ? "DF" : p.position;
    const med = medians[pos] || { perf90: 0, value: 99 };
    const isBargain = isFeaturedEligible(p)
      && p.perf90 >= med.perf90
      && p.market_value_m <= med.value;
    return { ...p, isBargain, medians: med };
  });
}

function allComputedPlayers() {
  return computeBargains(computeVFM(cleanPlayers()));
}

function matchesAgeBand(player, band) {
  if (band === "all") return true;
  if (player.age == null) return false;
  if (band === "u21") return player.age < 21;
  if (band === "21-24") return player.age >= 21 && player.age <= 24;
  if (band === "25-29") return player.age >= 25 && player.age <= 29;
  return player.age >= 30;
}

function filteredPlayers(players = allComputedPlayers()) {
  const search = playerFilters.search.trim().toLowerCase();
  return players.filter(player =>
    (!search || player.player.toLowerCase().includes(search))
    && (playerFilters.club === "all" || player.club === playerFilters.club)
    && (playerFilters.position === "all" || player.position === playerFilters.position)
    && matchesAgeBand(player, playerFilters.age)
    && player.mins >= Number(playerFilters.minMinutes)
    && (playerFilters.valuation === "all" || player.valuation_status === playerFilters.valuation)
    && (!playerFilters.bargainOnly || player.isBargain)
  );
}

function renderPlayerControls() {
  const clubs = document.getElementById("playerClubFilter");
  if (!clubs) return;
  clubs.innerHTML = `<option value="all">All clubs</option>${DATA.standings.map(team =>
    `<option value="${team.team}">${team.team}</option>`).join("")}`;
  document.getElementById("playerSearch").value = playerFilters.search;
  clubs.value = playerFilters.club;
  document.getElementById("playerPositionFilter").value = playerFilters.position;
  document.getElementById("playerAgeFilter").value = playerFilters.age;
  document.getElementById("playerMinutesFilter").value = String(playerFilters.minMinutes);
  document.getElementById("playerValuationFilter").value = playerFilters.valuation;
  document.getElementById("playerBargainFilter").checked = playerFilters.bargainOnly;
}

function updatePlayerFilter(key, value) {
  playerFilters[key] = key === "minMinutes" ? Number(value) : value;
  syncUrlState();
  renderPlayerExplorer();
}

function resetPlayerFilters() {
  playerFilters = {
    search: "", club: "all", position: "all", age: "all",
    minMinutes: 500, valuation: "all", bargainOnly: false,
  };
  renderPlayerControls();
  syncUrlState();
  renderPlayerExplorer();
}

function renderPlayerExplorer() {
  const players = filteredPlayers();
  const count = document.getElementById("playerResultCount");
  if (count) count.textContent = `${players.length} players match the current filters`;
  renderValueCharts(players);
  renderBargainGrid(players);
  renderVFMTable(players);
}

function renderValueKPIs(players) {
  const featured = players.filter(isFeaturedEligible);
  const byVfm  = [...featured].sort((a, b) => b.vfm  - a.vfm);
  const byPerf = [...featured].sort((a, b) => b.perf90 - a.perf90);
  const bargains = players.filter(p => p.isBargain);
  const topBargain = [...bargains].sort((a, b) => b.vfm - a.vfm)[0] || byVfm[0];
  if (!byVfm.length || !byPerf.length) {
    document.getElementById("valueKpis").innerHTML = `<div class="empty-state">No featured players match the current filters.</div>`;
    return;
  }

  document.getElementById("valueKpis").innerHTML = [
    { icon: crestImg(byVfm[0].club, 32), value: byVfm[0].player,
      label: "Top VFM Score", sub: `VFM ${byVfm[0].vfm.toFixed(1)} · €${byVfm[0].market_value_m}M · ${byVfm[0].club}`,
      accent: `linear-gradient(90deg,${C.green},${C.cyan})` },
    { icon: "🏹", value: byPerf[0].player,
      label: "Best Role Score", sub: `${byPerf[0].perf90.toFixed(2)} role score · ${byPerf[0].goals}G ${byPerf[0].assists}A`,
      accent: `linear-gradient(90deg,${C.purple},${C.pink})` },
    { icon: "🏷️", value: bargains.length + " Players",
      label: "Bargain Players Found", sub: `Top: ${topBargain?.player || "–"}`,
      accent: `linear-gradient(90deg,${C.yellow},${C.orange})` },
    { icon: "💎", value: bargains.length ? topBargain.player : "–",
      label: "Best Bargain", sub: bargains.length ? `€${topBargain.market_value_m}M · ${topBargain.goals}G ${topBargain.assists}A` : "No bargain matches this filter",
      accent: `linear-gradient(90deg,${C.cyan},${C.blue})` },
  ].map((k, i) => `
    <div class="kpi-card" style="--kpi-accent:${k.accent};animation-delay:${i * 0.07}s">
      <div class="kpi-icon">${k.icon}</div>
      <div class="kpi-value" style="font-size:1.2rem">${k.value}</div>
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join("");
}

function renderValueCharts(players = filteredPlayers()) {
  renderValueKPIs(players);

  // Scatter: position-aware role score vs market value
  destroyChart("cValScatter");
  const ctx1 = document.getElementById("cValScatter"); if (!ctx1) return;
  const validP = players.filter(p => p.market_value_m > 0);
  const positionColor = { GK: C.yellow, DF: C.green, MF: C.blue, FW: C.red };
  charts["cValScatter"] = new Chart(ctx1, {
    type: "scatter", data: {
      datasets: [{
        label: "Players",
        data: validP.map(p => ({ x: p.market_value_m, y: p.perf90, player: p.player, club: p.club, position: p.position, bargain: p.isBargain, status: p.valuation_status, date: p.valuation_date })),
        backgroundColor: validP.map(p => (positionColor[p.position] || C.purple) + (p.valuation_status === "stale" ? "77" : "cc")),
        borderColor:     validP.map(p => p.isBargain ? C.yellow : p.valuation_status === "stale" ? C.orange : positionColor[p.position] || C.purple),
        borderWidth: validP.map(p => p.isBargain || p.valuation_status === "stale" ? 2.5 : 1),
        pointRadius: validP.map(p => p.isBargain ? 8 : p.valuation_status === "stale" ? 7 : 5),
        pointHoverRadius: 11,
      }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${c.raw.player} (${c.raw.club})  ${c.raw.position}  €${c.raw.x}M  Role score: ${c.raw.y}  ${c.raw.status} ${c.raw.date || ""}  ${c.raw.bargain ? "🏷️ Bargain" : ""}` } } },
      scales: {
        x: { title: { display: true, text: "Market Value (€M)", color: "#64748b" }, grid: { color: "rgba(255,255,255,0.05)" } },
        y: { title: { display: true, text: "Position-aware role score",  color: "#64748b" }, grid: { color: "rgba(255,255,255,0.05)" } }
      }
    }
  });

  // VFM Bar chart — top 25
  destroyChart("cValRanking");
  const ctx2 = document.getElementById("cValRanking"); if (!ctx2) return;
  const top25 = [...players].filter(isFeaturedEligible).sort((a, b) => b.vfm - a.vfm).slice(0, 25);
  charts["cValRanking"] = new Chart(ctx2, {
    type: "bar", data: {
      labels: top25.map(p => p.player),
      datasets: [{ label: "VFM Score", data: top25.map(p => p.vfm),
        backgroundColor: top25.map(p => p.isBargain ? C.green + "dd" : tc(p.club) + "cc"),
        borderColor:     top25.map(p => p.isBargain ? C.green         : tc(p.club)),
        borderWidth: 1.5, borderRadius: 5, borderSkipped: false }]
    },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: "y",
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => {
          const p = top25[c.dataIndex];
          return ` VFM: ${c.parsed.x.toFixed(1)}  |  €${p.market_value_m}M  |  ${p.goals}G ${p.assists}A  ${p.isBargain ? "🏷️" : ""}`;
        }}}},
      scales: { x: { grid: { color: "rgba(255,255,255,0.05)" } }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } }
    }
  });
}

// ── Bargain Player Feature Cards ──────────────────────────────
function renderBargainGrid(players = filteredPlayers()) {
  const bargains = [...players.filter(p => p.isBargain)].sort((a, b) => b.vfm - a.vfm);

  const el = document.getElementById("bargainGrid"); if (!el) return;
  if (!bargains.length) { el.innerHTML = `<p style="color:var(--t3)">No bargain players found with current criteria.</p>`; return; }

  el.innerHTML = bargains.map(p => {
    const col   = tc(p.club);
    const stars = Math.min(5, Math.round(p.vfm * 2));
    const starStr = "★".repeat(stars) + "☆".repeat(5 - stars);
    return `
    <div class="bargain-card" style="--club-color:${col};--club-bg:${tbg(p.club)}">
      <div class="bc-header">
        <div class="bc-badge">🏷️ BARGAIN</div>
        ${crestImg(p.club, 28)}
        <span class="bc-club">${sn(p.club)}</span>
      </div>
      <div class="bc-body">
        <div class="bc-avatar-row">
          ${playerAvatar(p.player, p.club, 64)}
          <div class="bc-name-block">
            <div class="bc-player-name">${p.player}</div>
            <div class="bc-pos">${posIcon(p.position)} ${posLabel(p.position)}</div>
            <div class="bc-stars" title="VFM rating">${starStr}</div>
          </div>
        </div>
        <div class="bc-stats-grid">
          <div class="bc-stat"><div class="bc-stat-val">${p.goals}</div><div class="bc-stat-lbl">Goals</div></div>
          <div class="bc-stat"><div class="bc-stat-val">${p.assists}</div><div class="bc-stat-lbl">Assists</div></div>
          <div class="bc-stat"><div class="bc-stat-val">${p.perf90.toFixed(2)}</div><div class="bc-stat-lbl">Role score</div></div>
          <div class="bc-stat"><div class="bc-stat-val">€${p.market_value_m}M</div><div class="bc-stat-lbl">Value</div></div>
        </div>
        <div class="bc-vfm-row">
          <span class="bc-vfm-label">VFM Score</span>
          <span class="bc-vfm-val">${p.vfm.toFixed(1)}</span>
        </div>
      </div>
    </div>`;
  }).join("");
}

// ── VFM Rankings Table ────────────────────────────────────────
function renderVFMTable(players = filteredPlayers()) {
  const body = document.getElementById("vfmBody"); if (!body) return;
  const sorted  = [...players].sort((a, b) => Number(hasFreshValue(b)) - Number(hasFreshValue(a)) || b.vfm - a.vfm);

  body.innerHTML = sorted.map((p, i) => `
    <tr class="${p.isBargain ? "row-bargain" : ""}">
      <td class="num-col">${i + 1}</td>
      <td class="name-col">${playerAvatar(p.player, p.club, 28)} <span style="vertical-align:middle">${p.player}</span></td>
      <td>${crestImg(p.club, 20)} <span style="vertical-align:middle;font-size:.8rem">${sn(p.club)}</span></td>
      <td><span class="pos-badge pos-${p.position.toLowerCase()}">${p.position}</span></td>
      <td>${p.age ?? "–"}</td>
      <td>${p.apps}</td>
      <td>${p.mins.toLocaleString()}</td>
      <td class="goals-col">${p.goals}</td>
      <td style="color:var(--cyan)">${p.assists}</td>
      <td style="color:var(--green);font-weight:600">${p.perf90.toFixed(2)}</td>
      <td>${p.market_value_m == null ? "–" : `€${p.market_value_m}M`}</td>
      <td>${valuationBadge(p)} ${p.valuation_source_url ? sourceLink({ source_url: p.valuation_source_url, notes: `Transfermarkt valuation dated ${p.valuation_date || "unknown"}` }, p.valuation_date || "source") : ""}</td>
      <td class="vfm-col">${p.vfm.toFixed(1)}</td>
      <td>${p.isBargain ? '<span class="bargain-tag">🏷️ Yes</span>' : '<span style="color:var(--t3)">–</span>'}</td>
    </tr>`).join("");
}

/* ════════════════════════════════════════════════════════════
   CLUBS SECTION
   ════════════════════════════════════════════════════════════ */
function openTeamDetail(teamValue) {
  const team = decodeURIComponent(teamValue || "");
  if (!standingFor(team)) return;
  selectedTeam = team;
  activeSection = "clubs";
  showSection("clubs");
  renderClubs();
}

function showAllClubs() {
  selectedTeam = "";
  syncUrlState();
  renderClubs();
}

function renderClubComparison(metric, standing, squad) {
  destroyChart("cClubComparison");
  const ctx = document.getElementById("cClubComparison"); if (!ctx) return;
  const avg = key => DATA.team_metrics.reduce((total, team) => total + team[key], 0) / DATA.team_metrics.length;
  const values = [
    { label: "Points", team: metric.points, league: avg("points") },
    { label: "Goals", team: metric.goals_for, league: avg("goals_for") },
    { label: "Wage bill", team: metric.wage_bill_m, league: avg("wage_bill_m") },
    { label: "Squad value", team: metric.squad_value_m, league: avg("squad_value_m") },
    { label: "Possession", team: squad?.possession || 0, league: DATA.squads.reduce((total, row) => total + (row.possession || 0), 0) / DATA.squads.length },
  ];
  charts["cClubComparison"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: values.map(value => value.label),
      datasets: [
        { label: standing.team, data: values.map(value => value.team), backgroundColor: tc(standing.team) + "cc", borderColor: tc(standing.team), borderWidth: 1.5, borderRadius: 4 },
        { label: "League average", data: values.map(value => value.league), backgroundColor: C.cyan + "55", borderColor: C.cyan, borderWidth: 1, borderRadius: 4 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#94a3b8", boxWidth: 12 } } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: "rgba(255,255,255,0.05)" } } },
    },
  });
}

function renderTeamDetail(team) {
  const el = document.getElementById("clubDetail"); if (!el) return;
  const standing = standingFor(team);
  const finance = financeFor(team);
  const metric = teamMetric(team);
  const squad = squadFor(team);
  if (!standing || !finance || !metric) { el.innerHTML = ""; return; }
  const players = allComputedPlayers().filter(player => player.club === team)
    .sort((a, b) => b.vfm - a.vfm);
  const avg = key => DATA.team_metrics.reduce((total, row) => total + row[key], 0) / DATA.team_metrics.length;
  const comparison = (value, average, lowerIsBetter = false) => {
    const difference = (value / average - 1) * 100;
    const good = lowerIsBetter ? difference < 0 : difference > 0;
    return `<span class="${good ? "metric-good" : "metric-bad"}">${signed(difference, 0)}% vs avg</span>`;
  };
  const interpretation = metric.value_index < .95 ? "Efficient spender" : metric.value_index > 1.05 ? "Below-average efficiency" : "Near league average";
  el.innerHTML = `
    <div class="team-detail">
      <button class="action-btn" onclick="showAllClubs()">← All clubs</button>
      <div class="team-detail-header" style="--club-color:${tc(team)};background:linear-gradient(135deg,${tbg(team)},${tc(team)}33)">
        ${crestImg(team, 76)}
        <div><h2>${team}</h2><p>#${standing.position} · ${standing.Pts} points · ${standing.W}W ${standing.D}D ${standing.L}L · ${standing.GF} GF ${standing.GA} GA · ${standing.GD > 0 ? "+" : ""}${standing.GD} GD</p>
        <span class="tag-pill">${interpretation}</span><span class="tag-pill">${metric.performance_class.replace("_", " ")}</span></div>
      </div>
      <div class="detail-kpis">
        <div class="detail-kpi"><strong>£${fmt(metric.wage_bill_m)}M</strong><span>Wage bill</span>${comparison(metric.wage_bill_m, avg("wage_bill_m"))}</div>
        <div class="detail-kpi"><strong>€${fmt(metric.squad_value_m)}M</strong><span>Squad value · player aggregate</span>${comparison(metric.squad_value_m, avg("squad_value_m"))}</div>
        <div class="detail-kpi"><strong>${metric.points}</strong><span>Points</span>${comparison(metric.points, avg("points"))}</div>
        <div class="detail-kpi"><strong>£${fmt(metric.cost_per_point, 2)}M</strong><span>Cost per point</span>${comparison(metric.cost_per_point, avg("cost_per_point"), true)}</div>
        <div class="detail-kpi"><strong>£${fmt(metric.cost_per_goal, 2)}M</strong><span>Cost per goal</span>${comparison(metric.cost_per_goal, avg("cost_per_goal"), true)}</div>
        <div class="detail-kpi"><strong>${fmt(metric.value_index, 2)}</strong><span>Value index · rank #${metric.value_rank}</span><span class="${metric.value_index < 1 ? "metric-good" : "metric-bad"}">${metric.value_index < 1 ? "better" : "worse"} than avg</span></div>
      </div>
      <div class="chart-grid detail-grid">
        <div class="chart-card"><div class="card-hdr"><h3>Club vs League Average</h3><span class="badge">Mixed units · directional</span></div><div class="chart-wrap"><canvas id="cClubComparison"></canvas></div></div>
        <div class="detail-panel"><h3>Squad Snapshot</h3>
          <div class="snapshot-grid">
            <span>Possession<strong>${squad?.possession == null ? "–" : `${fmt(squad.possession)}%`}</strong></span>
            <span>xG<strong>${squad?.xG == null ? "–" : fmt(squad.xG)}</strong></span>
            <span>xGA<strong>${squad?.xGA == null ? "–" : fmt(squad.xGA)}</strong></span>
            <span>Clean sheets<strong>${squad?.clean_sheets ?? "–"}</strong></span>
            <span>Tackles won<strong>${squad?.tackles ?? "–"}</strong></span>
            <span>Yellow cards<strong>${squad?.yellow_cards ?? "–"}</strong></span>
            <span>Red cards<strong>${squad?.red_cards ?? "–"}</strong></span>
            <span>Performance score<strong>${squad?.performance_score ?? "–"}</strong></span>
          </div>
          <h3>Notable Wages</h3>
          ${(finance.famous_players || []).map(player => `<div class="wage-row"><span>${player.player}</span><strong>£${player.weekly_k}K/wk</strong></div>`).join("")}
        </div>
      </div>
      <div class="section-hdr" style="margin-top:2rem"><h2>${team} Player Rankings</h2><p>All registered players, sorted by value-for-money score.</p></div>
      <div class="table-wrap"><table class="stats-table"><thead><tr><th>Player</th><th>Pos</th><th>Age</th><th>Apps</th><th>Mins</th><th>Goals</th><th>Assists</th><th>Role score</th><th>Value (€M)</th><th>Valuation</th><th>VFM</th><th>Bargain?</th></tr></thead>
      <tbody>${players.map(player => `<tr class="${player.isBargain ? "row-bargain" : ""}"><td class="name-col">${playerAvatar(player.player, player.club, 28)} ${player.player}</td><td>${player.position}</td><td>${player.age ?? "–"}</td><td>${player.apps}</td><td>${player.mins.toLocaleString()}</td><td>${player.goals}</td><td>${player.assists}</td><td>${fmt(player.perf90, 2)}</td><td>${player.market_value_m == null ? "–" : `€${player.market_value_m}M`}</td><td>${valuationBadge(player)}</td><td class="vfm-col">${fmt(player.vfm, 1)}</td><td>${player.isBargain ? "Yes" : "–"}</td></tr>`).join("")}</tbody></table></div>
    </div>`;
  renderClubComparison(metric, standing, squad);
}

function renderClubs() {
  const el = document.getElementById("clubsGrid"); if (!el) return;
  const selector = document.getElementById("clubSelector");
  if (selector) {
    selector.innerHTML = `<option value="">Choose a club</option>${DATA.standings.map(team => `<option value="${team.team}">${team.team}</option>`).join("")}`;
    selector.value = selectedTeam;
  }
  if (selectedTeam && standingFor(selectedTeam)) {
    el.innerHTML = "";
    renderTeamDetail(selectedTeam);
    return;
  }
  document.getElementById("clubDetail").innerHTML = "";
  const finMap = {};
  DATA.finances.forEach(f => finMap[f.team] = f);

  el.innerHTML = DATA.standings.map(t => {
    const fin = finMap[t.team] || {};
    const valuation = squadValuationFor(t.team);
    const squadSource = financeSource(fin.squad_value_source);
    const payrollSource = financeSource(fin.wage_bill_source);
    const col = tc(t.team);
    const pos = t.position;
    const badge = pos === 1 ? "🏆 Champions"
      : [2,3,4,5].includes(pos) ? "🔵 UCL"
      : [6,7].includes(pos) ? "🟢 UEL"
      : [18,19,20].includes(pos) ? "🔴 Relegated"
      : "";
    const cpp = fin.wage_bill_m && t.Pts ? (fin.wage_bill_m / t.Pts).toFixed(1) : "–";

    return `
    <div class="club-card" role="button" tabindex="0" onclick="openTeamDetail('${encodedTeam(t.team)}')" onkeydown="if(event.key==='Enter')openTeamDetail('${encodedTeam(t.team)}')" style="--club-color:${col};--club-bg:${tbg(t.team)}">
      <div class="cc-banner" style="background:linear-gradient(160deg,${tbg(t.team)} 0%,${col}33 100%)">
        <div class="cc-logo-wrap">
          <img src="${tCrest(t.team)}" alt="${t.team}" class="cc-logo"
            onerror="this.style.display='none';this.nextSibling.style.display='flex'">
          <div class="cc-logo-fallback" style="display:none;background:${col}22;border:2px solid ${col}">
            <span>${te(t.team)}</span>
          </div>
        </div>
        <div class="cc-header-info">
          <div class="cc-team-name">${t.team}</div>
          <div class="cc-meta">
            <span class="tag-pill" style="background:${col}22;color:${col}">
              #${pos} · ${t.Pts} pts
            </span>
            ${badge ? `<span class="tag-pill qual-badge">${badge}</span>` : ""}
          </div>
          <div class="cc-record">${t.W}W ${t.D}D ${t.L}L &nbsp;·&nbsp; ${t.GF} GF ${t.GA} GA</div>
        </div>
      </div>
      <div class="cc-finances">
        <div class="cc-fin-row">
          <div class="cc-fin-item">
            <div class="cc-fin-val">€${valuation?.squad_value_eur_m ?? "–"}M</div>
            <div class="cc-fin-lbl">Squad Value</div>
          </div>
          <div class="cc-fin-item">
            <div class="cc-fin-val">£${fin.wage_bill_m || "–"}M</div>
            <div class="cc-fin-lbl">Wage Bill/yr</div>
          </div>
          <div class="cc-fin-item">
            <div class="cc-fin-val" style="color:${cpp !== '–' && parseFloat(cpp) <= 2.5 ? 'var(--green)' : cpp !== '–' && parseFloat(cpp) >= 4.5 ? 'var(--red)' : 'var(--yellow)'}">
              £${cpp}M
            </div>
            <div class="cc-fin-lbl">Cost/Point</div>
          </div>
        </div>
      </div>
      <div class="cc-players">
        <div class="cc-section-label">Star Player Wages</div>
        ${(fin.famous_players || []).map(p => `
          <div class="cc-player-row">
            ${playerAvatar(p.player, t.team, 32)}
            <div class="cc-player-info">
              <div class="cc-player-name">${p.player}</div>
              <div class="cc-player-meta">${posIcon(p.position)} ${posLabel(p.position)}</div>
            </div>
            <div class="cc-player-wage">
              <div class="cc-wage-num">£${p.weekly_k}K</div>
              <div class="cc-wage-lbl">per week</div>
            </div>
          </div>`).join("")}
      </div>
      <div class="cc-source-row">
        ${sourceLink(squadSource, "squad value source")} ${confidenceBadge(squadSource)}
        ${sourceLink(payrollSource, "payroll source")} ${confidenceBadge(payrollSource)}
      </div>
    </div>`;
  }).join("");
}

/* ════════════════════════════════════════════════════════════
   BEST VALUE XI
   ════════════════════════════════════════════════════════════ */
const FORMATIONS = {
  "4-3-3": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "FW", "FW", "FW"],
  "4-4-2": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "FW", "FW"],
  "3-5-2": ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "MF", "FW", "FW"],
};

function renderXiControls() {
  document.getElementById("xiFormation").value = xiSettings.formation;
  document.getElementById("xiMinutes").value = String(xiSettings.minMinutes);
  document.getElementById("xiBudget").value = xiSettings.maxValue;
  document.getElementById("xiClubLimit").value = String(xiSettings.maxPerClub);
}

function updateXiSetting(key, value) {
  xiSettings[key] = ["minMinutes", "maxPerClub"].includes(key) ? Number(value) : value;
  syncUrlState();
  renderXi();
}

function resetXiSettings() {
  xiSettings = { formation: "4-3-3", minMinutes: 900, maxValue: "", maxPerClub: 3 };
  renderXiControls();
  syncUrlState();
  renderXi();
}

function optimizeXi() {
  const slots = FORMATIONS[xiSettings.formation] || FORMATIONS["4-3-3"];
  const budget = xiSettings.maxValue === "" ? Infinity : Number(xiSettings.maxValue);
  const eligible = allComputedPlayers()
    .filter(player => hasFreshValue(player) && player.mins >= xiSettings.minMinutes)
    .map(player => ({ ...player, xiScore: player.vfm + player.mins / 100000 }))
    .sort((a, b) => b.xiScore - a.xiScore);
  const byRole = {};
  ["GK", "DF", "MF", "FW"].forEach(role => {
    byRole[role] = eligible.filter(player => player.position === role).slice(0, 28);
  });

  let states = [{ players: [], totalValue: 0, score: 0, clubs: {} }];
  for (const role of slots) {
    const next = [];
    for (const state of states) {
      for (const player of byRole[role]) {
        if (state.players.some(existing => existing.player === player.player && existing.club === player.club)) continue;
        if ((state.clubs[player.club] || 0) >= xiSettings.maxPerClub) continue;
        const totalValue = state.totalValue + player.market_value_m;
        if (totalValue > budget) continue;
        next.push({
          players: [...state.players, player],
          totalValue,
          score: state.score + player.xiScore,
          clubs: { ...state.clubs, [player.club]: (state.clubs[player.club] || 0) + 1 },
        });
      }
    }
    states = next.sort((a, b) => b.score - a.score || a.totalValue - b.totalValue).slice(0, 500);
    if (!states.length) break;
  }
  return { slots, lineup: states[0] || null };
}

function renderXi() {
  const summary = document.getElementById("xiSummary");
  const pitch = document.getElementById("xiPitch");
  const body = document.getElementById("xiBody");
  if (!summary || !pitch || !body) return;
  const { slots, lineup } = optimizeXi();
  if (!lineup || lineup.players.length !== 11) {
    summary.innerHTML = `<div class="empty-state">No valid XI satisfies these constraints. Increase the budget, minutes threshold, or per-club limit.</div>`;
    pitch.innerHTML = "";
    body.innerHTML = "";
    return;
  }
  const selected = lineup.players.map((player, index) => ({ ...player, slot: `${slots[index]}${slots.slice(0, index + 1).filter(role => role === slots[index]).length}` }));
  const totalGoals = selected.reduce((sum, player) => sum + player.goals, 0);
  const totalAssists = selected.reduce((sum, player) => sum + player.assists, 0);
  const averageVfm = selected.reduce((sum, player) => sum + player.vfm, 0) / selected.length;
  summary.innerHTML = `
    <div class="detail-kpis">
      <div class="detail-kpi"><strong>${xiSettings.formation}</strong><span>Formation</span></div>
      <div class="detail-kpi"><strong>€${fmt(lineup.totalValue)}M</strong><span>Total market value</span></div>
      <div class="detail-kpi"><strong>${totalGoals}</strong><span>Combined goals</span></div>
      <div class="detail-kpi"><strong>${totalAssists}</strong><span>Combined assists</span></div>
      <div class="detail-kpi"><strong>${fmt(averageVfm, 1)}</strong><span>Average VFM score</span></div>
    </div>`;
  const rows = ["FW", "MF", "DF", "GK"];
  pitch.innerHTML = rows.map(role => `
    <div class="pitch-row pitch-${role.toLowerCase()}">
      ${selected.filter(player => player.position === role).map(player => `
        <div class="xi-player-card" style="--club-color:${tc(player.club)}">
          ${playerAvatar(player.player, player.club, 42)}
          <strong>${player.player}</strong><span>${sn(player.club)}</span>
          <small>${player.slot} · €${player.market_value_m}M · VFM ${fmt(player.vfm, 1)}</small>
        </div>`).join("")}
    </div>`).join("");
  body.innerHTML = selected.map(player => `
    <tr><td>${player.slot}</td><td class="name-col">${playerAvatar(player.player, player.club, 26)} ${player.player}</td>
    <td>${crestImg(player.club, 18)} ${sn(player.club)}</td><td>${player.position}</td><td>${player.mins.toLocaleString()}</td>
    <td>${player.goals}</td><td>${player.assists}</td><td>${fmt(player.perf90, 2)}</td><td>€${player.market_value_m}M</td><td class="vfm-col">${fmt(player.vfm, 1)}</td></tr>`).join("");
}

/* ════════════════════════════════════════════════════════════
   EXISTING TABLES
   ════════════════════════════════════════════════════════════ */
function renderStandingsTable() {
  const body = document.getElementById("standingsBody"); if (!body) return;
  const cl = [1, 2, 3, 4, 5], el = [6, 7], rel = [18, 19, 20];

  body.innerHTML = DATA.standings.map(t => {
    const pos    = t.position;
    const rowCls = pos === 1 ? "row-champion" : cl.includes(pos) ? "row-cl" : el.includes(pos) ? "row-el" : rel.includes(pos) ? "row-rel" : "";
    const gdCls  = t.GD > 0 ? "gd-pos" : t.GD < 0 ? "gd-neg" : "gd-zero";
    const gdStr  = t.GD > 0 ? `+${t.GD}` : String(t.GD);
    const ppm    = (t.Pts / t.MP).toFixed(2);
    const qual   = pos === 1 ? "🏆" : cl.includes(pos) ? "🔵" : el.includes(pos) ? "🟢" : rel.includes(pos) ? "🔴" : "";
    return `
    <tr class="${rowCls}">
      <td class="num-col">${pos}</td>
      <td class="name-col">${crestImg(t.team, 22)} ${t.team}${qual ? ` <span style="font-size:.75rem;opacity:.7">${qual}</span>` : ""}</td>
      <td>${t.MP}</td><td>${t.W}</td><td>${t.D}</td><td>${t.L}</td>
      <td class="goals-col">${t.GF}</td><td>${t.GA}</td>
      <td class="${gdCls}">${gdStr}</td>
      <td class="pts-col">${t.Pts}</td>
      <td style="color:var(--t3)">${ppm}</td>
    </tr>`;
  }).join("");
}

function renderScorersTable() {
  const body = document.getElementById("scorersBody"); if (!body) return;
  body.innerHTML = DATA.scorers.map(p => `
    <tr>
      <td class="num-col">${p.rank}</td>
      <td class="name-col">${playerAvatar(p.player, p.club, 28)} <span style="vertical-align:middle">${p.player}</span></td>
      <td>${crestImg(p.club, 20)} <span style="vertical-align:middle;font-size:.8rem">${p.club}</span></td>
      <td>${p.apps}</td>
      <td class="goals-col">${p.goals}</td>
      <td>${p.assists}</td>
      <td style="color:var(--cyan);font-weight:600">${p.goals + (p.assists || 0)}</td>
    </tr>`).join("");
}

function renderGKTable() {
  const body = document.getElementById("gkBody"); if (!body) return;
  body.innerHTML = DATA.goalkeeping.map(g => `
    <tr>
      <td class="num-col">${g.rank}</td>
      <td class="name-col">${playerAvatar(g.goalkeeper, g.club, 28)} <span style="vertical-align:middle">${g.goalkeeper}</span></td>
      <td>${crestImg(g.club, 20)} <span style="vertical-align:middle;font-size:.8rem">${g.club}</span></td>
      <td>${g.apps}</td>
      <td style="color:var(--green);font-weight:600">${g.clean_sheets}</td>
      <td style="color:var(--red)">${g.goals_conceded}</td>
    </tr>`).join("");
}

/* ════════════════════════════════════════════════════════════
   SEASON FACTS
   ════════════════════════════════════════════════════════════ */
function renderFacts() {
  const grid = document.getElementById("factsGrid"); if (!grid) return;
  const f = DATA.facts;
  const groups = [
    { title: "🏆 Season Summary", highlight: true, items: [
      { key: "Season Dates",     val: f["Season dates"]      },
      { key: "Champions",        val: f["Champions"]          },
      { key: "Relegated",        val: f["Relegated"]          },
      { key: "Total Matches",    val: f["Total matches played"] },
      { key: "Total Goals",      val: `${f["Total goals scored"]} (avg ${f["Average goals per match"]}/game)` },
      { key: "Avg Attendance",   val: f["Average attendance"] },
    ]},
    { title: "🥇 Individual Awards", highlight: true, items: [
      { key: "Golden Boot",      val: f["Golden Boot"]                     },
      { key: "Playmaker Award",  val: f["Playmaker Award (Assists)"]       },
      { key: "Golden Glove",     val: f["Golden Glove"]                    },
      { key: "Player of Season", val: f["Player of the Season"]            },
    ]},
    { title: "🌍 European Qualification", highlight: false, items: [
      { key: "Champions League (1–5)", val: f["Champions League (1–5)"]        },
      { key: "UCL (UEL Winners)",      val: f["Champions League (UEL winners)"]},
      { key: "Europa League (6–7)",    val: f["Europa League (6–7)"]           },
      { key: "Conference League",      val: f["Conference League (FA Cup)"]    },
    ]},
    { title: "📋 Record Moments", highlight: false, items: [
      { key: "Biggest Home Win",     val: f["Biggest home win"]         },
      { key: "Biggest Away Win",     val: f["Biggest away win"]         },
      { key: "Highest Scoring Game", val: f["Highest scoring match"]    },
      { key: "Longest Unbeaten Run", val: f["Longest unbeaten run"]     },
      { key: "First Relegated",      val: f["First relegated team"]     },
    ]},
  ];

  grid.innerHTML = groups.map(g => `
    <div class="fact-card ${g.highlight ? "highlight" : ""}">
      <div class="fact-section-title">${g.title}</div>
      ${g.items.filter(i => i.val).map(i => `
        <div style="margin-bottom:.75rem">
          <div class="fact-key">${i.key}</div>
          <div class="fact-val">${i.val}</div>
        </div>`).join("")}
    </div>`).join("");
}

// ── Boot ──────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", loadAll);
