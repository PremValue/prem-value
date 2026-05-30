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
  renderKPIs();
  renderHeroChips();
  renderAllCharts();
  renderStandingsTable();
  renderScorersTable();
  renderGKTable();
  renderFacts();
  // Pre-render data-only sections
  renderWageGrid();
  renderClubs();
  renderVFMTable();
  renderBargainGrid();
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
      label: "2024–25 Champions", sub: `${champ.Pts} points · ${champ.W}W ${champ.D}D ${champ.L}L`,
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
function showSection(name) {
  activeSection = name;
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  document.getElementById(`section${cap}`)?.classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b => {
    const t = b.textContent.replace(/[^\w]/g, "").toLowerCase();
    if (t.includes(name.toLowerCase().slice(0, 5))) b.classList.add("active");
  });
  renderAllCharts();
}

function renderAllCharts() {
  if (activeSection === "overview")  { renderOverviewPts(); renderOverviewGFGA(); renderOverviewWDL(); }
  if (activeSection === "attack")    { renderAttackScorers(); renderAttackAssists(); renderAttackTeamGoals(); }
  if (activeSection === "defence")   { renderDefGA(); renderDefCS(); renderDefScatter(); }
  if (activeSection === "finance")   { renderFinanceCharts(); }
  if (activeSection === "value")     { renderValueCharts(); }
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

// Compute cost-per-point and value index for each team
function buildFinanceMetrics() {
  const finMap = {};
  DATA.finances.forEach(f => finMap[f.team] = f);
  return DATA.standings.map(t => {
    const fin  = finMap[t.team] || {};
    const cost = fin.wage_bill_m || 0;
    const cpp  = t.Pts > 0 ? cost / t.Pts : 0;
    const cpg  = t.GF > 0  ? cost / t.GF  : 0;
    return { ...t, ...fin, cpp: parseFloat(cpp.toFixed(2)), cpg: parseFloat(cpg.toFixed(2)) };
  });
}

function buildValueIndex(metrics) {
  const avg = metrics.reduce((s, m) => s + m.cpp, 0) / metrics.length;
  return metrics.map(m => ({ ...m, valueIndex: parseFloat((m.cpp / avg).toFixed(3)) }));
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
    { icon: "📊",                     value: `£${topVal.squad_value_m}M`, label: `Highest Squad Value — ${sn(topVal.team)}`, sub: `${topVal.Pts} pts this season`, accent: `linear-gradient(90deg,${C.purple},${C.blue})` },
  ].map((k, i) => `
    <div class="kpi-card" style="--kpi-accent:${k.accent};animation-delay:${i * 0.07}s">
      <div class="kpi-icon">${k.icon}</div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join("");
}

function renderFinanceCharts() {
  const raw     = buildFinanceMetrics();
  const metrics = buildValueIndex(raw);

  renderFinanceKPIs(metrics);

  // Squad value chart
  destroyChart("cFinSquadVal");
  const ctx1 = document.getElementById("cFinSquadVal"); if (!ctx1) return;
  const byVal = [...metrics].sort((a, b) => b.squad_value_m - a.squad_value_m);
  charts["cFinSquadVal"] = new Chart(ctx1, {
    type: "bar", data: {
      labels: byVal.map(t => sn(t.team)),
      datasets: [{ label: "Squad Value (£M)", data: byVal.map(t => t.squad_value_m),
        backgroundColor: byVal.map(t => tc(t.team) + "cc"), borderColor: byVal.map(t => tc(t.team)),
        borderWidth: 1.5, borderRadius: 5, borderSkipped: false }]
    },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: "y",
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => ` £${c.parsed.x}M squad value` } } },
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

// ── Famous Player Wage Cards ──────────────────────────────────
function renderWageGrid() {
  const el = document.getElementById("wageGrid"); if (!el) return;
  const maxWage = 400; // max weekly wage for scale

  el.innerHTML = DATA.finances.map(f => {
    const st = DATA.standings.find(s => s.team === f.team) || {};
    return `
    <div class="wage-card">
      <div class="wage-card-header" style="background:linear-gradient(135deg,${tbg(f.team)},${tc(f.team)}22)">
        <div class="wage-club-logo">${crestImg(f.team, 44)}</div>
        <div class="wage-club-info">
          <div class="wage-club-name">${f.team}</div>
          <div class="wage-club-meta">
            <span class="tag-pill" style="background:${tc(f.team)}22;color:${tc(f.team)}">#${st.position || "–"}</span>
            <span class="tag-pill">£${f.squad_value_m}M squad</span>
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
    const perf90 = p.mins > 0 ? parseFloat(((p.goals + p.assists) / p.mins * 90).toFixed(3)) : 0;
    const vfm    = p.market_value_m > 0 ? parseFloat((perf90 / p.market_value_m * 100).toFixed(3)) : 0;
    return { ...p, perf90, vfm };
  });
}

function computeBargains(players) {
  const groups = {};
  players.forEach(p => {
    const pos = p.position === "CB" ? "DF" : p.position;
    if (!groups[pos]) groups[pos] = [];
    groups[pos].push(p);
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
    const isBargain = p.mins >= 900
      && p.perf90 >= med.perf90
      && p.market_value_m <= med.value;
    return { ...p, isBargain, medians: med };
  });
}

function renderValueKPIs(players) {
  const byVfm  = [...players].sort((a, b) => b.vfm  - a.vfm);
  const byPerf = [...players].sort((a, b) => b.perf90 - a.perf90);
  const bargains = players.filter(p => p.isBargain);
  const topBargain = [...bargains].sort((a, b) => b.vfm - a.vfm)[0] || byVfm[0];

  document.getElementById("valueKpis").innerHTML = [
    { icon: crestImg(byVfm[0].club, 32), value: byVfm[0].player,
      label: "Top VFM Score", sub: `VFM ${byVfm[0].vfm.toFixed(1)} · £${byVfm[0].market_value_m}M · ${byVfm[0].club}`,
      accent: `linear-gradient(90deg,${C.green},${C.cyan})` },
    { icon: "🏹", value: byPerf[0].player,
      label: "Best Output per 90", sub: `${byPerf[0].perf90.toFixed(2)} perf/90 · ${byPerf[0].goals}G ${byPerf[0].assists}A`,
      accent: `linear-gradient(90deg,${C.purple},${C.pink})` },
    { icon: "🏷️", value: bargains.length + " Players",
      label: "Bargain Players Found", sub: `Top: ${topBargain?.player || "–"}`,
      accent: `linear-gradient(90deg,${C.yellow},${C.orange})` },
    { icon: "💎", value: topBargain?.player || "–",
      label: "Best Bargain", sub: `£${topBargain?.market_value_m}M · ${topBargain?.goals}G ${topBargain?.assists}A`,
      accent: `linear-gradient(90deg,${C.cyan},${C.blue})` },
  ].map((k, i) => `
    <div class="kpi-card" style="--kpi-accent:${k.accent};animation-delay:${i * 0.07}s">
      <div class="kpi-icon">${k.icon}</div>
      <div class="kpi-value" style="font-size:1.2rem">${k.value}</div>
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join("");
}

function renderValueCharts() {
  const raw     = cleanPlayers();
  const withVfm = computeVFM(raw);
  const players = computeBargains(withVfm);

  renderValueKPIs(players);

  // Scatter: Perf/90 vs Market Value
  destroyChart("cValScatter");
  const ctx1 = document.getElementById("cValScatter"); if (!ctx1) return;
  const validP = players.filter(p => p.mins >= 500);
  charts["cValScatter"] = new Chart(ctx1, {
    type: "scatter", data: {
      datasets: [{
        label: "Players",
        data: validP.map(p => ({ x: p.market_value_m, y: p.perf90, player: p.player, club: p.club, bargain: p.isBargain })),
        backgroundColor: validP.map(p => p.isBargain ? C.green + "ee" : tc(p.club) + "bb"),
        borderColor:     validP.map(p => p.isBargain ? C.green         : tc(p.club)),
        borderWidth: validP.map(p => p.isBargain ? 2 : 1),
        pointRadius: validP.map(p => p.isBargain ? 9 : 6),
        pointHoverRadius: 12,
      }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${c.raw.player} (${c.raw.club})  £${c.raw.x}M  Perf/90: ${c.raw.y}  ${c.raw.bargain ? "🏷️ Bargain" : ""}` } } },
      scales: {
        x: { title: { display: true, text: "Market Value (£M)", color: "#64748b" }, grid: { color: "rgba(255,255,255,0.05)" } },
        y: { title: { display: true, text: "Performance per 90",  color: "#64748b" }, grid: { color: "rgba(255,255,255,0.05)" } }
      }
    }
  });

  // VFM Bar chart — top 25
  destroyChart("cValRanking");
  const ctx2 = document.getElementById("cValRanking"); if (!ctx2) return;
  const top25 = [...players].filter(p => p.mins >= 900).sort((a, b) => b.vfm - a.vfm).slice(0, 25);
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
          return ` VFM: ${c.parsed.x.toFixed(1)}  |  £${p.market_value_m}M  |  ${p.goals}G ${p.assists}A  ${p.isBargain ? "🏷️" : ""}`;
        }}}},
      scales: { x: { grid: { color: "rgba(255,255,255,0.05)" } }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } }
    }
  });
}

// ── Bargain Player Feature Cards ──────────────────────────────
function renderBargainGrid() {
  const raw     = cleanPlayers();
  const withVfm = computeVFM(raw);
  const players = computeBargains(withVfm);
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
          <div class="bc-stat"><div class="bc-stat-val">${p.perf90.toFixed(2)}</div><div class="bc-stat-lbl">Perf/90</div></div>
          <div class="bc-stat"><div class="bc-stat-val">£${p.market_value_m}M</div><div class="bc-stat-lbl">Value</div></div>
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
function renderVFMTable() {
  const body = document.getElementById("vfmBody"); if (!body) return;
  const raw     = cleanPlayers();
  const withVfm = computeVFM(raw);
  const players = computeBargains(withVfm);
  const sorted  = [...players].filter(p => p.mins >= 500).sort((a, b) => b.vfm - a.vfm);

  body.innerHTML = sorted.map((p, i) => `
    <tr class="${p.isBargain ? "row-bargain" : ""}">
      <td class="num-col">${i + 1}</td>
      <td class="name-col">${playerAvatar(p.player, p.club, 28)} <span style="vertical-align:middle">${p.player}</span></td>
      <td>${crestImg(p.club, 20)} <span style="vertical-align:middle;font-size:.8rem">${sn(p.club)}</span></td>
      <td><span class="pos-badge pos-${p.position.toLowerCase()}">${p.position}</span></td>
      <td>${p.mins.toLocaleString()}</td>
      <td class="goals-col">${p.goals}</td>
      <td style="color:var(--cyan)">${p.assists}</td>
      <td style="color:var(--green);font-weight:600">${p.perf90.toFixed(2)}</td>
      <td>£${p.market_value_m}M</td>
      <td class="vfm-col">${p.vfm.toFixed(1)}</td>
      <td>${p.isBargain ? '<span class="bargain-tag">🏷️ Yes</span>' : '<span style="color:var(--t3)">–</span>'}</td>
    </tr>`).join("");
}

/* ════════════════════════════════════════════════════════════
   CLUBS SECTION
   ════════════════════════════════════════════════════════════ */
function renderClubs() {
  const el = document.getElementById("clubsGrid"); if (!el) return;
  const finMap = {};
  DATA.finances.forEach(f => finMap[f.team] = f);

  el.innerHTML = DATA.standings.map(t => {
    const fin = finMap[t.team] || {};
    const col = tc(t.team);
    const pos = t.position;
    const badge = pos === 1 ? "🏆 Champions"
      : [2,3,4,5].includes(pos) ? "🔵 UCL"
      : [6,7].includes(pos) ? "🟢 UEL"
      : [18,19,20].includes(pos) ? "🔴 Relegated"
      : "";
    const cpp = fin.wage_bill_m && t.Pts ? (fin.wage_bill_m / t.Pts).toFixed(1) : "–";

    return `
    <div class="club-card" style="--club-color:${col};--club-bg:${tbg(t.team)}">
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
            <div class="cc-fin-val">£${fin.squad_value_m || "–"}M</div>
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
    </div>`;
  }).join("");
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
