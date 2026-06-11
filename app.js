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

// -- Team metadata (color · emoji · crest) --------------------
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

// Normalize a name for fuzzy matching (lowercase, strip diacritics, strip non-alpha)
const normName = s => s.toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

// Fallback: replace failed photo with an initials circle
function avatarFallback(img) {
  const d = img.parentNode;
  d.innerHTML = d.dataset.init;
  d.className = "p-avatar";
  d.style.background = d.dataset.bg;
  d.style.color = d.dataset.col;
  d.style.fontSize = (d.dataset.size * 0.35) + "px";
}

// Player avatar — FPL headshot when available, initials circle fallback
function playerAvatar(name, club, size = 48) {
  const parts = name.split(" ");
  const init  = (parts[0][0] + (parts[parts.length - 1][0] || "")).toUpperCase();
  const col   = tc(club);
  const bg    = col + "33";
  const code  = PLAYER_PHOTO_IDS[name];
  if (code) {
    const url = `https://resources.premierleague.com/premierleague/photos/players/110x140/p${code}.png`;
    return `<div class="p-avatar p-avatar-img" style="width:${size}px;height:${size}px;border:2px solid ${col}"
      data-init="${init}" data-col="${col}" data-bg="${bg}" data-size="${size}">
      <img src="${url}" alt="${name}" onerror="avatarFallback(this)">
    </div>`;
  }
  return `<div class="p-avatar" style="width:${size}px;height:${size}px;background:${bg};border:2px solid ${col};font-size:${size * 0.35}px;color:${col}">${init}</div>`;
}

// Position icon & label
const POS_ICON  = { FW:"⚽", MF:"🔀", DF:"🛡️", GK:"🧤", CB:"🛡️" };
const POS_LABEL = { FW:"Forward", MF:"Midfielder", DF:"Defender", GK:"Goalkeeper", CB:"Defender" };
const posIcon   = p => POS_ICON[p]  || "⚽";
const posLabel  = p => POS_LABEL[p] || p;

// -- Chart registry --------------------------------------------
const charts = {};
function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

// -- State -----------------------------------------------------
let DATA = {};
let activeSection = "overview";
let selectedTeam = "";
let financeSort = { key: "value_rank", direction: "asc" };
let tacticsTeams = ["Liverpool", "Arsenal"];
let playerFilters = {
  search: "", club: "all", position: "all", age: "all",
  minMinutes: 500, valuation: "all", rankingMethod: "adjusted_vfm",
  minValue: 0, bargainOnly: false,
};
let xiSettings = { formation: "4-3-3", objective: "balanced", minMinutes: 900, maxValue: "", maxPerClub: 3 };
let scatterSettings = { trendScope: "position", quadrantMode: "position", labelMode: "outliers" };
let healthUiState = { open: false, severity: "all", search: "", expanded: [] };
let financeComparison = { a: "Brentford", b: "Liverpool" };
let healthSearchTimer = null;
let PLAYER_PHOTO_IDS = {};
let xiLocks = [];
let xiExclusions = [];
let xiSelectedAlternative = 0;
let xiManualSwaps = {};
let xiSwapSlot = "";
let xiReplacementSearch = "";
let xiShowAllCandidates = false;
let xiLastSimResult = null;
// Builder state
let xiBuilderSquad = {};   // slotLabel → playerKey (e.g. "GK1" → "David Raya|Arsenal")
let xiPickerSlot   = "";   // which slot's picker is open
let xiPickerSearch = "";
let xiPositionBudgets = { GK: "", DF: "", MF: "", FW: "" };

// Players permanently excluded from the XI builder out of respect
const XI_MEMORIAL_EXCLUSIONS = new Set(["Diogo Jota|Liverpool"]);
const DEFAULT_VALUE_POLICY = {
  explorer_min_minutes: 500,
  featured_min_minutes: 900,
  valuation_stale_days: 180,
};

const valuePolicy = () => ({ ...DEFAULT_VALUE_POLICY, ...(DATA._meta?.player_value_policy || {}) });
const financeSource = id => (DATA.finance_sources || []).find(source => source.id === id);
const clubValueComparisonSource = () => DATA.club_value_references?.source;
const hasFreshValue = p => p.market_value_m > 0 && p.valuation_status === "fresh";
const isExplorerEligible = p => p.mins >= valuePolicy().explorer_min_minutes && p.market_value_m > 0;
const isFeaturedEligible = p => p.mins >= valuePolicy().featured_min_minutes && hasFreshValue(p);
const teamMetric = team => (DATA.team_metrics || []).find(metric => metric.team === team);
const standingFor = team => (DATA.standings || []).find(standing => standing.team === team);
const squadFor = team => (DATA.squads || []).find(squad => squad.team === team);
const financeFor = team => (DATA.finances || []).find(finance => finance.team === team);
const squadValuationFor = team => (DATA.squad_valuations || []).find(value => value.team === team);
const playerKey = player => `${player.player}|${player.club}`;
const parseListParam = value => value ? value.split("~").filter(Boolean) : [];
const serializeListParam = values => values.length ? values.join("~") : "";
const optionParam = (params, key, options, fallback) => options.includes(params.get(key)) ? params.get(key) : fallback;
const fmt = (value, digits = 1) => Number(value).toFixed(digits);
const signed = (value, digits = 1) => `${value > 0 ? "+" : ""}${fmt(value, digits)}`;
const encodedTeam = team => encodeURIComponent(team);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const csvEscape = value => {
  const text = String(value ?? "");
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};
const buildCsv = (headers, rows) => "\uFEFF" + [headers, ...rows]
  .map(row => row.map(csvEscape).join(",")).join("\r\n");
const slug = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function setExportStatus(id, message) {
  const status = document.getElementById(id);
  if (status) status.textContent = message;
}

function triggerDownload(filename, href) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
}

function downloadTextFile(filename, content, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  triggerDownload(filename, url);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function copyCurrentViewLink(statusId) {
  syncUrlState();
  try {
    await navigator.clipboard.writeText(window.location.href);
    setExportStatus(statusId, "Link copied.");
  } catch {
    setExportStatus(statusId, `Copy unavailable. Use the current page URL: ${window.location.href}`);
  }
}

function downloadChartPng(chartId, filename, statusId) {
  const chart = charts[chartId];
  if (!chart) {
    setExportStatus(statusId, "Open this view before downloading its chart.");
    return;
  }
  triggerDownload(filename, chart.toBase64Image());
  setExportStatus(statusId, "Chart PNG downloaded.");
}

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const requestedSection = params.get("section");
  if (["overview", "attack", "defence", "standings", "tactics", "finance", "value", "clubs", "xi", "compare", "xg", "timeline", "transfers", "facts"].includes(requestedSection)) {
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
    rankingMethod: params.get("ranking") || "adjusted_vfm",
    minValue: Number(params.get("minValue") || 0),
    bargainOnly: params.get("bargains") === "1",
  };
  scatterSettings = {
    trendScope: optionParam(params, "trend", ["position", "all", "hide"], "position"),
    quadrantMode: optionParam(params, "quadrants", ["position", "league", "hide"], "position"),
    labelMode: optionParam(params, "labels", ["outliers", "bargains", "position", "hide"], "outliers"),
  };
  healthUiState = {
    open: params.get("health") === "open",
    severity: optionParam(params, "healthSeverity", ["all", "warning", "info", "ok"], "all"),
    search: params.get("healthSearch") || "",
    expanded: parseListParam(params.get("healthExpanded")),
  };
  financeComparison = {
    a: params.get("compareA") || "Brentford",
    b: params.get("compareB") || "Liverpool",
  };
  xiSettings = {
    formation: params.get("formation") || "4-3-3",
    objective: params.get("xiObjective") || "balanced",
    minMinutes: Number(params.get("xiMins") || 900),
    maxValue: params.get("budget") || "",
    maxPerClub: Number(params.get("clubLimit") || 3),
  };
  xiLocks = parseListParam(params.get("locks"));
  xiExclusions = parseListParam(params.get("exclusions"));
  xiSelectedAlternative = Number(params.get("alternative") || 0);
  xiManualSwaps = Object.fromEntries(
    parseListParam(params.get("swaps")).map(value => {
      const separator = value.indexOf("=");
      return separator > 0 ? [value.slice(0, separator), value.slice(separator + 1)] : ["", ""];
    }).filter(([slot, key]) => slot && key)
  );
  // Builder squad
  xiBuilderSquad = {};
  const squadParam = params.get("squad");
  if (squadParam) {
    squadParam.split("~").forEach(pair => {
      const eq = pair.indexOf("=");
      if (eq > 0) {
        xiBuilderSquad[pair.slice(0, eq)] = decodeURIComponent(pair.slice(eq + 1));
      }
    });
  }
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
  if (playerFilters.rankingMethod !== "adjusted_vfm") params.set("ranking", playerFilters.rankingMethod);
  if (playerFilters.minValue) params.set("minValue", playerFilters.minValue);
  if (playerFilters.bargainOnly) params.set("bargains", "1");
  if (scatterSettings.trendScope !== "position") params.set("trend", scatterSettings.trendScope);
  if (scatterSettings.quadrantMode !== "position") params.set("quadrants", scatterSettings.quadrantMode);
  if (scatterSettings.labelMode !== "outliers") params.set("labels", scatterSettings.labelMode);
  if (healthUiState.open) params.set("health", "open");
  if (healthUiState.severity !== "all") params.set("healthSeverity", healthUiState.severity);
  if (healthUiState.search) params.set("healthSearch", healthUiState.search);
  if (healthUiState.expanded.length) params.set("healthExpanded", serializeListParam(healthUiState.expanded));
  if (financeComparison.a !== "Brentford") params.set("compareA", financeComparison.a);
  if (financeComparison.b !== "Liverpool") params.set("compareB", financeComparison.b);
  if (xiSettings.formation !== "4-3-3") params.set("formation", xiSettings.formation);
  if (xiSettings.objective !== "balanced") params.set("xiObjective", xiSettings.objective);
  if (xiSettings.minMinutes !== 900) params.set("xiMins", xiSettings.minMinutes);
  if (xiSettings.maxValue) params.set("budget", xiSettings.maxValue);
  if (xiSettings.maxPerClub !== 3) params.set("clubLimit", xiSettings.maxPerClub);
  if (xiLocks.length) params.set("locks", serializeListParam(xiLocks));
  if (xiExclusions.length) params.set("exclusions", serializeListParam(xiExclusions));
  if (xiSelectedAlternative) params.set("alternative", xiSelectedAlternative);
  const swaps = Object.entries(xiManualSwaps).map(([slot, key]) => `${slot}=${key}`);
  if (swaps.length) params.set("swaps", serializeListParam(swaps));
  // Builder squad
  const squadPairs = Object.entries(xiBuilderSquad)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  if (squadPairs.length) params.set("squad", squadPairs.join("~"));
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

// -- Load generated dashboard bundle ---------------------------
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
  renderFinanceComparisonControls();
  renderDataHealth();
  renderValuationDiscrepancies();
  renderTacticControls();
  renderTeamEfficiencyTable();
  renderPlayerControls();
  renderClubs();
  renderXiControls();
  renderXiRosterControls();
  renderXiBuilder();
  renderXiPositionBudgets();
  renderCompareControls();
  renderTransferControls();
  showSection(activeSection, { scroll: false });
  loadFplPhotos(); // async — patches PLAYER_PHOTO_IDS then re-renders
}

/* ════════════════════════════════════════════════════════════
   FPL PLAYER PHOTOS
   Single fetch to the official FPL API; matches player names via
   normalised string comparison; photos served from Premier League CDN.
   ════════════════════════════════════════════════════════════ */
async function loadFplPhotos() {
  try {
    const res = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/");
    if (!res.ok) return;
    const fpl = await res.json();

    // Build lookups: normalised full name → code, normalised web_name → code
    const byFull = {}, byWeb = {};
    for (const el of fpl.elements) {
      const full = normName(el.first_name + " " + el.second_name);
      const web  = normName(el.web_name);
      byFull[full] = el.code;
      byWeb[web]   = el.code;
    }

    const match = name => {
      const n  = normName(name);
      const ws = n.split(" ");
      const last  = ws[ws.length - 1];
      const after = ws.slice(1).join(" ");
      return byFull[n] || byWeb[last] || byFull[after] || byWeb[after] || null;
    };

    PLAYER_PHOTO_IDS = {};
    // All outfield players
    for (const p of DATA.players || [])     { const c = match(p.player);      if (c) PLAYER_PHOTO_IDS[p.player]      = c; }
    // Goalkeepers table uses different name field
    for (const g of DATA.goalkeeping || []) { const c = match(g.goalkeeper);  if (c) PLAYER_PHOTO_IDS[g.goalkeeper]  = c; }
    // Scorers / assists lists
    for (const p of DATA.scorers || [])     { const c = match(p.player);      if (c) PLAYER_PHOTO_IDS[p.player]      = c; }
    for (const p of DATA.assists || [])     { const c = match(p.player);      if (c) PLAYER_PHOTO_IDS[p.player]      = c; }

    // Re-render everywhere player avatars appear
    renderScorersTable();
    renderGKTable();
    renderWageGrid();
    renderXi();
    renderAllCharts();
  } catch (_) { /* FPL API unreachable — keep initials */ }
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
  if (activeSection === "overview")   { renderOverviewPts(); renderOverviewGFGA(); renderOverviewWDL(); }
  if (activeSection === "attack")     { renderAttackScorers(); renderAttackAssists(); renderAttackTeamGoals(); }
  if (activeSection === "defence")    { renderDefGA(); renderDefCS(); renderDefScatter(); }
  if (activeSection === "tactics")    { renderTactics(); }
  if (activeSection === "finance")    { renderFinanceCharts(); }
  if (activeSection === "value")      { renderPlayerExplorer(); }
  if (activeSection === "clubs")      { if (selectedTeam) renderClubs(); }
  if (activeSection === "compare")    { renderCompare(); }
  if (activeSection === "xg")         { renderXg(); }
  if (activeSection === "timeline")   { renderTimeline(); }
  if (activeSection === "transfers")  { renderTransfers(); }
  if (activeSection === "xi")         { renderXiBuilder(); }
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

function financeComparisonRecord(team) {
  const metric = teamMetric(team);
  const standing = standingFor(team);
  const squad = squadFor(team);
  return metric && standing ? { ...standing, ...squad, ...metric } : null;
}

const FINANCE_COMPARISON_FIELDS = [
  ["league_position", "League position"],
  ["points", "Points"],
  ["goals_for", "Goals for"],
  ["GA", "Goals against"],
  ["wage_bill_m", "Annual wage bill GBP M"],
  ["squad_value_m", "Squad market value EUR M"],
  ["cost_per_point", "Cost per point GBP M"],
  ["cost_per_goal", "Cost per goal GBP M"],
  ["value_index", "Value index"],
  ["predicted_points", "Expected points"],
  ["residual_points", "Residual points"],
  ["possession", "Possession percent"],
  ["xG", "Expected goals xG"],
  ["xGA", "Expected goals against xGA"],
  ["clean_sheets", "Clean sheets"],
];

function renderFinanceComparisonControls() {
  const first = document.getElementById("financeCompareA");
  const second = document.getElementById("financeCompareB");
  if (!first || !second) return;
  const options = DATA.standings.map(team => `<option value="${team.team}">${team.team}</option>`).join("");
  first.innerHTML = options;
  second.innerHTML = options;
  if (!standingFor(financeComparison.a)) financeComparison.a = "Brentford";
  if (!standingFor(financeComparison.b) || financeComparison.a === financeComparison.b) financeComparison.b = "Liverpool";
  first.value = financeComparison.a;
  second.value = financeComparison.b;
}

function updateFinanceComparison(key, team) {
  if (!standingFor(team)) return;
  financeComparison[key] = team;
  if (financeComparison.a === financeComparison.b) {
    financeComparison[key === "a" ? "b" : "a"] = DATA.standings.find(row => row.team !== team).team;
  }
  renderFinanceComparisonControls();
  syncUrlState();
  renderFinanceComparison();
}

function setFinanceComparisonClub(teamValue) {
  const team = decodeURIComponent(teamValue || "");
  if (!standingFor(team)) return;
  const key = financeComparison.a === team ? "b" : "a";
  updateFinanceComparison(key, team);
  showSection("finance");
}

function swapFinanceComparison() {
  financeComparison = { a: financeComparison.b, b: financeComparison.a };
  renderFinanceComparisonControls();
  syncUrlState();
  renderFinanceComparison();
}

function resetFinanceComparison() {
  financeComparison = { a: "Brentford", b: "Liverpool" };
  renderFinanceComparisonControls();
  syncUrlState();
  renderFinanceComparison();
}

async function copyFinanceComparisonLink() {
  await copyCurrentViewLink("financeCompareStatus");
}

function exportTeamEfficiencyCsv() {
  const rows = [...(DATA.team_metrics || [])].sort((a, b) => a.value_rank - b.value_rank);
  downloadTextFile("premvalue-team-efficiency-2024-2025.csv", buildCsv(
    ["Rank", "Club", "League Position", "Points", "Goals For", "Squad Value EUR M", "Annual Wages GBP M", "Cost Per Point GBP M", "Cost Per Goal GBP M", "Value Index", "Expected Points", "Residual Points"],
    rows.map(row => [row.value_rank, row.team, row.league_position, row.points, row.goals_for, row.squad_value_m, row.wage_bill_m, row.cost_per_point, row.cost_per_goal, row.value_index, row.predicted_points, row.residual_points])
  ));
  setExportStatus("financeExportStatus", "Team efficiency CSV downloaded.");
}

function exportFinanceComparisonCsv() {
  const a = financeComparisonRecord(financeComparison.a);
  const b = financeComparisonRecord(financeComparison.b);
  if (!a || !b) return;
  downloadTextFile(`premvalue-${slug(a.team)}-vs-${slug(b.team)}-2024-2025.csv`, buildCsv(
    ["Metric", a.team, b.team, "Difference (A - B)"],
    FINANCE_COMPARISON_FIELDS.map(([key, label]) => [
      label,
      a[key],
      b[key],
      a[key] == null || b[key] == null ? "" : a[key] - b[key],
    ])
  ));
  setExportStatus("financeCompareStatus", "Comparison CSV downloaded.");
}

function renderFinanceComparison() {
  const a = financeComparisonRecord(financeComparison.a);
  const b = financeComparisonRecord(financeComparison.b);
  const body = document.getElementById("financeCompareBody");
  if (!a || !b || !body) return;
  document.getElementById("financeCompareHeadA").textContent = a.team;
  document.getElementById("financeCompareHeadB").textContent = b.team;
  const status = document.getElementById("financeCompareStatus");
  if (status) status.textContent = `${a.team} compared with ${b.team}`;
  const fields = [
    { key: "league_position", label: "League position", digits: 0 },
    { key: "points", label: "Points", digits: 0 },
    { key: "goals_for", label: "Goals for", digits: 0 },
    { key: "GA", label: "Goals against", digits: 0, lower: true },
    { key: "wage_bill_m", label: "Annual wage bill", prefix: "£", suffix: "M", digits: 1, lower: true },
    { key: "squad_value_m", label: "Squad market value", prefix: "€", suffix: "M", digits: 1, lower: true },
    { key: "cost_per_point", label: "Cost per point", prefix: "£", suffix: "M", digits: 2, lower: true },
    { key: "cost_per_goal", label: "Cost per goal", prefix: "£", suffix: "M", digits: 2, lower: true },
    { key: "value_index", label: "Value index", digits: 2, lower: true },
    { key: "predicted_points", label: "Expected points", digits: 1 },
    { key: "residual_points", label: "Residual points", digits: 1 },
    { key: "possession", label: "Possession", suffix: "%", digits: 1 },
    { key: "xG", label: "Expected goals (xG)", digits: 1 },
    { key: "xGA", label: "Expected goals against (xGA)", digits: 1, lower: true },
    { key: "clean_sheets", label: "Clean sheets", digits: 0 },
  ];
  const formatMetric = (value, field, difference = false) => {
    if (value == null) return "Unavailable";
    const sign = difference && value > 0 ? "+" : "";
    return `${sign}${field.prefix || ""}${fmt(value, field.digits)}${field.suffix || ""}`;
  };
  body.innerHTML = fields.map(field => {
    const av = a[field.key], bv = b[field.key];
    const difference = av == null || bv == null ? null : av - bv;
    const good = difference == null ? "" : (field.lower ? difference < 0 : difference > 0) ? "metric-good" : difference ? "metric-bad" : "metric-neutral";
    return `<tr><td class="name-col">${field.label}</td><td>${formatMetric(av, field)}</td><td>${formatMetric(bv, field)}</td><td class="${good}">${formatMetric(difference, field, true)}</td></tr>`;
  }).join("");

  const insights = [
    `${a.team} spends ${formatMetric(Math.abs(a.wage_bill_m - b.wage_bill_m), { prefix: "£", suffix: "M", digits: 1 })} ${a.wage_bill_m < b.wage_bill_m ? "less" : "more"} on annual wages than ${b.team}.`,
    `${a.team} earned ${Math.abs(a.points - b.points)} ${a.points >= b.points ? "more" : "fewer"} points and finished ${Math.abs(a.league_position - b.league_position)} places ${a.league_position <= b.league_position ? "higher" : "lower"}.`,
    `${a.team} delivered ${signed(a.residual_points)} points against wage-based expectation; ${b.team} delivered ${signed(b.residual_points)}.`,
    `${a.team} recorded ${fmt(a.cost_per_point, 2) === fmt(b.cost_per_point, 2) ? "the same" : a.cost_per_point < b.cost_per_point ? "a lower" : "a higher"} cost per point than ${b.team}.`,
  ];
  document.getElementById("financeCompareInsights").innerHTML = insights.map(insight => `<p>${insight}</p>`).join("");

  const metrics = buildFinanceMetrics();
  const average = key => metrics.reduce((sum, row) => sum + row[key], 0) / metrics.length;
  const profile = [
    { label: "Points", key: "points" },
    { label: "Goals", key: "goals_for" },
    { label: "Wage efficiency", key: "cost_per_point", lower: true },
    { label: "Residual", value: row => 100 + row.residual_points },
    { label: "xG", key: "xG", source: row => squadFor(row.team) },
    { label: "xGA efficiency", key: "xGA", lower: true, source: row => squadFor(row.team) },
  ];
  const normalized = (row, item) => {
    if (item.value) return item.value(row);
    const source = item.source ? item.source(row) : row;
    const values = item.source ? DATA.squads : metrics;
    const value = source?.[item.key];
    const avg = values.reduce((sum, valueRow) => sum + (valueRow[item.key] || 0), 0) / values.length;
    if (value == null || !avg) return null;
    return item.lower ? avg / value * 100 : value / avg * 100;
  };

  destroyChart("cFinCompareProfile");
  const ctxProfile = document.getElementById("cFinCompareProfile"); if (!ctxProfile) return;
  charts["cFinCompareProfile"] = new Chart(ctxProfile, {
    type: "radar",
    data: { labels: profile.map(item => item.label), datasets: [
      { label: a.team, data: profile.map(item => normalized(a, item)), borderColor: tc(a.team), backgroundColor: tc(a.team) + "33", pointBackgroundColor: tc(a.team) },
      { label: b.team, data: profile.map(item => normalized(b, item)), borderColor: tc(b.team), backgroundColor: tc(b.team) + "22", pointBackgroundColor: tc(b.team) },
    ]},
    options: { responsive: true, maintainAspectRatio: false, scales: { r: { beginAtZero: true, grid: { color: "rgba(255,255,255,.08)" }, angleLines: { color: "rgba(255,255,255,.08)" } } } },
  });
  destroyChart("cFinComparePoints");
  const ctxPoints = document.getElementById("cFinComparePoints"); if (!ctxPoints) return;
  charts["cFinComparePoints"] = new Chart(ctxPoints, {
    type: "bar",
    data: { labels: [a.team, b.team], datasets: [
      { label: "Expected points", data: [a.predicted_points, b.predicted_points], backgroundColor: C.cyan + "88", borderColor: C.cyan, borderWidth: 1.5 },
      { label: "Actual points", data: [a.points, b.points], backgroundColor: [tc(a.team) + "cc", tc(b.team) + "cc"], borderColor: [tc(a.team), tc(b.team)], borderWidth: 1.5 },
    ]},
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: "rgba(255,255,255,.05)" } } } },
  });
  destroyChart("cFinCompareResources");
  const ctxResources = document.getElementById("cFinCompareResources"); if (!ctxResources) return;
  charts["cFinCompareResources"] = new Chart(ctxResources, {
    type: "bar",
    data: { labels: [a.team, b.team], datasets: [
      { label: "Annual wage bill (£M)", data: [a.wage_bill_m, b.wage_bill_m], backgroundColor: C.orange + "aa", yAxisID: "yGbp" },
      { label: "Squad market value (€M)", data: [a.squad_value_m, b.squad_value_m], backgroundColor: C.purple + "aa", yAxisID: "yEur" },
    ]},
    options: { responsive: true, maintainAspectRatio: false, scales: {
      yGbp: { type: "linear", position: "left", title: { display: true, text: "Annual wage bill (£M)" }, grid: { color: "rgba(255,255,255,.05)" } },
      yEur: { type: "linear", position: "right", title: { display: true, text: "Squad market value (€M)" }, grid: { drawOnChartArea: false } },
    }},
  });
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
  renderFinanceComparison();
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
        <td><button class="table-action" onclick="openTeamDetail('${encodedTeam(team.team)}')">View team</button> <button class="table-action" onclick="setFinanceComparisonClub('${encodedTeam(team.team)}')">Compare</button></td>
      </tr>`;
  }).join("");
}

function renderFinanceMethodology() {
  const el = document.getElementById("financeMethodology"); if (!el) return;
  const sources = DATA.finance_sources || [];
  const comparisonSource = clubValueComparisonSource();
  el.innerHTML = `
    <div class="method-title">Finance data methodology</div>
    <div class="method-copy">
      Wage bills use rounded Capology combined gross annual base-payroll estimates for 2024-2025.
      Capology notes that historical combined payrolls may include mid-season transfers and exclude
      bonuses and club staff. Canonical squad values are reproducible euro aggregates of dated
      player valuations. Curated Transfermarkt club totals remain separated, low-confidence comparison references.
    </div>
    <div class="method-links">
      ${sources.map(source => `
        ${sourceLink(source)}
        ${confidenceBadge(source)}
      `).join("")}
      ${sourceLink(comparisonSource, "club totals comparison")}
      ${confidenceBadge(comparisonSource)}
    </div>`;
}

function healthAffectedItem(item) {
  const status = item.status ? `<span class="health-status">${escapeHtml(item.status)}</span>` : "";
  const difference = item.difference_pct == null ? "" : `<span>${signed(item.difference_pct)}%</span>`;
  const source = item.source_url
    ? `<a href="${escapeHtml(item.source_url)}" target="_blank" rel="noopener noreferrer">source</a>`
    : "";
  return `<li><strong>${escapeHtml(item.label)}</strong>${item.club ? `<span>${escapeHtml(item.club)}</span>` : ""}${status}${difference}${source}</li>`;
}

function healthCounts(records) {
  return records.reduce((counts, record) => {
    counts[record.severity] = (counts[record.severity] || 0) + 1;
    return counts;
  }, { warning: 0, info: 0, ok: 0 });
}

function updateHealthState(key, value) {
  healthUiState[key] = value;
  syncUrlState();
  renderDataHealth();
}

function queueHealthSearch(value) {
  clearTimeout(healthSearchTimer);
  healthSearchTimer = setTimeout(() => updateHealthState("search", value), 200);
}

function toggleHealthAudit() {
  updateHealthState("open", !healthUiState.open);
}

function toggleHealthAffected(code) {
  healthUiState.expanded = healthUiState.expanded.includes(code)
    ? healthUiState.expanded.filter(value => value !== code)
    : [...healthUiState.expanded, code];
  syncUrlState();
  renderDataHealth();
}

function healthMatches(record) {
  if (healthUiState.severity !== "all" && record.severity !== healthUiState.severity) return false;
  const query = healthUiState.search.trim().toLowerCase();
  if (!query) return true;
  return [
    record.code, record.summary, record.details, record.resolution,
    ...(record.affected || []).flatMap(item => [item.label, item.club, item.status]),
  ].some(value => String(value || "").toLowerCase().includes(query));
}

function renderHealthRecord(record) {
  const affected = record.affected || [];
  const expanded = healthUiState.expanded.includes(record.code);
  const visible = expanded ? affected : affected.slice(0, 10);
  return `
    <details class="health-item health-${record.severity}">
      <summary><strong>${escapeHtml(record.summary)}</strong><span>${escapeHtml(record.details)}</span></summary>
      <div class="health-detail">
        <p>${escapeHtml(record.resolution)}</p>
        ${visible.length ? `<ul>${visible.map(healthAffectedItem).join("")}</ul>` : `<span>No affected records.</span>`}
        ${affected.length > 10 ? `<button class="health-more" type="button" onclick="toggleHealthAffected('${escapeHtml(record.code)}')">${expanded ? "Show first 10" : `Show all ${affected.length}`}</button>` : ""}
      </div>
    </details>`;
}

function renderHealthPanel(prefix) {
  const health = DATA._meta?.health || [];
  const counts = healthCounts(health);
  const overall = counts.warning ? "Review recommended" : counts.info ? "Notes available" : "Healthy";
  const filtered = health.filter(healthMatches);
  const active = filtered.filter(record => record.severity !== "ok");
  const passed = filtered.filter(record => record.severity === "ok");
  const cutoff = DATA._meta?.player_value_policy?.valuation_cutoff || "2025-05-31";
  return `
    <div class="health-summary-row">
      <div>
        <div class="method-title">Data health <span class="health-overall">${overall}</span></div>
        <p>${counts.warning} warnings · ${counts.info} notes · ${counts.ok} passed checks · valuation cutoff ${cutoff}</p>
      </div>
      <button class="action-btn" type="button" aria-expanded="${healthUiState.open}" aria-controls="${prefix}Audit" onclick="toggleHealthAudit()">${healthUiState.open ? "Hide audit" : "View audit"}</button>
    </div>
    ${healthUiState.open ? `
      <div class="health-audit" id="${prefix}Audit">
        <div class="health-toolbar">
          <label>Severity<select onchange="updateHealthState('severity',this.value)">
            <option value="all"${healthUiState.severity === "all" ? " selected" : ""}>All statuses</option>
            <option value="warning"${healthUiState.severity === "warning" ? " selected" : ""}>Warnings</option>
            <option value="info"${healthUiState.severity === "info" ? " selected" : ""}>Notes</option>
            <option value="ok"${healthUiState.severity === "ok" ? " selected" : ""}>Passed checks</option>
          </select></label>
          <label>Search<input type="search" value="${escapeHtml(healthUiState.search)}" placeholder="Player, club, or check" oninput="queueHealthSearch(this.value)" onchange="updateHealthState('search',this.value)" /></label>
          <span>${filtered.length} of ${health.length} checks shown</span>
        </div>
        <div class="health-grid">${active.map(renderHealthRecord).join("")}</div>
        ${passed.length ? `<details class="health-passed"><summary>${passed.length} passed checks</summary><div class="health-grid">${passed.map(renderHealthRecord).join("")}</div></details>` : ""}
        ${!filtered.length ? `<div class="empty-state">No data-health checks match these filters.</div>` : ""}
      </div>` : ""}`;
}

function renderDataHealth() {
  ["overviewDataHealth", "financeDataHealth"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = renderHealthPanel(id);
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
      <td><span class="valuation-badge ${row.severity === "warning" ? "valuation-stale" : "valuation-fresh"}">${row.reconciliation_status.replaceAll("_", " ")}</span></td>
    </tr>`).join("");
}

// -- Famous Player Wage Cards ----------------------------------
function renderWageGrid() {
  const el = document.getElementById("wageGrid"); if (!el) return;
  const maxWage = 400; // max weekly wage for scale

  el.innerHTML = DATA.finances.map(f => {
    const st = DATA.standings.find(s => s.team === f.team) || {};
    const valuation = squadValuationFor(f.team);
    const squadSource = clubValueComparisonSource();
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
  return players.map(p => ({
    ...p,
    perf90: p.role_score || 0,
    vfm: p.adjusted_vfm || 0,
  }));
}

function computeBargains(players) {
  return players.map(p => ({ ...p, isBargain: Boolean(p.bargain_candidate) }));
}

function allComputedPlayers() {
  return computeBargains(computeVFM(cleanPlayers()));
}

const PLAYER_RANKINGS = {
  adjusted_vfm: { label: "Adjusted VFM", digits: 2 },
  raw_vfm: { label: "Raw VFM", digits: 2 },
  role_score: { label: "Role score", digits: 2 },
  adjusted_vfm_position_percentile: { label: "Position percentile", digits: 1 },
};
const playerRanking = player => Number(player[playerFilters.rankingMethod] || 0);
const playerRankingConfig = () => PLAYER_RANKINGS[playerFilters.rankingMethod] || PLAYER_RANKINGS.adjusted_vfm;

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
    && (player.market_value_m || 0) >= Number(playerFilters.minValue)
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
  document.getElementById("playerRankingFilter").value = playerFilters.rankingMethod;
  document.getElementById("playerMinValueFilter").value = String(playerFilters.minValue);
  document.getElementById("playerBargainFilter").checked = playerFilters.bargainOnly;
}

function updatePlayerFilter(key, value) {
  playerFilters[key] = ["minMinutes", "minValue"].includes(key) ? Number(value) : value;
  syncUrlState();
  renderPlayerExplorer();
}

function resetPlayerFilters() {
  playerFilters = {
    search: "", club: "all", position: "all", age: "all",
    minMinutes: 500, valuation: "all", rankingMethod: "adjusted_vfm",
    minValue: 0, bargainOnly: false,
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
  const ranking = playerRankingConfig();
  const byVfm  = [...featured].sort((a, b) => playerRanking(b) - playerRanking(a));
  const byPerf = [...featured].sort((a, b) => b.perf90 - a.perf90);
  const bargains = players.filter(p => p.isBargain);
  const topBargain = [...bargains].sort((a, b) => playerRanking(b) - playerRanking(a))[0] || byVfm[0];
  if (!byVfm.length || !byPerf.length) {
    document.getElementById("valueKpis").innerHTML = `<div class="empty-state">No featured players match the current filters.</div>`;
    return;
  }

  document.getElementById("valueKpis").innerHTML = [
    { icon: crestImg(byVfm[0].club, 32), value: byVfm[0].player,
      label: `Top ${ranking.label}`, sub: `${ranking.label} ${fmt(playerRanking(byVfm[0]), ranking.digits)} · €${byVfm[0].market_value_m}M · ${byVfm[0].club}`,
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

const POSITION_COLORS = { GK: C.yellow, DF: C.green, MF: C.blue, FW: C.red };

function median(values) {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function scatterRegression(players) {
  if (players.length < 2) return null;
  const meanX = players.reduce((sum, player) => sum + player.market_value_m, 0) / players.length;
  const meanY = players.reduce((sum, player) => sum + player.perf90, 0) / players.length;
  const denominator = players.reduce((sum, player) => sum + (player.market_value_m - meanX) ** 2, 0);
  if (!denominator) return null;
  const slope = players.reduce((sum, player) => sum + (player.market_value_m - meanX) * (player.perf90 - meanY), 0) / denominator;
  return { slope, intercept: meanY - slope * meanX };
}

function scatterReferences(players) {
  const references = {
    league: { value: median(players.map(player => player.market_value_m)), score: median(players.map(player => player.perf90)) },
  };
  ["GK", "DF", "MF", "FW"].forEach(position => {
    const group = players.filter(player => player.position === position);
    if (group.length) references[position] = { value: median(group.map(player => player.market_value_m)), score: median(group.map(player => player.perf90)) };
  });
  return references;
}

function scatterLine(label, data, color, dash = [7, 5]) {
  return {
    type: "line", label, data, borderColor: color, borderDash: dash, borderWidth: 1.5,
    pointRadius: 0, pointHoverRadius: 0, fill: false,
  };
}

function scatterTrendDatasets(players) {
  if (scatterSettings.trendScope === "hide") return [];
  const groups = scatterSettings.trendScope === "all"
    ? [["All players", players, C.cyan]]
    : ["GK", "DF", "MF", "FW"].map(position => [posLabel(position), players.filter(player => player.position === position), POSITION_COLORS[position]]);
  return groups.flatMap(([label, group, color]) => {
    const regression = scatterRegression(group);
    if (!regression) return [];
    const values = group.map(player => player.market_value_m);
    const low = Math.min(...values), high = Math.max(...values);
    return [scatterLine(`${label} trend`, [
      { x: low, y: regression.intercept + regression.slope * low },
      { x: high, y: regression.intercept + regression.slope * high },
    ], color)];
  });
}

function scatterReferenceDatasets(players, references) {
  if (scatterSettings.quadrantMode === "hide" || !players.length) return [];
  const maxX = Math.max(...players.map(player => player.market_value_m));
  const maxY = Math.max(...players.map(player => player.perf90));
  const groups = scatterSettings.quadrantMode === "league"
    ? [["League", references.league, C.purple]]
    : ["GK", "DF", "MF", "FW"].map(position => [position, references[position], POSITION_COLORS[position]]);
  return groups.flatMap(([label, reference, color]) => reference ? [
    scatterLine(`${label} median value`, [{ x: reference.value, y: 0 }, { x: reference.value, y: maxY }], color + "77", [3, 5]),
    scatterLine(`${label} median role score`, [{ x: 0, y: reference.score }, { x: maxX, y: reference.score }], color + "77", [3, 5]),
  ] : []);
}

function scatterLabelKeys(players) {
  const ranked = [...players].sort((a, b) =>
    Number(b.isBargain) - Number(a.isBargain)
    || (b.adjusted_vfm_position_percentile || 0) - (a.adjusted_vfm_position_percentile || 0)
  );
  if (scatterSettings.labelMode === "hide") return new Set();
  if (scatterSettings.labelMode === "bargains") return new Set(ranked.filter(player => player.isBargain).map(playerKey));
  if (scatterSettings.labelMode === "position") {
    const position = playerFilters.position === "all" ? "" : playerFilters.position;
    return new Set(ranked.filter(player => !position || player.position === position).slice(0, 18).map(playerKey));
  }
  return new Set(ranked.slice(0, 10).map(playerKey));
}

function scatterQuadrant(point, references) {
  const reference = references[point.position] || references.league;
  if (point.x <= reference.value && point.y >= reference.score) return "High output / lower value";
  if (point.x > reference.value && point.y >= reference.score) return "High output / higher value";
  if (point.x <= reference.value) return "Lower output / lower value";
  return "Lower output / higher value";
}

const scatterLabelsPlugin = {
  id: "scatterLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 10px Inter, sans-serif";
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      dataset.data.forEach((point, index) => {
        if (!point.player || !point.labelVisible || !meta.data[index]) return;
        ctx.fillText(point.player, meta.data[index].x + 7, meta.data[index].y - 7);
      });
    });
    ctx.restore();
  },
};

function scatterTooltip(context) {
  if (!context.raw.player) return ` ${context.dataset.label}`;
  const point = context.raw;
  return ` ${point.player} (${point.club})  ${point.position}  EUR ${point.x}M  Role score: ${point.y}  ${point.quadrant}  ${point.status} ${point.date || ""}  ${point.bargain ? "Bargain" : ""}`;
}

function renderScatterControls() {
  const trend = document.getElementById("playerTrendScope");
  const quadrant = document.getElementById("playerQuadrantMode");
  const labels = document.getElementById("playerLabelMode");
  if (trend) trend.value = scatterSettings.trendScope;
  if (quadrant) quadrant.value = scatterSettings.quadrantMode;
  if (labels) labels.value = scatterSettings.labelMode;
}

function updateScatterSetting(key, value) {
  scatterSettings[key] = value;
  syncUrlState();
  renderValueCharts(filteredPlayers());
}

function exportPlayerRankingsCsv() {
  const rows = [...filteredPlayers()].sort((a, b) => Number(hasFreshValue(b)) - Number(hasFreshValue(a)) || playerRanking(b) - playerRanking(a));
  downloadTextFile("premvalue-filtered-player-rankings-2024-2025.csv", buildCsv(
    ["Rank", "Player", "Club", "Position", "Age", "Appearances", "Minutes", "Goals", "Assists", "Role Score", "Market Value EUR M", "Valuation Status", "Valuation Date", "Raw VFM", "Adjusted VFM", "Position Percentile", "Bargain"],
    rows.map((player, index) => [index + 1, player.player, player.club, player.position, player.age, player.apps, player.mins, player.goals, player.assists, player.perf90, player.market_value_m, player.valuation_status, player.valuation_date, player.raw_vfm, player.adjusted_vfm, player.adjusted_vfm_position_percentile, player.isBargain ? "Yes" : "No"])
  ));
  setExportStatus("valueExportStatus", `${rows.length} filtered players exported.`);
}

function renderValueCharts(players = filteredPlayers()) {
  renderValueKPIs(players);
  renderScatterControls();
  const ranking = playerRankingConfig();
  const rankingTitle = document.getElementById("valueRankingTitle");
  if (rankingTitle) rankingTitle.textContent = `Top 25 - ${ranking.label}`;

  // Scatter: position-aware role score vs market value
  destroyChart("cValScatter");
  const ctx1 = document.getElementById("cValScatter"); if (!ctx1) return;
  const validP = players.filter(p => p.market_value_m > 0);
  const positionColor = POSITION_COLORS;
  const references = scatterReferences(validP);
  const labelKeys = scatterLabelKeys(validP);
  charts["cValScatter"] = new Chart(ctx1, {
    type: "scatter", data: {
      datasets: [{
        label: "Players",
        data: validP.map(p => {
          const point = { x: p.market_value_m, y: p.perf90, player: p.player, club: p.club, position: p.position, bargain: p.isBargain, status: p.valuation_status, date: p.valuation_date, labelVisible: labelKeys.has(playerKey(p)) };
          return { ...point, quadrant: scatterQuadrant(point, references) };
        }),
        backgroundColor: validP.map(p => (positionColor[p.position] || C.purple) + (p.valuation_status === "stale" ? "77" : "cc")),
        borderColor:     validP.map(p => p.isBargain ? C.yellow : p.valuation_status === "stale" ? C.orange : positionColor[p.position] || C.purple),
        borderWidth: validP.map(p => p.isBargain || p.valuation_status === "stale" ? 2.5 : 1),
        pointRadius: validP.map(p => p.isBargain ? 8 : p.valuation_status === "stale" ? 7 : 5),
        pointHoverRadius: 11,
      }, ...scatterTrendDatasets(validP), ...scatterReferenceDatasets(validP, references)]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#94a3b8", boxWidth: 12, filter: item => !item.text.includes("median") } },
        tooltip: { callbacks: { label: scatterTooltip } } },
      scales: {
        x: { title: { display: true, text: "Market Value (€M)", color: "#64748b" }, grid: { color: "rgba(255,255,255,0.05)" } },
        y: { title: { display: true, text: "Position-aware role score",  color: "#64748b" }, grid: { color: "rgba(255,255,255,0.05)" } }
      }
    },
    plugins: [scatterLabelsPlugin],
  });
  const summary = document.getElementById("playerScatterSummary");
  if (summary) summary.textContent = `${validP.length} valued players shown · ${validP.filter(player => player.isBargain).length} bargain candidates · dashed lines show ${scatterSettings.quadrantMode === "position" ? "position" : scatterSettings.quadrantMode === "league" ? "league" : "no"} median references.`;

  // VFM Bar chart — top 25
  destroyChart("cValRanking");
  const ctx2 = document.getElementById("cValRanking"); if (!ctx2) return;
  const top25 = [...players].filter(isFeaturedEligible).sort((a, b) => playerRanking(b) - playerRanking(a)).slice(0, 25);
  charts["cValRanking"] = new Chart(ctx2, {
    type: "bar", data: {
      labels: top25.map(p => p.player),
      datasets: [{ label: ranking.label, data: top25.map(playerRanking),
        backgroundColor: top25.map(p => p.isBargain ? C.green + "dd" : tc(p.club) + "cc"),
        borderColor:     top25.map(p => p.isBargain ? C.green         : tc(p.club)),
        borderWidth: 1.5, borderRadius: 5, borderSkipped: false }]
    },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: "y",
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => {
          const p = top25[c.dataIndex];
          return ` ${ranking.label}: ${fmt(c.parsed.x, ranking.digits)}  |  €${p.market_value_m}M  |  ${p.goals}G ${p.assists}A  ${p.isBargain ? "🏷️" : ""}`;
        }}}},
      scales: { x: { grid: { color: "rgba(255,255,255,0.05)" } }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } }
    }
  });
}

// -- Bargain Player Feature Cards ------------------------------
function renderBargainGrid(players = filteredPlayers()) {
  const bargains = [...players.filter(p => p.isBargain)].sort((a, b) => playerRanking(b) - playerRanking(a));

  const el = document.getElementById("bargainGrid"); if (!el) return;
  if (!bargains.length) { el.innerHTML = `<p style="color:var(--t3)">No bargain players found with current criteria.</p>`; return; }

  el.innerHTML = bargains.map(p => {
    const col   = tc(p.club);
    const stars = Math.min(5, Math.max(1, Math.round((p.adjusted_vfm_position_percentile || 0) / 20)));
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
          <span class="bc-vfm-label">Adjusted VFM</span>
          <span class="bc-vfm-val">${fmt(p.adjusted_vfm, 1)}</span>
        </div>
      </div>
    </div>`;
  }).join("");
}

// -- VFM Rankings Table ----------------------------------------
function renderVFMTable(players = filteredPlayers()) {
  const body = document.getElementById("vfmBody"); if (!body) return;
  const sorted  = [...players].sort((a, b) => Number(hasFreshValue(b)) - Number(hasFreshValue(a)) || playerRanking(b) - playerRanking(a));

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
      <td>${p.raw_vfm == null ? "–" : fmt(p.raw_vfm, 2)}</td>
      <td class="vfm-col">${p.adjusted_vfm == null ? "–" : fmt(p.adjusted_vfm, 2)}</td>
      <td>${p.adjusted_vfm_position_percentile == null ? "–" : fmt(p.adjusted_vfm_position_percentile, 1)}</td>
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
      <div class="export-toolbar">
        <strong>Export / Share</strong>
        <button class="action-btn" onclick="copyCurrentViewLink('clubExportStatus')">Copy club link</button>
        <span class="export-status" id="clubExportStatus" aria-live="polite"></span>
      </div>
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
    const squadSource = clubValueComparisonSource();
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
const XI_OBJECTIVES = {
  balanced: "Balanced (percentile blend)",
  raw_vfm: "Raw VFM",
  adjusted_vfm: "Adjusted VFM",
  role_score: "Role Score",
};

const FORMATIONS = {
  // 4 defenders
  "4-3-3":   ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "FW", "FW", "FW"],
  "4-4-2":   ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "FW", "FW"],
  "4-4-1-1": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "MF", "FW"],
  "4-2-3-1": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "MF", "FW"],
  "4-1-4-1": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "MF", "FW"],
  "4-5-1":   ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "MF", "FW"],
  "4-3-2-1": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "MF", "FW"],
  "4-2-4":   ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "FW", "FW", "FW", "FW"],
  // 3 defenders
  "3-5-2":   ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "MF", "FW", "FW"],
  "3-4-3":   ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "FW", "FW", "FW"],
  "3-4-2-1": ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "MF", "MF", "FW"],
  "3-6-1":   ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "MF", "MF", "FW"],
  "3-3-4":   ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "FW", "FW", "FW", "FW"],
  // 5 defenders (wing-backs)
  "5-3-2":   ["GK", "DF", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "FW", "FW"],
  "5-4-1":   ["GK", "DF", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "FW"],
  "5-2-3":   ["GK", "DF", "DF", "DF", "DF", "DF", "MF", "MF", "FW", "FW", "FW"],
  // classic
  "2-3-5":   ["GK", "DF", "DF", "MF", "MF", "MF", "FW", "FW", "FW", "FW", "FW"],
};

function renderXiControls() {
  document.getElementById("xiFormation").value = xiSettings.formation;
  const obj = document.getElementById("xiObjective");
  if (obj) obj.value = xiSettings.objective;
  document.getElementById("xiMinutes").value = String(xiSettings.minMinutes);
  document.getElementById("xiBudget").value = xiSettings.maxValue;
  document.getElementById("xiClubLimit").value = String(xiSettings.maxPerClub);
}

function updateXiSetting(key, value) {
  xiSettings[key] = ["minMinutes", "maxPerClub"].includes(key) ? Number(value) : value;
  xiSelectedAlternative = 0;
  xiManualSwaps = {};
  xiSwapSlot = "";
  xiReplacementSearch = "";
  xiShowAllCandidates = false;
  xiLastSimResult = null;
  syncUrlState();
  renderXi();
}

function resetXiSettings() {
  xiSettings = { formation: "4-3-3", objective: "balanced", minMinutes: 900, maxValue: "", maxPerClub: 3 };
  xiLocks = [];
  xiExclusions = [];
  xiManualSwaps = {};
  xiSelectedAlternative = 0;
  xiSwapSlot = "";
  xiReplacementSearch = "";
  xiShowAllCandidates = false;
  xiLastSimResult = null;
  renderXiControls();
  renderXiRosterControls();
  syncUrlState();
  renderXi();
}

/* ════════════════════════════════════════════════════════════
   BUILDER — formation change, squad state helpers
   ════════════════════════════════════════════════════════════ */
function changeXiFormation(value) {
  const newSlots  = slotLabels(FORMATIONS[value] || FORMATIONS["4-3-3"]);
  const newSquad  = {};
  // Keep any player whose slot label exists in the new formation
  newSlots.forEach(label => { if (xiBuilderSquad[label]) newSquad[label] = xiBuilderSquad[label]; });
  xiSettings.formation = value;
  xiBuilderSquad  = newSquad;
  xiPickerSlot    = "";
  xiPickerSearch  = "";
  xiLastSimResult = null;
  syncUrlState();
  renderXiControls();
  renderXiBuilder();
}

function getBuilderSquadPlayers() {
  const all    = allComputedPlayers();
  const slots  = FORMATIONS[xiSettings.formation] || FORMATIONS["4-3-3"];
  const labels = slotLabels(slots);
  return labels.map((label, i) => {
    const key    = xiBuilderSquad[label];
    if (!key) return null;
    const player = all.find(p => playerKey(p) === key);
    return player ? { ...player, slot: label } : null;
  });
}

function getBuilderSpent() {
  return getBuilderSquadPlayers()
    .filter(Boolean)
    .reduce((sum, p) => sum + p.market_value_m, 0);
}

function openBuilderSlotPicker(slot) {
  if (xiPickerSlot === slot) {
    xiPickerSlot = "";
  } else {
    xiPickerSlot  = slot;
    xiPickerSearch = "";
  }
  renderXiBuilder();
}

function closeBuilderPicker() {
  xiPickerSlot   = "";
  xiPickerSearch = "";
  renderXiBuilder();
}

function updateBuilderPickerSearch(val) {
  xiPickerSearch = val;
  // Re-render only the picker panel (fast path)
  const slots       = FORMATIONS[xiSettings.formation] || FORMATIONS["4-3-3"];
  const labels      = slotLabels(slots);
  const squadPlayers = getBuilderSquadPlayers();
  renderXiPickerPanel(slots, labels, squadPlayers);
}

function setBuilderSlot(slot, encodedKey) {
  xiBuilderSquad[slot] = decodeURIComponent(encodedKey);
  xiPickerSlot    = "";
  xiPickerSearch  = "";
  xiLastSimResult = null;
  syncUrlState();
  renderXiBuilder();
}

function removeBuilderSlot(slot) {
  delete xiBuilderSquad[slot];
  xiPickerSlot    = "";
  xiLastSimResult = null;
  syncUrlState();
  renderXiBuilder();
}

function clearBuilderSquad() {
  xiBuilderSquad  = {};
  xiPickerSlot    = "";
  xiPickerSearch  = "";
  xiLastSimResult = null;
  syncUrlState();
  renderXiBuilder();
}

function autoFillBuilderSquad() {
  const slots   = FORMATIONS[xiSettings.formation] || FORMATIONS["4-3-3"];
  const labels  = slotLabels(slots);
  const budget  = xiSettings.maxValue === "" ? Infinity : Number(xiSettings.maxValue);

  // Current state
  const filledKeys = new Set(Object.values(xiBuilderSquad).filter(Boolean));
  let remaining    = budget - getBuilderSpent();
  const clubCounts = {};
  getBuilderSquadPlayers().filter(Boolean).forEach(p => {
    clubCounts[p.club] = (clubCounts[p.club] || 0) + 1;
  });

  const emptyLabels = labels.filter(label => !xiBuilderSquad[label]);

  // Sort eligible players by xiScore descending
  const eligible = allComputedPlayers()
    .filter(p => hasFreshValue(p) && p.mins >= xiSettings.minMinutes
      && !filledKeys.has(playerKey(p)) && !XI_MEMORIAL_EXCLUSIONS.has(playerKey(p)))
    .map(p => ({ ...p, xiScore: xiPlayerScore(p) }))
    .sort((a, b) => b.xiScore - a.xiScore || a.market_value_m - b.market_value_m);

  const newSquad = { ...xiBuilderSquad };
  const used     = new Set(filledKeys);
  // Track per-position spend for position budget caps
  const posSpend = {};
  getBuilderSquadPlayers().filter(Boolean).forEach(p => {
    posSpend[p.position] = (posSpend[p.position] || 0) + p.market_value_m;
  });

  for (const label of emptyLabels) {
    const pos       = slots[labels.indexOf(label)];
    const posCap    = xiPositionBudgets[pos] !== "" ? Number(xiPositionBudgets[pos]) : Infinity;
    const posSpent  = posSpend[pos] || 0;
    const pick = eligible.find(p =>
      p.position === pos &&
      !used.has(playerKey(p)) &&
      p.market_value_m <= remaining &&
      (clubCounts[p.club] || 0) < xiSettings.maxPerClub &&
      posSpent + p.market_value_m <= posCap
    );
    if (pick) {
      newSquad[label] = playerKey(pick);
      used.add(playerKey(pick));
      remaining -= pick.market_value_m;
      clubCounts[pick.club] = (clubCounts[pick.club] || 0) + 1;
      posSpend[pick.position] = (posSpend[pick.position] || 0) + pick.market_value_m;
    }
  }

  xiBuilderSquad  = newSquad;
  xiPickerSlot    = "";
  xiLastSimResult = null;
  syncUrlState();
  renderXiBuilder();
}

/* ════════════════════════════════════════════════════════════
   BUILDER — picker panel renderer
   ════════════════════════════════════════════════════════════ */
function renderXiPickerPanel(slots, labels, squadPlayers) {
  const panel = document.getElementById("xiPickerPanel");
  if (!panel) return;
  if (!xiPickerSlot) { panel.innerHTML = ""; return; }

  const slotIdx = labels.indexOf(xiPickerSlot);
  if (slotIdx < 0) { panel.innerHTML = ""; return; }

  const pos           = slots[slotIdx];
  const currentPlayer = squadPlayers[slotIdx];
  const budget        = xiSettings.maxValue === "" ? Infinity : Number(xiSettings.maxValue);
  const spent         = getBuilderSpent();
  const currentCost   = currentPlayer ? currentPlayer.market_value_m : 0;
  const budgetLeft    = budget - spent + currentCost; // credit back current player

  // Club counts (excluding current slot)
  const clubCounts = {};
  squadPlayers.filter(Boolean).forEach(p => {
    if (currentPlayer && playerKey(p) === playerKey(currentPlayer)) return;
    clubCounts[p.club] = (clubCounts[p.club] || 0) + 1;
  });

  // All players already in the squad (excluding the current slot's player)
  const inSquadKeys = new Set(
    squadPlayers.filter(Boolean)
      .filter(p => !currentPlayer || playerKey(p) !== playerKey(currentPlayer))
      .map(p => playerKey(p))
  );

  // Position budget: how much is already spent on this position (excluding current slot)
  const posBudgetCap   = xiPositionBudgets[pos] !== "" ? Number(xiPositionBudgets[pos]) : Infinity;
  const posSpentOthers = squadPlayers.filter(Boolean)
    .filter(p => p.position === pos && (!currentPlayer || playerKey(p) !== playerKey(currentPlayer)))
    .reduce((s, p) => s + p.market_value_m, 0);
  const posBudgetLeft  = posBudgetCap - posSpentOthers;

  const eligible = allComputedPlayers()
    .filter(p => p.position === pos && hasFreshValue(p) && p.mins >= xiSettings.minMinutes
      && !inSquadKeys.has(playerKey(p)) && !XI_MEMORIAL_EXCLUSIONS.has(playerKey(p)))
    .map(p => {
      const withinBudget    = p.market_value_m <= budgetLeft;
      const withinClubLimit = (clubCounts[p.club] || 0) < xiSettings.maxPerClub;
      const withinPosBudget = p.market_value_m <= posBudgetLeft;
      return { ...p, available: withinBudget && withinClubLimit && withinPosBudget, withinBudget, withinClubLimit, withinPosBudget };
    })
    .sort((a, b) => (b.available - a.available) || (b.role_score || 0) - (a.role_score || 0));

  const sq       = xiPickerSearch.trim().toLowerCase();
  const filtered = sq ? eligible.filter(p => p.player.toLowerCase().includes(sq) || p.club.toLowerCase().includes(sq)) : eligible;
  const shown    = filtered.slice(0, 36);

  panel.innerHTML = `
    <div class="xi-picker-panel">
      <div class="xi-picker-header">
        <div>
          <strong>Pick a ${pos} for slot ${xiPickerSlot}</strong>
          <span class="xi-picker-count">${filtered.length} eligible · ${eligible.filter(p => p.available).length} within constraints</span>
        </div>
        <button class="xi-picker-close" onclick="closeBuilderPicker()">✕ Close</button>
      </div>
      <div class="xi-picker-search-row">
        <input class="replacement-search" type="text" placeholder="Search by name or club…"
          value="${escapeHtml(xiPickerSearch)}" oninput="updateBuilderPickerSearch(this.value)" />
        ${budget < Infinity ? `<span class="xi-picker-budget-info">Total budget left: €${fmt(budgetLeft)}M</span>` : ""}
        ${posBudgetCap < Infinity ? `<span class="xi-picker-budget-info" style="color:var(--yellow)">${pos} cap left: €${fmt(posBudgetLeft)}M</span>` : ""}
      </div>
      <div class="replacement-grid xi-picker-grid">
        ${shown.map(c => {
          const reason = !c.withinBudget ? "Over total budget" : !c.withinPosBudget ? `Over ${pos} position cap` : !c.withinClubLimit ? "Club limit reached" : "";
          return `<button class="replacement-card${c.available ? "" : " xi-card-limited"}"
            type="button" ${reason ? `title="${reason}"` : ""}
            onclick="${c.available ? `setBuilderSlot('${xiPickerSlot}','${encodeURIComponent(playerKey(c))}')` : "void 0"}">
            <strong>${escapeHtml(c.player)}</strong>
            <span>${escapeHtml(sn(c.club))} · €${c.market_value_m}M</span>
            <div class="replacement-card-stats">
              <span class="replacement-card-stat">⚽ ${c.goals}G ${c.assists}A</span>
              <span class="replacement-card-stat">⭐ ${fmt(c.role_score || 0, 1)}</span>
              <span class="replacement-card-stat">📈 ${fmt(c.adjusted_vfm || 0, 1)} VFM</span>
              ${reason ? `<span class="replacement-card-stat" style="color:var(--red)">${reason}</span>` : ""}
            </div>
          </button>`;
        }).join("") || `<span class="comparison-status">No players match — try a different search or lower the min-minutes filter.</span>`}
      </div>
    </div>`;
}

/* ════════════════════════════════════════════════════════════
   BUILDER — main render
   ════════════════════════════════════════════════════════════ */
function renderXiBuilder() {
  const pitch  = document.getElementById("xiPitch");
  const body   = document.getElementById("xiBody");
  if (!pitch) return;

  const formation    = xiSettings.formation;
  const slots        = FORMATIONS[formation] || FORMATIONS["4-3-3"];
  const labels       = slotLabels(slots);
  const squadPlayers = getBuilderSquadPlayers();
  const filledCount  = squadPlayers.filter(Boolean).length;
  const budget       = xiSettings.maxValue === "" ? null : Number(xiSettings.maxValue);
  const spent        = getBuilderSpent();

  // Squad status bar
  const statusEl = document.getElementById("xiSquadStatus");
  if (statusEl) {
    const isComplete = filledCount === 11;
    const remaining  = budget !== null ? budget - spent : null;
    const over       = remaining !== null && remaining < 0;
    statusEl.innerHTML = `
      <span class="xi-squad-count">${filledCount}/11 players</span>
      <span class="xi-squad-spent">€${fmt(spent)}M spent</span>
      ${remaining !== null ? `<span class="xi-squad-remaining-${over ? "over" : remaining < 20 ? "warn" : "ok"}">${over ? "⚠️ €" + fmt(Math.abs(remaining)) + "M over budget" : "€" + fmt(remaining) + "M remaining"}</span>` : ""}
      ${isComplete && !over ? `<span class="xi-squad-complete">✓ Squad complete</span>` : ""}`;
  }

  // Pitch
  const rows = ["FW", "MF", "DF", "GK"];
  pitch.innerHTML = rows.map(role => {
    const roleSlots = labels.filter((_, i) => slots[i] === role);
    if (!roleSlots.length) return "";
    return `<div class="pitch-row pitch-${role.toLowerCase()}">
      ${roleSlots.map(label => {
        const player   = squadPlayers[labels.indexOf(label)];
        const isActive = xiPickerSlot === label;
        if (player) {
          return `<div class="xi-player-card${isActive ? " xi-card-active" : ""}" style="--club-color:${tc(player.club)}">
            ${playerAvatar(player.player, player.club, 42)}
            <strong>${escapeHtml(player.player)}</strong>
            <span>${escapeHtml(sn(player.club))}</span>
            <small>${label} · €${player.market_value_m}M</small>
            <div class="xi-slot-actions">
              <button class="xi-slot-swap" type="button" onclick="openBuilderSlotPicker('${label}')">⇄ Swap</button>
              <button class="xi-slot-remove" type="button" onclick="removeBuilderSlot('${label}')">✕ Remove</button>
            </div>
          </div>`;
        }
        return `<button class="xi-empty-slot${isActive ? " xi-card-active" : ""}"
          type="button" onclick="openBuilderSlotPicker('${label}')">
          <span class="xi-empty-pos">${role}</span>
          <span class="xi-empty-plus">+</span>
          <span class="xi-empty-label">${label}</span>
        </button>`;
      }).join("")}
    </div>`;
  }).join("");

  // Budget panel
  renderXiBudgetPanel({ totalValue: spent, filledCount });

  // Re-render sim results if available
  if (xiLastSimResult) renderXiPrediction(xiLastSimResult);

  // Picker panel
  renderXiPickerPanel(slots, labels, squadPlayers);

  // Lineup table
  if (body) {
    const filled = squadPlayers.filter(Boolean);
    body.innerHTML = filled.length
      ? filled.map(p => `
          <tr>
            <td>${p.slot}</td>
            <td class="name-col">${playerAvatar(p.player, p.club, 26)} ${p.player}</td>
            <td>${crestImg(p.club, 18)} ${sn(p.club)}</td>
            <td>${p.position}</td>
            <td>${p.mins.toLocaleString()}</td>
            <td>${p.goals}</td>
            <td>${p.assists}</td>
            <td>${fmt(p.perf90, 2)}</td>
            <td>€${p.market_value_m}M</td>
            <td class="vfm-col">${fmt(p.adjusted_vfm, 1)}</td>
          </tr>`).join("")
      : `<tr><td colspan="10" style="text-align:center;color:var(--t3);padding:1.5rem">No players selected yet — click the pitch slots above to build your squad.</td></tr>`;
  }

  renderXiPositionBudgets();
}

function xiPlayerScore(player) {
  if (xiSettings.objective === "raw_vfm") return player.raw_vfm || 0;
  if (xiSettings.objective === "adjusted_vfm") return player.adjusted_vfm || 0;
  if (xiSettings.objective === "role_score") return player.role_score || 0;
  return (player.adjusted_vfm_position_percentile || 0) * .6
    + (player.role_score_position_percentile || 0) * .4;
}

function getEligibleXiPlayers() {
  const excluded = new Set(xiExclusions);
  return allComputedPlayers()
    .filter(player => hasFreshValue(player) && player.mins >= xiSettings.minMinutes && !excluded.has(playerKey(player)))
    .map(player => ({ ...player, xiScore: xiPlayerScore(player) }))
    .sort((a, b) => b.xiScore - a.xiScore || b.mins - a.mins);
}

function renderXiRosterControls() {
  const select = document.getElementById("xiPlayerConstraint");
  const summary = document.getElementById("xiConstraints");
  if (!select || !summary) return;
  const players = allComputedPlayers()
    .filter(player => hasFreshValue(player))
    .sort((a, b) => a.player.localeCompare(b.player) || a.club.localeCompare(b.club));
  select.innerHTML = `<option value="">Choose a player</option>${players.map(player =>
    `<option value="${escapeHtml(playerKey(player))}">${escapeHtml(player.player)} - ${escapeHtml(sn(player.club))} (${player.position})</option>`
  ).join("")}`;
  const pills = [
    ...xiLocks.map(key => ({ key, type: "lock", label: "Locked" })),
    ...xiExclusions.map(key => ({ key, type: "exclude", label: "Excluded" })),
  ];
  summary.innerHTML = pills.length
    ? pills.map(item => {
      const player = players.find(row => playerKey(row) === item.key);
      return `<span class="xi-constraint ${item.type}">${item.label}: ${escapeHtml(player?.player || item.key)}
        <button type="button" onclick="removeXiConstraint('${item.type}','${encodeURIComponent(item.key)}')" aria-label="Remove ${item.label.toLowerCase()} player">x</button></span>`;
    }).join("")
    : `<span class="comparison-status">No locked or excluded players.</span>`;
}

function addXiConstraint(type) {
  const select = document.getElementById("xiPlayerConstraint");
  const key = select?.value;
  if (!key) return;
  if (type === "lock") {
    xiExclusions = xiExclusions.filter(value => value !== key);
    if (!xiLocks.includes(key)) xiLocks.push(key);
  } else {
    xiLocks = xiLocks.filter(value => value !== key);
    if (!xiExclusions.includes(key)) xiExclusions.push(key);
    Object.entries(xiManualSwaps).forEach(([slot, value]) => {
      if (value === key) delete xiManualSwaps[slot];
    });
  }
  xiSelectedAlternative = 0;
  renderXiRosterControls();
  syncUrlState();
  renderXi();
}

function removeXiConstraint(type, encodedKey) {
  const key = decodeURIComponent(encodedKey);
  if (type === "lock") xiLocks = xiLocks.filter(value => value !== key);
  if (type === "exclude") xiExclusions = xiExclusions.filter(value => value !== key);
  renderXiRosterControls();
  syncUrlState();
  renderXi();
}

function clearXiConstraints() {
  xiLocks = [];
  xiExclusions = [];
  renderXiRosterControls();
  syncUrlState();
  renderXi();
}

function clearXiSwaps() {
  xiManualSwaps = {};
  xiSwapSlot = "";
  syncUrlState();
  renderXi();
}

function validateXiLineup(players, slots) {
  if (!players || players.length !== slots.length) return "The lineup does not fill every formation slot.";
  if (new Set(players.map(playerKey)).size !== players.length) return "A player cannot fill more than one slot.";
  if (players.some((player, index) => player.position !== slots[index])) return "A replacement must match the broad position for its slot.";
  if (players.some(player => xiExclusions.includes(playerKey(player)))) return "An excluded player is present.";
  if (xiLocks.some(key => !players.some(player => playerKey(player) === key))) return "A locked player is missing.";
  const totalValue = players.reduce((sum, player) => sum + player.market_value_m, 0);
  const budget = xiSettings.maxValue === "" ? Infinity : Number(xiSettings.maxValue);
  if (totalValue > budget) return "The lineup exceeds the selected budget.";
  const clubs = {};
  players.forEach(player => clubs[player.club] = (clubs[player.club] || 0) + 1);
  if (Object.values(clubs).some(count => count > xiSettings.maxPerClub)) return "The lineup exceeds the per-club limit.";
  return "";
}

function lineupState(players) {
  return {
    players,
    totalValue: players.reduce((sum, player) => sum + player.market_value_m, 0),
    score: players.reduce((sum, player) => sum + xiPlayerScore(player), 0),
  };
}

function applyManualXiSwaps(lineup, slots, eligible) {
  if (!lineup) return { lineup: null, error: "" };
  const players = [...lineup.players];
  Object.entries(xiManualSwaps).forEach(([slot, key]) => {
    const index = slotIndex(slots, slot);
    const player = eligible.find(candidate => playerKey(candidate) === key);
    if (index >= 0 && player) players[index] = player;
  });
  const error = validateXiLineup(players, slots);
  return { lineup: error ? lineup : lineupState(players), error };
}

function optimizeXi() {
  const slots = FORMATIONS[xiSettings.formation] || FORMATIONS["4-3-3"];
  const budget = xiSettings.maxValue === "" ? Infinity : Number(xiSettings.maxValue);
  const eligible = getEligibleXiPlayers();
  const locked = new Set(xiLocks);
  const byRole = {};
  ["GK", "DF", "MF", "FW"].forEach(role => {
    const rolePlayers = eligible.filter(player => player.position === role);
    byRole[role] = [
      ...rolePlayers.filter(player => locked.has(playerKey(player))),
      ...rolePlayers.filter(player => !locked.has(playerKey(player))).slice(0, 36),
    ];
  });

  let states = [{ players: [], totalValue: 0, score: 0, priority: 0, clubs: {} }];
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
          priority: state.priority + player.xiScore + (locked.has(playerKey(player)) ? 10000 : 0),
          clubs: { ...state.clubs, [player.club]: (state.clubs[player.club] || 0) + 1 },
        });
      }
    }
    states = next.sort((a, b) => b.priority - a.priority || a.totalValue - b.totalValue).slice(0, 1000);
    if (!states.length) break;
  }
  const distinct = new Map();
  states
    .filter(state => xiLocks.every(key => state.players.some(player => playerKey(player) === key)))
    .sort((a, b) => b.score - a.score || a.totalValue - b.totalValue)
    .forEach(state => {
      const signature = state.players.map(playerKey).sort().join("~");
      if (!distinct.has(signature)) distinct.set(signature, state);
    });
  return { slots, eligible, lineups: [...distinct.values()].slice(0, 3) };
}

function slotLabels(slots) {
  return slots.map((role, index) => `${role}${slots.slice(0, index + 1).filter(value => value === role).length}`);
}

function slotIndex(slots, slot) {
  return slotLabels(slots).indexOf(slot);
}

function exportXiCsv() {
  const slots = FORMATIONS[xiSettings.formation] || FORMATIONS["4-3-3"];
  const labels = slotLabels(slots);
  const players = getBuilderSquadPlayers();
  if (players.filter(Boolean).length !== 11) {
    setExportStatus("xiExportStatus", "Fill all 11 slots before exporting.");
    return;
  }
  downloadTextFile(`premvalue-xi-${slug(xiSettings.formation)}-2024-2025.csv`, buildCsv(
    ["Slot", "Player", "Club", "Position", "Minutes", "Goals", "Assists", "Role Score", "Market Value EUR M", "Adjusted VFM"],
    players.map((player, index) => player ? [
      labels[index], player.player, player.club, player.position, player.mins, player.goals, player.assists,
      player.perf90, player.market_value_m, player.adjusted_vfm,
    ] : [labels[index], "Empty", "", "", "", "", "", "", "", ""])
  ));
  setExportStatus("xiExportStatus", "XI CSV downloaded.");
}

function selectXiAlternative(index) {
  xiSelectedAlternative = Number(index);
  xiManualSwaps = {};
  xiSwapSlot = "";
  syncUrlState();
  renderXi();
}

function openXiReplacements(slot) {
  // Toggle off if clicking the already-active slot
  if (xiSwapSlot === slot) {
    xiSwapSlot = "";
  } else {
    xiSwapSlot = slot;
    xiReplacementSearch = "";
    xiShowAllCandidates = false;
  }
  renderXi();
}

function applyXiSwap(slot, encodedKey) {
  xiManualSwaps[slot] = decodeURIComponent(encodedKey);
  xiSwapSlot = "";
  syncUrlState();
  renderXi();
}

function diagnoseXiFailure(slots) {
  const lockedPlayers = xiLocks.map(key => allComputedPlayers().find(player => playerKey(player) === key)).filter(Boolean);
  if (xiLocks.some(key => xiExclusions.includes(key))) return "A player cannot be both locked and excluded.";
  if (lockedPlayers.some(player => !hasFreshValue(player) || player.mins < xiSettings.minMinutes)) return "A locked player does not meet the freshness or minutes requirement.";
  for (const role of ["GK", "DF", "MF", "FW"]) {
    if (lockedPlayers.filter(player => player.position === role).length > slots.filter(slot => slot === role).length) {
      return `Too many locked ${role} players for ${xiSettings.formation}.`;
    }
  }
  return "No valid XI satisfies the current budget, minutes threshold, per-club limit, and player constraints.";
}

function renderXi() {
  const summary = document.getElementById("xiSummary");
  const pitch = document.getElementById("xiPitch");
  const body = document.getElementById("xiBody");
  if (!summary || !pitch || !body) return;
  const result = optimizeXi();
  const { slots, eligible, lineups } = result;
  const alternatives = document.getElementById("xiAlternatives");
  const replacements = document.getElementById("xiReplacements");
  if (xiSelectedAlternative >= lineups.length) xiSelectedAlternative = 0;
  const baseLineup = lineups[xiSelectedAlternative] || null;
  const manual = applyManualXiSwaps(baseLineup, slots, eligible);
  const lineup = manual.lineup;
  if (alternatives) alternatives.innerHTML = lineups.length
    ? `<strong>Optimizer alternatives</strong>${lineups.map((option, index) =>
      `<button class="action-btn ${index === xiSelectedAlternative ? "active" : ""}" onclick="selectXiAlternative(${index})">XI ${index + 1} · €${fmt(option.totalValue)}M · ${fmt(option.score, 1)} pts</button>`
    ).join("")}`
    : "";
  if (!lineup || lineup.players.length !== 11) {
    summary.innerHTML = `<div class="empty-state">${diagnoseXiFailure(slots)}</div>`;
    pitch.innerHTML = "";
    body.innerHTML = "";
    if (replacements) replacements.innerHTML = "";
    renderXiBudgetPanel(null);
    return;
  }
  const labels = slotLabels(slots);
  const selected = lineup.players.map((player, index) => ({ ...player, slot: labels[index] }));
  const totalGoals = selected.reduce((sum, player) => sum + player.goals, 0);
  const totalAssists = selected.reduce((sum, player) => sum + player.assists, 0);
  const averageVfm = selected.reduce((sum, player) => sum + (player.adjusted_vfm || 0), 0) / selected.length;
  const isCustom = Object.keys(xiManualSwaps).length > 0 && !manual.error;
  summary.innerHTML = `
    <div class="detail-kpis">
      <div class="detail-kpi"><strong>${xiSettings.formation}</strong><span>Formation</span></div>
      <div class="detail-kpi"><strong>€${fmt(lineup.totalValue)}M</strong><span>Total market value</span></div>
      <div class="detail-kpi"><strong>${totalGoals}</strong><span>Combined goals</span></div>
      <div class="detail-kpi"><strong>${totalAssists}</strong><span>Combined assists</span></div>
      <div class="detail-kpi"><strong>${fmt(averageVfm, 1)}</strong><span>Average adjusted VFM</span></div>
      <div class="detail-kpi"><strong>${isCustom ? "Custom XI" : "Optimized XI"}</strong><span>${XI_OBJECTIVES[xiSettings.objective]}</span></div>
    </div>
    ${manual.error ? `<div class="empty-state">${manual.error} The last valid XI is shown.</div>` : ""}
    <p class="xi-explanation">Lineup score: ${fmt(lineup.score, 1)}. Click a pitch card to swap that player — or use the controls to lock/remove players.</p>`;
  const rows = ["FW", "MF", "DF", "GK"];
  pitch.innerHTML = rows.map(role => `
    <div class="pitch-row pitch-${role.toLowerCase()}">
      ${selected.filter(player => player.position === role).map(player => {
        const isLocked = xiLocks.includes(playerKey(player));
        const isActive = xiSwapSlot === player.slot;
        return `<button class="xi-player-card${isActive ? " xi-card-active" : ""}" type="button"
          onclick="openXiReplacements('${player.slot}')" style="--club-color:${tc(player.club)}">
          ${playerAvatar(player.player, player.club, 42)}
          <strong>${escapeHtml(player.player)}</strong>
          <span>${escapeHtml(sn(player.club))}</span>
          <small>${player.slot} · €${player.market_value_m}M${isLocked ? " 🔒" : ""}</small>
        </button>`;
      }).join("")}
    </div>`).join("");
  body.innerHTML = selected.map(player => `
    <tr><td>${player.slot}</td><td class="name-col">${playerAvatar(player.player, player.club, 26)} ${player.player}</td>
    <td>${crestImg(player.club, 18)} ${sn(player.club)}</td><td>${player.position}</td><td>${player.mins.toLocaleString()}</td>
    <td>${player.goals}</td><td>${player.assists}</td><td>${fmt(player.perf90, 2)}</td><td>€${player.market_value_m}M</td><td class="vfm-col">${fmt(player.adjusted_vfm, 1)}</td></tr>`).join("");

  // Render budget panel
  renderXiBudgetPanel(lineup);

  // Re-render sim results if we already ran a simulation
  if (xiLastSimResult) renderXiPrediction(xiLastSimResult);

  if (!replacements) return;
  if (!xiSwapSlot) {
    replacements.innerHTML = `<span class="comparison-status">👆 Click a pitch card to swap that player for another eligible option.</span>`;
    return;
  }

  // Enhanced replacement picker
  const slotIdx = slotIndex(slots, xiSwapSlot);
  const slotPos = slots[slotIdx];
  const currentPlayer = selected.find(p => p.slot === xiSwapSlot);

  // Pool of candidates: all eligible for this position (minus already-selected players)
  const positionPool = eligible
    .filter(c => c.position === slotPos && !selected.some(p => playerKey(p) === playerKey(c)));

  // Constraint-valid subset
  const validCandidates = positionPool.filter(c => {
    const players = [...lineup.players];
    players[slotIdx] = c;
    return !validateXiLineup(players, slots);
  });

  // Decide which pool to show
  const showPool = xiShowAllCandidates ? positionPool : validCandidates;

  // Apply search filter
  const sq = xiReplacementSearch.trim().toLowerCase();
  const filtered = sq
    ? showPool.filter(c => c.player.toLowerCase().includes(sq) || c.club.toLowerCase().includes(sq))
    : showPool;

  const displayedCandidates = filtered.slice(0, 24);

  const excludeKey = currentPlayer ? encodeURIComponent(playerKey(currentPlayer)) : "";
  replacements.innerHTML = `
    <div class="section-hdr compact-hdr">
      <h3>Pick player for ${xiSwapSlot} (${slotPos})</h3>
      <p>${validCandidates.length} constraint-valid · ${positionPool.length} total eligible</p>
    </div>
    <div class="replacement-header-row">
      <input class="replacement-search" type="text" placeholder="Search by name or club…"
        value="${escapeHtml(xiReplacementSearch)}"
        oninput="updateXiReplacementSearch(this.value)" />
      <button class="replacement-show-all-btn${xiShowAllCandidates ? " active" : ""}"
        onclick="toggleXiShowAll()">
        ${xiShowAllCandidates ? "Constraint-valid only" : "Show all eligible"}
      </button>
      ${currentPlayer && !xiLocks.includes(playerKey(currentPlayer)) ? `
        <button class="replacement-exclude-btn"
          onclick="excludeCurrentXiSlot('${xiSwapSlot}','${excludeKey}')">
          🚫 Remove ${escapeHtml(currentPlayer.player)}
        </button>` : ""}
    </div>
    <div class="replacement-grid">
      ${displayedCandidates.map(c => {
        const valid = !xiShowAllCandidates || !validCandidates.some(vc => playerKey(vc) === playerKey(c))
          ? validCandidates.some(vc => playerKey(vc) === playerKey(c)) : false;
        const borderStyle = (!xiShowAllCandidates || valid) ? "" : "opacity:.55";
        const ga = c.goals + c.assists;
        return `<button class="replacement-card" type="button" style="${borderStyle}"
          onclick="applyXiSwap('${xiSwapSlot}','${encodeURIComponent(playerKey(c))}')">
          <strong>${escapeHtml(c.player)}</strong>
          <span>${escapeHtml(sn(c.club))} · €${c.market_value_m}M</span>
          <div class="replacement-card-stats">
            <span class="replacement-card-stat">⚽ ${c.goals}G ${c.assists}A</span>
            <span class="replacement-card-stat">📊 ${fmt(c.adjusted_vfm, 1)} VFM</span>
            <span class="replacement-card-stat">⭐ ${fmt(c.role_score || 0, 1)}</span>
          </div>
        </button>`;
      }).join("") || `<span class="comparison-status">No players match — try clearing the search or toggling "Show all eligible".</span>`}
    </div>`;
}

/* ════════════════════════════════════════════════════════════
   XI BUDGET PANEL
   ════════════════════════════════════════════════════════════ */
function renderXiBudgetPanel(lineup) {
  const panel = document.getElementById("xiBudgetPanel");
  if (!panel) return;

  const budget = xiSettings.maxValue === "" ? null : Number(xiSettings.maxValue);
  const spent  = lineup ? lineup.totalValue : 0;
  const count  = lineup ? (lineup.players?.length ?? lineup.filledCount ?? 0) : 0;
  const remaining = budget !== null ? budget - spent : null;
  const pct    = budget ? Math.min((spent / budget) * 100, 100) : 0;
  const over   = budget !== null && spent > budget;
  const barColor = over ? "var(--red)" : pct > 88 ? "var(--yellow)" : "var(--green)";

  panel.innerHTML = `
    <div class="xi-panel-title">💰 Budget Tracker</div>
    <div class="xi-budget-row"><span>Players picked</span><strong>${count} / 11</strong></div>
    <div class="xi-budget-row"><span>Total spent</span><strong style="color:var(--cyan)">€${fmt(spent)}M</strong></div>
    ${budget !== null ? `
      <div class="xi-budget-row"><span>Budget cap</span><strong>€${fmt(budget)}M</strong></div>
      <div class="xi-budget-row">
        <span>Remaining</span>
        <strong style="color:${over ? "var(--red)" : "var(--green)"}">${over ? "" : "+"}€${fmt(remaining)}M</strong>
      </div>
      <div class="xi-budget-bar-wrap">
        <div class="xi-budget-bar-fill" style="width:${pct.toFixed(1)}%;background-color:${barColor}"></div>
      </div>
      <p class="xi-budget-player-count">${over ? "⚠️ Over budget" : pct > 88 ? "⚡ Nearly full" : "✅ Within budget"}</p>
    ` : `
      <div class="xi-budget-row"><span>Budget cap</span><strong style="color:var(--t3)">None set</strong></div>
      <p class="xi-budget-player-count" style="margin-top:.55rem">Set a budget cap in the controls above.</p>
    `}`;
}

/* ════════════════════════════════════════════════════════════
   PER-POSITION BUDGET
   ════════════════════════════════════════════════════════════ */
function updateXiPositionBudget(pos, value) {
  xiPositionBudgets[pos] = value;
  syncUrlState();
  renderXiPositionBudgets();
  // Refresh picker panel constraints if it's open for this position
  if (xiPickerSlot) {
    const slots = FORMATIONS[xiSettings.formation] || FORMATIONS["4-3-3"];
    const labels = slotLabels(slots);
    renderXiPickerPanel(slots, labels, getBuilderSquadPlayers());
  }
}

function renderXiPositionBudgets() {
  const grid = document.getElementById("xiPosBudgetGrid");
  if (!grid) return;

  const slots = FORMATIONS[xiSettings.formation] || FORMATIONS["4-3-3"];
  const squadPlayers = getBuilderSquadPlayers();

  const posSlotCounts = { GK: 0, DF: 0, MF: 0, FW: 0 };
  slots.forEach(s => { posSlotCounts[s] = (posSlotCounts[s] || 0) + 1; });

  const posSpend  = { GK: 0, DF: 0, MF: 0, FW: 0 };
  const posFilled = { GK: 0, DF: 0, MF: 0, FW: 0 };
  squadPlayers.filter(Boolean).forEach(p => {
    posSpend[p.position]  = (posSpend[p.position]  || 0) + p.market_value_m;
    posFilled[p.position] = (posFilled[p.position] || 0) + 1;
  });

  const posIcons  = { GK: "🧤", DF: "🛡️", MF: "🔀", FW: "⚽" };
  const posNames  = { GK: "Goalkeepers", DF: "Defenders", MF: "Midfielders", FW: "Forwards" };
  const posColors = { GK: C.yellow, DF: C.green, MF: C.blue, FW: C.red };

  grid.innerHTML = ["GK", "DF", "MF", "FW"].map(pos => {
    const cap      = xiPositionBudgets[pos] !== "" ? Number(xiPositionBudgets[pos]) : null;
    const spent    = posSpend[pos]  || 0;
    const filled   = posFilled[pos] || 0;
    const total    = posSlotCounts[pos] || 0;
    const color    = posColors[pos];
    const over     = cap !== null && spent > cap;
    const pct      = cap ? Math.min(spent / cap * 100, 100) : 0;
    const barColor = over ? "var(--red)" : pct > 88 ? "var(--yellow)" : color;

    return `
    <div class="xi-pos-budget-card" style="--pos-color:${color}">
      <div class="xi-pos-budget-header">
        <span class="xi-pos-budget-icon">${posIcons[pos]}</span>
        <div>
          <div class="xi-pos-budget-name">${posNames[pos]}</div>
          <div class="xi-pos-budget-slots" style="color:var(--t3)">${filled}/${total} slots filled</div>
        </div>
        <div class="xi-pos-spent-badge" style="color:${over ? "var(--red)" : "var(--cyan)"}">€${fmt(spent)}M</div>
      </div>
      ${cap !== null ? `
        <div class="xi-budget-bar-wrap">
          <div class="xi-budget-bar-fill" style="width:${pct.toFixed(1)}%;background:${barColor}"></div>
        </div>
        <div class="xi-pos-budget-info">
          <span style="color:var(--t3)">Cap: €${fmt(cap)}M</span>
          <span style="color:${over ? "var(--red)" : "var(--green)"}">${over ? "⚠️ €" + fmt(spent - cap) + "M over" : "€" + fmt(cap - spent) + "M left"}</span>
        </div>
      ` : ""}
      <label class="xi-pos-budget-label">
        <span>Cap (€M)</span>
        <input type="number" min="0" step="5" placeholder="No limit"
          value="${escapeHtml(xiPositionBudgets[pos])}"
          oninput="updateXiPositionBudget('${pos}', this.value)" />
      </label>
    </div>`;
  }).join("");
}

/* ════════════════════════════════════════════════════════════
   REPLACEMENT SEARCH HELPER
   ════════════════════════════════════════════════════════════ */
function updateXiReplacementSearch(val) {
  xiReplacementSearch = val;
  renderXi();
}

function toggleXiShowAll() {
  xiShowAllCandidates = !xiShowAllCandidates;
  renderXi();
}

function excludeCurrentXiSlot(slot, encodedKey) {
  const key = decodeURIComponent(encodedKey);
  if (!xiExclusions.includes(key)) xiExclusions.push(key);
  xiManualSwaps = Object.fromEntries(
    Object.entries(xiManualSwaps).filter(([s]) => s !== slot)
  );
  xiSwapSlot = "";
  xiReplacementSearch = "";
  xiShowAllCandidates = false;
  renderXiRosterControls();
  syncUrlState();
  renderXi();
}

/* ════════════════════════════════════════════════════════════
   TEAM STRENGTH CALCULATOR
   ════════════════════════════════════════════════════════════ */
function computeTeamStrength(players) {
  const all = allComputedPlayers();
  const maxRS = Math.max(...all.map(p => p.role_score || 0)) || 1;

  const fwPool = all.filter(p => p.position === "FW" && p.mins > 0);
  const mfPool = all.filter(p => p.position === "MF" && p.mins > 0);
  const maxG90FW  = Math.max(...fwPool.map(p => p.goals / (p.mins / 90))) || 1;
  const maxGA90MF = Math.max(...mfPool.map(p => (p.goals + p.assists) / (p.mins / 90))) || 1;

  const gk = players.filter(p => p.position === "GK");
  const df = players.filter(p => p.position === "DF");
  const mf = players.filter(p => p.position === "MF");
  const fw = players.filter(p => p.position === "FW");

  const avg = (arr, fn) => arr.length ? arr.reduce((s, p) => s + fn(p), 0) / arr.length : 0.45;

  const gkScore = avg(gk, p => {
    const rs = (p.role_score || 0) / maxRS;
    const cs = Math.min((p.clean_sheets || 0) / Math.max(p.apps || 1, 1) / 0.42, 1);
    return rs * 0.65 + cs * 0.35;
  });

  const dfScore = avg(df, p => {
    const rs = (p.role_score || 0) / maxRS;
    const t90 = p.mins > 0 ? (p.tackles_won || 0) / (p.mins / 90) : 0;
    const i90 = p.mins > 0 ? (p.interceptions || 0) / (p.mins / 90) : 0;
    return rs * 0.65 + Math.min((t90 + i90) / 7, 1) * 0.35;
  });

  const mfScore = avg(mf, p => {
    const rs = (p.role_score || 0) / maxRS;
    const ga90 = p.mins > 0 ? (p.goals + p.assists) / (p.mins / 90) / maxGA90MF : 0;
    return rs * 0.70 + ga90 * 0.30;
  });

  const fwScore = avg(fw, p => {
    const rs = (p.role_score || 0) / maxRS;
    const g90 = p.mins > 0 ? p.goals / (p.mins / 90) / maxG90FW : 0;
    const a90 = p.mins > 0 ? p.assists / (p.mins / 90) / maxGA90MF : 0;
    return rs * 0.55 + g90 * 0.30 + a90 * 0.15;
  });

  // Weighted composite (FW 35%, MF 25%, DF 25%, GK 15%)
  const composite = fwScore * 35 + mfScore * 25 + dfScore * 25 + gkScore * 15;

  return {
    overall:  Math.min(composite, 100),
    attack:   Math.min((fwScore * 0.70 + mfScore * 0.30) * 100, 100),
    midfield: Math.min(mfScore * 100, 100),
    defense:  Math.min((dfScore * 0.75 + gkScore * 0.25) * 100, 100),
    gk:       Math.min(gkScore * 100, 100),
  };
}

/* ════════════════════════════════════════════════════════════
   SEASON PREDICTOR  (Monte Carlo, 3 000 runs)
   ════════════════════════════════════════════════════════════ */
function runXiSimulation() {
  const resultsEl = document.getElementById("xiSimResults");
  if (!resultsEl) return;

  const players = getBuilderSquadPlayers().filter(Boolean);
  if (players.length !== 11) {
    resultsEl.innerHTML = `<p class="xi-panel-hint" style="color:var(--red);margin-top:.6rem">Fill all 11 slots first, then simulate.</p>`;
    return;
  }

  const strength = computeTeamStrength(players);

  // Calibrated win probability per match:
  // strength=0   → win%≈6%, draw%≈24%   (relegated-level, ~3 wins)
  // strength=55  → win%≈40%, draw%≈22%  (mid-table, ~15 wins)
  // strength=82  → win%≈57%, draw%≈19%  (Liverpool 24/25: 25 wins)
  // strength=100 → win%≈68%, draw%≈17%  (~26-28 wins possible)
  const s = strength.overall / 100;
  const winP  = 0.06 + s * 0.62;
  const drawP = 0.24 - s * 0.07;

  const N = 3000;
  let tw = 0, td = 0;
  for (let sim = 0; sim < N; sim++) {
    for (let m = 0; m < 38; m++) {
      const r = Math.random();
      if (r < winP) tw++;
      else if (r < winP + drawP) td++;
    }
  }

  const wins   = Math.round(tw / N);
  const draws  = Math.round(td / N);
  const losses = 38 - wins - draws;
  const points = wins * 3 + draws;

  xiLastSimResult = { wins, draws, losses, points, strength };
  renderXiPrediction(xiLastSimResult);
}

function renderXiPrediction(res) {
  const el = document.getElementById("xiSimResults");
  if (!el || !res) return;
  const { wins, draws, losses, points, strength } = res;
  const winPct = ((wins / 38) * 100).toFixed(1);

  const sc = v => v >= 75 ? "#10b981" : v >= 50 ? "#22d3ee" : v >= 28 ? "#f59e0b" : "#ef4444";
  const bar = (label, val) => `
    <div class="xi-strength-item">
      <span class="xi-strength-label">${label}</span>
      <div class="xi-strength-bar-wrap">
        <div class="xi-strength-bar" style="width:${val.toFixed(1)}%;background:${sc(val)}"></div>
      </div>
      <span class="xi-strength-val">${val.toFixed(0)}</span>
    </div>`;

  el.innerHTML = `
    <div class="xi-sim-result-main">
      <div class="xi-sim-wins">${wins}<sub>/38</sub></div>
      <div class="xi-sim-label">Predicted Wins · ${winPct}%</div>
      <div class="xi-sim-pts">${points} pts · ${draws}D · ${losses}L</div>
    </div>
    <div class="xi-wdl-legend">
      <span style="color:var(--green)">W ${wins}</span>
      <span style="color:var(--yellow)">D ${draws}</span>
      <span style="color:var(--red)">L ${losses}</span>
    </div>
    <div class="xi-wdl-bar">
      <div class="xi-wdl-w" style="width:${(wins/38*100).toFixed(1)}%"></div>
      <div class="xi-wdl-d" style="width:${(draws/38*100).toFixed(1)}%"></div>
      <div class="xi-wdl-l" style="width:${(losses/38*100).toFixed(1)}%"></div>
    </div>
    <div class="xi-strength-section">
      <div class="xi-strength-title">Team Strength</div>
      ${bar("Overall", strength.overall)}
      ${bar("Attack", strength.attack)}
      ${bar("Midfield", strength.midfield)}
      ${bar("Defense", strength.defense)}
      ${bar("GK", strength.gk)}
    </div>`;
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

/* ════════════════════════════════════════════════════════════
   CLUB COMPARISON
   ════════════════════════════════════════════════════════════ */
function renderCompareControls() {
  const options = (DATA.standings || []).map(t => `<option value="${t.team}">${t.team}</option>`).join("");
  const a = document.getElementById("compareTeamA");
  const b = document.getElementById("compareTeamB");
  if (!a || !b) return;
  a.innerHTML = options;
  b.innerHTML = options;
  const teams = (DATA.standings || []).map(t => t.team);
  a.value = teams[0] || "";
  b.value = teams[1] || "";
}

const _cmpCharts = {};
function renderCompare() {
  const teamA = document.getElementById("compareTeamA")?.value;
  const teamB = document.getElementById("compareTeamB")?.value;
  if (!teamA || !teamB) return;

  const sA = standingFor(teamA), sB = standingFor(teamB);
  const qA = squadFor(teamA),    qB = squadFor(teamB);
  const mA = teamMetric(teamA),  mB = teamMetric(teamB);
  if (!sA || !sB) return;

  // -- KPI strip --
  const kpiDefs = [
    { label: "Points",      a: sA.Pts,             b: sB.Pts,             fmt: v => v,           hi: "high" },
    { label: "Goals For",   a: sA.GF,              b: sB.GF,              fmt: v => v,           hi: "high" },
    { label: "Goals Ag.",   a: sA.GA,              b: sB.GA,              fmt: v => v,           hi: "low"  },
    { label: "xG",          a: qA?.xG,             b: qB?.xG,             fmt: v => fmt(v,1),    hi: "high" },
    { label: "xGA",         a: qA?.xGA,            b: qB?.xGA,            fmt: v => fmt(v,1),    hi: "low"  },
    { label: "Possession",  a: qA?.possession,     b: qB?.possession,     fmt: v => `${fmt(v,1)}%`, hi: "high" },
    { label: "Clean Sheets",a: qA?.clean_sheets,   b: qB?.clean_sheets,   fmt: v => v,           hi: "high" },
    { label: "Squad €M",    a: mA?.squad_value_m,  b: mB?.squad_value_m,  fmt: v => `€${fmt(v)}M`, hi: "none" },
    { label: "Wages £M",    a: mA?.wage_bill_m,    b: mB?.wage_bill_m,    fmt: v => `£${fmt(v)}M`, hi: "none" },
    { label: "£M/Point",    a: mA?.cost_per_point, b: mB?.cost_per_point, fmt: v => `£${fmt(v,2)}M`, hi: "low" },
  ];
  document.getElementById("compareHeadA").textContent = sn(teamA);
  document.getElementById("compareHeadB").textContent = sn(teamB);

  const winner = (a, b, hi) => {
    if (hi === "none" || a == null || b == null) return ["", ""];
    if (hi === "high") return a > b ? ["win", "lose"] : a < b ? ["lose", "win"] : ["draw", "draw"];
    return a < b ? ["win", "lose"] : a > b ? ["lose", "win"] : ["draw", "draw"];
  };

  document.getElementById("compareKpis").innerHTML = kpiDefs.map(k => {
    const [wA, wB] = winner(k.a, k.b, k.hi);
    const va = k.a != null ? k.fmt(k.a) : "–";
    const vb = k.b != null ? k.fmt(k.b) : "–";
    return `<div class="cmp-kpi">
      <div class="cmp-kpi-label">${k.label}</div>
      <div class="cmp-kpi-vals">
        <span class="cmp-val cmp-${wA}" style="color:${tc(teamA)}">${va}</span>
        <span class="cmp-vs">vs</span>
        <span class="cmp-val cmp-${wB}" style="color:${tc(teamB)}">${vb}</span>
      </div>
    </div>`;
  }).join("");

  // -- Radar --
  const radarFields = [
    { key: "points",       label: "Points",       src: "standing" },
    { key: "GF",           label: "Goals",        src: "standing" },
    { key: "xG",           label: "xG",           src: "squad"    },
    { key: "xGAinv",       label: "Def (−xGA)",   src: "derived"  },
    { key: "possession",   label: "Possession",   src: "squad"    },
    { key: "tackles",      label: "Tackles",      src: "squad"    },
    { key: "clean_sheets", label: "Clean Sheets", src: "squad"    },
  ];
  const allSquads = DATA.squads || [];
  const maxOf = key => Math.max(...allSquads.map(s => s[key] || 0));
  const maxPts = Math.max(...(DATA.standings || []).map(s => s.Pts));
  const maxGF  = Math.max(...(DATA.standings || []).map(s => s.GF));
  const maxXGA = Math.max(...allSquads.map(s => s.xGA || 0));

  const normalize = (val, max) => max > 0 ? Math.round((val / max) * 100) : 0;
  const radarVal = (team, sq, st) => radarFields.map(f => {
    if (f.key === "points")   return normalize(st.Pts, maxPts);
    if (f.key === "GF")       return normalize(st.GF, maxGF);
    if (f.key === "xGAinv")   return sq?.xGA != null ? Math.round(100 - normalize(sq.xGA, maxXGA)) : 50;
    if (f.src === "squad")    return normalize(sq?.[f.key] || 0, maxOf(f.key));
    return 0;
  });

  const ctx = document.getElementById("cCompareRadar");
  if (!ctx) return;
  if (_cmpCharts.radar) _cmpCharts.radar.destroy();
  _cmpCharts.radar = new Chart(ctx, {
    type: "radar",
    data: {
      labels: radarFields.map(f => f.label),
      datasets: [
        { label: sn(teamA), data: radarVal(teamA, qA, sA), borderColor: tc(teamA), backgroundColor: tc(teamA) + "33", pointBackgroundColor: tc(teamA) },
        { label: sn(teamB), data: radarVal(teamB, qB, sB), borderColor: tc(teamB), backgroundColor: tc(teamB) + "33", pointBackgroundColor: tc(teamB) },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { r: { beginAtZero: true, max: 100, ticks: { display: false }, grid: { color: "rgba(255,255,255,.08)" }, pointLabels: { color: "#94a3b8", font: { size: 13 } } } },
      plugins: { legend: { labels: { color: "#e2e8f0" } } },
    },
  });

  // -- Stats table --
  const tableRows = [
    { label: "League Position", a: sA.position, b: sB.position },
    { label: "Matches Played",  a: sA.MP, b: sB.MP },
    { label: "Won",             a: sA.W, b: sB.W },
    { label: "Drawn",           a: sA.D, b: sB.D },
    { label: "Lost",            a: sA.L, b: sB.L },
    { label: "Goals For",       a: sA.GF, b: sB.GF },
    { label: "Goals Against",   a: sA.GA, b: sB.GA },
    { label: "Goal Difference", a: sA.GD, b: sB.GD },
    { label: "Points",          a: sA.Pts, b: sB.Pts },
    { label: "xG",              a: qA?.xG   != null ? fmt(qA.xG,1)   : "–", b: qB?.xG   != null ? fmt(qB.xG,1)   : "–" },
    { label: "xGA",             a: qA?.xGA  != null ? fmt(qA.xGA,1)  : "–", b: qB?.xGA  != null ? fmt(qB.xGA,1)  : "–" },
    { label: "Possession %",    a: qA?.possession != null ? fmt(qA.possession,1) : "–", b: qB?.possession != null ? fmt(qB.possession,1) : "–" },
    { label: "Tackles",         a: qA?.tackles  ?? "–", b: qB?.tackles  ?? "–" },
    { label: "Yellow Cards",    a: qA?.yellow_cards ?? "–", b: qB?.yellow_cards ?? "–" },
    { label: "Red Cards",       a: qA?.red_cards ?? "–", b: qB?.red_cards ?? "–" },
    { label: "Clean Sheets",    a: qA?.clean_sheets ?? "–", b: qB?.clean_sheets ?? "–" },
    { label: "Squad Value €M",  a: mA?.squad_value_m != null ? `€${fmt(mA.squad_value_m)}M` : "–", b: mB?.squad_value_m != null ? `€${fmt(mB.squad_value_m)}M` : "–" },
    { label: "Wage Bill £M",    a: mA?.wage_bill_m   != null ? `£${fmt(mA.wage_bill_m)}M`   : "–", b: mB?.wage_bill_m   != null ? `£${fmt(mB.wage_bill_m)}M`   : "–" },
    { label: "Cost per Point",  a: mA?.cost_per_point != null ? `£${fmt(mA.cost_per_point,2)}M` : "–", b: mB?.cost_per_point != null ? `£${fmt(mB.cost_per_point,2)}M` : "–" },
    { label: "Value Index",     a: mA?.value_index != null ? fmt(mA.value_index,2) : "–", b: mB?.value_index != null ? fmt(mB.value_index,2) : "–" },
  ];
  document.getElementById("compareTableBody").innerHTML = tableRows.map(r => `
    <tr><td>${r.label}</td><td style="color:${tc(teamA)}">${r.a}</td><td style="color:${tc(teamB)}">${r.b}</td></tr>`).join("");

  // -- Top players --
  const topFor = team => allComputedPlayers()
    .filter(p => p.club === team && p.mins >= 500 && p.market_value_m > 0)
    .sort((a, b) => b.vfm - a.vfm).slice(0, 8);
  const playerRow = p => `
    <div class="cmp-player">
      ${playerAvatar(p.player, p.club, 36)}
      <div class="cmp-player-info">
        <strong>${p.player}</strong>
        <span>${p.position} · ${p.mins.toLocaleString()} mins · VFM ${fmt(p.vfm,1)}</span>
      </div>
    </div>`;
  document.getElementById("comparePlayers").innerHTML = `
    <div class="compare-player-cols">
      <div class="cmp-col">
        <div class="cmp-col-header" style="border-color:${tc(teamA)};color:${tc(teamA)}">${crestImg(teamA,24)} ${sn(teamA)} — Top VFM Players</div>
        ${topFor(teamA).map(playerRow).join("")}
      </div>
      <div class="cmp-col">
        <div class="cmp-col-header" style="border-color:${tc(teamB)};color:${tc(teamB)}">${crestImg(teamB,24)} ${sn(teamB)} — Top VFM Players</div>
        ${topFor(teamB).map(playerRow).join("")}
      </div>
    </div>`;
}

/* ════════════════════════════════════════════════════════════
   EXPECTED GOALS (xG)
   ════════════════════════════════════════════════════════════ */
const _xgCharts = {};
function renderXg() {
  const squads    = DATA.squads || [];
  const standings = DATA.standings || [];
  const players   = allComputedPlayers().filter(p => p.mins >= 900 && p.xg_per90 != null);

  // merge standing pos into squads for convenience
  const merged = squads.map(s => {
    const st = standings.find(t => t.team === s.team) || {};
    return { ...s, goals: st.GF || 0, goals_against: st.GA || 0, pts: st.Pts || 0, pos: st.position || 99 };
  }).filter(s => s.xG != null).sort((a, b) => b.xG - a.xG);

  // Chart 1: xG vs Actual Goals (grouped bar, sorted by xG)
  const c1 = document.getElementById("cXgVsGoals");
  if (c1) {
    if (_xgCharts.vsGoals) _xgCharts.vsGoals.destroy();
    _xgCharts.vsGoals = new Chart(c1, {
      type: "bar",
      data: {
        labels: merged.map(s => sn(s.team)),
        datasets: [
          { label: "Actual Goals", data: merged.map(s => s.goals), backgroundColor: merged.map(s => tc(s.team) + "cc") },
          { label: "xG", data: merged.map(s => +fmt(s.xG,1)), backgroundColor: merged.map(s => tc(s.team) + "55"), borderColor: merged.map(s => tc(s.team)), borderWidth: 1 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: "y",
        plugins: { legend: { labels: { color: "#94a3b8" } } },
        scales: { x: { ticks: { color: "#64748b" }, grid: { color: "rgba(255,255,255,.04)" } }, y: { ticks: { color: "#94a3b8" } } },
      },
    });
  }

  // Chart 2: xG vs xGA scatter (bubble size = points)
  const c2 = document.getElementById("cXgScatter");
  if (c2) {
    if (_xgCharts.scatter) _xgCharts.scatter.destroy();
    _xgCharts.scatter = new Chart(c2, {
      type: "bubble",
      data: {
        datasets: merged.map(s => ({
          label: sn(s.team),
          data: [{ x: +fmt(s.xG,1), y: +fmt(s.xGA,1), r: Math.max(4, s.pts / 8) }],
          backgroundColor: tc(s.team) + "88",
          borderColor: tc(s.team),
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label} — xG ${ctx.parsed.x} · xGA ${ctx.parsed.y} · ${Math.round(ctx.raw.r * 8)} pts` } } },
        scales: {
          x: { title: { display: true, text: "xG (attack)", color: "#94a3b8" }, ticks: { color: "#64748b" }, grid: { color: "rgba(255,255,255,.04)" } },
          y: { title: { display: true, text: "xGA (lower = better defence)", color: "#94a3b8" }, ticks: { color: "#64748b" }, grid: { color: "rgba(255,255,255,.04)" } },
        },
      },
    });
  }

  // Chart 3: xG overperformance (goals - xG), horizontal bar
  const overperf = [...merged].sort((a, b) => (b.goals - b.xG) - (a.goals - a.xG));
  const c3 = document.getElementById("cXgOverperf");
  if (c3) {
    if (_xgCharts.overperf) _xgCharts.overperf.destroy();
    _xgCharts.overperf = new Chart(c3, {
      type: "bar",
      data: {
        labels: overperf.map(s => sn(s.team)),
        datasets: [{
          label: "Goals − xG",
          data: overperf.map(s => +(s.goals - s.xG).toFixed(1)),
          backgroundColor: overperf.map(s => s.goals - s.xG >= 0 ? C.green + "cc" : C.red + "cc"),
          borderColor:     overperf.map(s => s.goals - s.xG >= 0 ? C.green : C.red),
          borderWidth: 1,
        }],
      },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { color: "#64748b" }, grid: { color: "rgba(255,255,255,.04)" } }, y: { ticks: { color: "#94a3b8" } } },
      },
    });
  }

  // Chart 4: Top xG/90 players
  const topXg = [...players].sort((a, b) => b.xg_per90 - a.xg_per90).slice(0, 20);
  const c4 = document.getElementById("cXgPlayers");
  if (c4) {
    if (_xgCharts.players) _xgCharts.players.destroy();
    _xgCharts.players = new Chart(c4, {
      type: "bar",
      data: {
        labels: topXg.map(p => p.player),
        datasets: [{ label: "xG per 90", data: topXg.map(p => +fmt(p.xg_per90,2)), backgroundColor: topXg.map(p => tc(p.club) + "cc"), borderColor: topXg.map(p => tc(p.club)), borderWidth: 1 }],
      },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: "y",
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${topXg[ctx.dataIndex].club} — xG/90: ${ctx.parsed.x}` } } },
        scales: { x: { ticks: { color: "#64748b" }, grid: { color: "rgba(255,255,255,.04)" } }, y: { ticks: { color: "#94a3b8", font: { size: 11 } } } },
      },
    });
  }

  // Chart 5: Top xA/90 players
  const topXa = [...players].filter(p => p.xa_per90 != null).sort((a, b) => b.xa_per90 - a.xa_per90).slice(0, 20);
  const c5 = document.getElementById("cXaPlayers");
  if (c5) {
    if (_xgCharts.xaPlayers) _xgCharts.xaPlayers.destroy();
    _xgCharts.xaPlayers = new Chart(c5, {
      type: "bar",
      data: {
        labels: topXa.map(p => p.player),
        datasets: [{ label: "xA per 90", data: topXa.map(p => +fmt(p.xa_per90,2)), backgroundColor: topXa.map(p => tc(p.club) + "cc"), borderColor: topXa.map(p => tc(p.club)), borderWidth: 1 }],
      },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: "y",
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${topXa[ctx.dataIndex].club} — xA/90: ${ctx.parsed.x}` } } },
        scales: { x: { ticks: { color: "#64748b" }, grid: { color: "rgba(255,255,255,.04)" } }, y: { ticks: { color: "#94a3b8", font: { size: 11 } } } },
      },
    });
  }

  // xG table
  const body = document.getElementById("xgTableBody");
  if (body) {
    const withXg = (DATA.squads || []).map(s => {
      const st = standings.find(t => t.team === s.team) || {};
      return { ...s, goals: st.GF || 0, goals_against: st.GA || 0, pts: st.Pts || 0, pos: st.position || 99 };
    }).filter(s => s.xG != null).sort((a, b) => a.pos - b.pos);
    const sign = v => v > 0 ? `<span class="xg-pos">+${fmt(v,1)}</span>` : `<span class="xg-neg">${fmt(v,1)}</span>`;
    body.innerHTML = withXg.map(s => {
      const gxg  = s.goals - s.xG;
      const gaxga = s.goals_against - (s.xGA || 0);
      const diff  = (s.goals - s.xG) - (s.goals_against - (s.xGA || 0));
      return `<tr>
        <td class="name-col">${crestImg(s.team,18)} ${sn(s.team)}</td>
        <td>${s.pos}</td>
        <td>${s.goals}</td><td>${s.xG != null ? fmt(s.xG,1) : "–"}</td><td>${sign(gxg)}</td>
        <td>${s.goals_against}</td><td>${s.xGA != null ? fmt(s.xGA,1) : "–"}</td><td>${sign(-gaxga)}</td>
        <td>${s.xG != null ? fmt(s.xG,1) : "–"}</td>
        <td>${s.xGA != null ? fmt(s.xGA,1) : "–"}</td>
        <td>${sign(diff)}</td>
      </tr>`;
    }).join("");
  }
}

/* ════════════════════════════════════════════════════════════
   SEASON TIMELINE
   ════════════════════════════════════════════════════════════ */
const SEASON_EVENTS = [
  { date: "2024-08-16", type: "season",  emoji: "🏟️", title: "Season Kicks Off",                  desc: "Matchday 1 of the 2024–2025 Premier League season. All 20 clubs begin their campaign.", teams: [] },
  { date: "2024-08-25", type: "match",   emoji: "⚽", title: "Ipswich Town promoted debut",         desc: "Ipswich Town make their Premier League return after 22 years. Expectations are high for the newly promoted side.", teams: ["Ipswich Town"] },
  { date: "2024-09-14", type: "record",  emoji: "📊", title: "Salah's relentless early form",      desc: "Mohamed Salah continues his prolific start — goals and assists in almost every appearance, setting the pace for the Golden Boot race.", teams: ["Liverpool"] },
  { date: "2024-10-19", type: "match",   emoji: "🔴", title: "Liverpool top the table",            desc: "Liverpool establish themselves at the summit of the Premier League under Arne Slot in his first season as manager.", teams: ["Liverpool"] },
  { date: "2024-11-09", type: "match",   emoji: "🌳", title: "Nottingham Forest's defensive run",  desc: "Nottingham Forest showcase outstanding defensive resilience, going on one of the season's best unbeaten runs at the City Ground.", teams: ["Nottingham Forest"] },
  { date: "2024-12-22", type: "match",   emoji: "🎄", title: "Spurs 3–6 Liverpool",                desc: "Boxing week thriller: Tottenham Hotspur 3–6 Liverpool — the highest-scoring match of the 2024–2025 season. Salah at the heart of everything.", teams: ["Tottenham Hotspur", "Liverpool"] },
  { date: "2025-01-19", type: "match",   emoji: "💥", title: "Ipswich 0–6 Manchester City",        desc: "Manchester City produce the biggest away win of the season, thumping Ipswich Town 0–6 at Portman Road.", teams: ["Ipswich Town", "Manchester City"] },
  { date: "2025-02-01", type: "match",   emoji: "🌳", title: "Forest 7–0 Brighton",                desc: "Nottingham Forest demolish Brighton 7–0 — the biggest home win of the entire season. A historic afternoon at the City Ground.", teams: ["Nottingham Forest", "Brighton & Hove Albion"] },
  { date: "2025-02-15", type: "record",  emoji: "📈", title: "Liverpool's 26-match unbeaten run",  desc: "Liverpool extend their unbeaten run to 26 matches — the longest of any club in the 2024–2025 season, cementing their title credentials.", teams: ["Liverpool"] },
  { date: "2025-03-22", type: "award",   emoji: "🏆", title: "Salah named Player of the Month",   desc: "Mohamed Salah wins his fourth Premier League Player of the Month award of the season — an unprecedented level of consistency.", teams: ["Liverpool"] },
  { date: "2025-04-06", type: "record",  emoji: "📉", title: "Southampton relegated — record early", desc: "Southampton become the first team in Premier League history to be relegated this early in the season — a record low for the league.", teams: ["Southampton"] },
  { date: "2025-04-20", type: "season",  emoji: "🏆", title: "Liverpool seal the title",           desc: "Liverpool are crowned Premier League champions 2024–2025 — their 2nd Premier League title and 20th English top-flight title.", teams: ["Liverpool"] },
  { date: "2025-05-10", type: "season",  emoji: "🔴", title: "Leicester & Ipswich relegated",      desc: "Leicester City and Ipswich Town join Southampton in dropping to the Championship — all three promoted sides go straight back down.", teams: ["Leicester City", "Ipswich Town"] },
  { date: "2025-05-25", type: "award",   emoji: "👟", title: "Salah wins Golden Boot & awards",    desc: "Mohamed Salah (Liverpool) takes the Golden Boot (29 goals), Playmaker Award (18 assists) and Player of the Season — a historic treble.", teams: ["Liverpool"] },
  { date: "2025-05-25", type: "award",   emoji: "🧤", title: "Golden Glove — Raya & Sels",        desc: "David Raya (Arsenal) and Matz Sels (Nottingham Forest) share the Golden Glove with 13 clean sheets each.", teams: ["Arsenal", "Nottingham Forest"] },
  { date: "2025-05-25", type: "season",  emoji: "🎉", title: "Season Ends",                        desc: "The 2024–2025 Premier League season concludes. 380 matches, 1115 goals, 2.93 goals per game average. An unforgettable campaign.", teams: [] },
];

function renderTimeline() {
  const container = document.getElementById("seasonTimeline");
  if (!container) return;
  const filter = document.getElementById("timelineCategoryFilter")?.value || "all";
  const events = filter === "all" ? SEASON_EVENTS : SEASON_EVENTS.filter(e => e.type === filter);

  container.innerHTML = events.map((ev, i) => {
    const d = new Date(ev.date);
    const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const teamBadges = ev.teams.map(t => `<span class="tl-team-badge" style="border-color:${tc(t)};color:${tc(t)}">${crestImg(t, 14)} ${sn(t)}</span>`).join("");
    const typeColor = { season: C.yellow, match: C.cyan, record: C.purple, award: C.green }[ev.type] || C.purple;
    return `
    <div class="tl-item tl-${ev.type}" style="--tl-color:${typeColor}">
      <div class="tl-dot">${ev.emoji}</div>
      <div class="tl-content">
        <div class="tl-date">${dateStr}</div>
        <div class="tl-title">${ev.title}</div>
        <div class="tl-desc">${ev.desc}</div>
        ${teamBadges ? `<div class="tl-teams">${teamBadges}</div>` : ""}
      </div>
    </div>`;
  }).join("");
}

/* ════════════════════════════════════════════════════════════
   TRANSFER TIMELINE
   ════════════════════════════════════════════════════════════ */
const TRANSFERS = [
  // Summer 2024
  { window:"summer", month:"Jul 2024", player:"Dominic Solanke",       from:"Bournemouth",      to:"Tottenham Hotspur",    fee:"£65M",  type:"in",   pos:"FW", note:"Record Spurs signing" },
  { window:"summer", month:"Jul 2024", player:"Archie Gray",           from:"Leeds United",      to:"Tottenham Hotspur",    fee:"£40M",  type:"in",   pos:"MF", note:"Midfielder, 18 years old" },
  { window:"summer", month:"Jul 2024", player:"Wilson Odobert",        from:"Burnley",           to:"Tottenham Hotspur",    fee:"£25M",  type:"in",   pos:"MF", note:"French winger" },
  { window:"summer", month:"Jul 2024", player:"Pedro Neto",            from:"Wolverhampton Wanderers", to:"Chelsea",        fee:"£54M",  type:"in",   pos:"MF", note:"Portuguese winger" },
  { window:"summer", month:"Jul 2024", player:"Joao Pedro",            from:"Brighton & Hove Albion",  to:"Chelsea",        fee:"£35M",  type:"in",   pos:"FW", note:"Brazilian striker" },
  { window:"summer", month:"Jul 2024", player:"Kiernan Dewsbury-Hall", from:"Leicester City",    to:"Chelsea",              fee:"£30M",  type:"in",   pos:"MF", note:"England international" },
  { window:"summer", month:"Jul 2024", player:"Riccardo Calafiori",    from:"Bologna",           to:"Arsenal",              fee:"£42M",  type:"in",   pos:"DF", note:"Italy defender" },
  { window:"summer", month:"Aug 2024", player:"Mikel Merino",          from:"Real Sociedad",     to:"Arsenal",              fee:"£27M",  type:"in",   pos:"MF", note:"Spain international" },
  { window:"summer", month:"Jun 2024", player:"David Raya",            from:"Bayer Leverkusen",  to:"Arsenal",              fee:"£27M",  type:"in",   pos:"GK", note:"Permanent from loan" },
  { window:"summer", month:"Jun 2024", player:"Omari Kellyman",        from:"Aston Villa",       to:"Chelsea",              fee:"£19M",  type:"in",   pos:"MF", note:"Young England prospect" },
  { window:"summer", month:"Jul 2024", player:"Savinho",               from:"Girona",            to:"Manchester City",       fee:"£35M",  type:"in",   pos:"MF", note:"Brazilian winger, ex-City co-ownership" },
  { window:"summer", month:"Jul 2024", player:"Ilkay Gündoğan",        from:"Barcelona",         to:"Manchester City",       fee:"Free",  type:"in",   pos:"MF", note:"Returns to City on free transfer" },
  { window:"summer", month:"Aug 2024", player:"Federico Chiesa",       from:"Juventus",          to:"Liverpool",             fee:"£12M",  type:"in",   pos:"MF", note:"Italian winger" },
  { window:"summer", month:"Jul 2024", player:"Giorgi Mamardashvili",  from:"Valencia",          to:"Liverpool",             fee:"£29M",  type:"in",   pos:"GK", note:"Loaned back to Valencia 2024–25" },
  { window:"summer", month:"Jun 2024", player:"Lloyd Kelly",           from:"Bournemouth",       to:"Newcastle United",      fee:"Free",  type:"in",   pos:"DF", note:"Out of contract" },
  { window:"summer", month:"Aug 2024", player:"Yankuba Minteh",        from:"Newcastle United",  to:"Brighton & Hove Albion",fee:"£35M",  type:"in",   pos:"MF", note:"Senegal winger, loan buy" },
  { window:"summer", month:"Jul 2024", player:"Conor Gallagher",       from:"Chelsea",           to:"Atlético Madrid",       fee:"£33M",  type:"out",  pos:"MF", note:"Departs to La Liga" },
  { window:"summer", month:"Sep 2024", player:"Raheem Sterling",       from:"Chelsea",           to:"AC Milan",              fee:"Loan",  type:"loan", pos:"MF", note:"Season-long loan to Serie A" },
  { window:"summer", month:"Jul 2024", player:"Amadou Onana",          from:"Everton",           to:"Aston Villa",           fee:"£50M",  type:"in",   pos:"MF", note:"Belgian midfielder" },
  { window:"summer", month:"Jul 2024", player:"Ian Maatsen",           from:"Chelsea",           to:"Aston Villa",           fee:"£37.5M",type:"in",  pos:"DF", note:"Dutch full-back, permanent from loan" },
  // January 2025
  { window:"january", month:"Jan 2025", player:"Jhon Duran",           from:"Aston Villa",       to:"Al-Qadsiah",            fee:"£61.5M",type:"out",  pos:"FW", note:"Departs to Saudi Pro League mid-season" },
  { window:"january", month:"Jan 2025", player:"Marcus Rashford",      from:"Manchester United", to:"Aston Villa",           fee:"Loan",  type:"loan", pos:"MF", note:"Season-long loan; fell out of favour at United" },
  { window:"january", month:"Jan 2025", player:"Antony",               from:"Manchester United", to:"Real Betis",            fee:"Loan",  type:"loan", pos:"MF", note:"Loan to La Liga to revive career" },
  { window:"january", month:"Jan 2025", player:"Viktor Gyökeres",      from:"Sporting CP",       to:"Arsenal",               fee:"Rumour",type:"in",   pos:"FW", note:"Heavily linked but did not materialise in Jan" },
  { window:"january", month:"Jan 2025", player:"Matz Sels extension",  from:"Nottingham Forest", to:"Nottingham Forest",     fee:"New deal", type:"in", pos:"GK", note:"Golden Glove keeper extends contract" },
];

function renderTransferControls() {
  const clubs = [...new Set(TRANSFERS.flatMap(t => [t.from, t.to]))].filter(c => TEAM[c]).sort();
  const sel = document.getElementById("transferClubFilter");
  if (!sel) return;
  sel.innerHTML = `<option value="all">All clubs</option>` + clubs.map(c => `<option value="${c}">${c}</option>`).join("");
}

function renderTransfers() {
  const container = document.getElementById("transferTimeline");
  const summary   = document.getElementById("transferSummary");
  if (!container) return;

  const win  = document.getElementById("transferWindowFilter")?.value || "all";
  const club = document.getElementById("transferClubFilter")?.value   || "all";
  const type = document.getElementById("transferTypeFilter")?.value   || "all";

  let filtered = TRANSFERS;
  if (win  !== "all") filtered = filtered.filter(t => t.window === win);
  if (club !== "all") filtered = filtered.filter(t => t.from === club || t.to === club);
  if (type !== "all") filtered = filtered.filter(t => t.type === type);

  if (summary) {
    const ins    = filtered.filter(t => t.type === "in");
    const outs   = filtered.filter(t => t.type === "out");
    const loans  = filtered.filter(t => t.type === "loan");
    summary.innerHTML = `
      <div class="detail-kpis">
        <div class="detail-kpi"><strong>${filtered.length}</strong><span>Total transfers</span></div>
        <div class="detail-kpi"><strong>${ins.length}</strong><span>Arrivals</span></div>
        <div class="detail-kpi"><strong>${outs.length}</strong><span>Departures</span></div>
        <div class="detail-kpi"><strong>${loans.length}</strong><span>Loans</span></div>
      </div>`;
  }

  const typeIcon = { in: "⬆️", out: "⬇️", loan: "🔁" };
  const typeLabel = { in: "Arrival", out: "Departure", loan: "Loan" };
  const typeAccent = { in: C.green, out: C.red, loan: C.yellow };
  const windows = win === "all" ? ["summer","january"] : [win];
  const winLabel = { summer: "☀️ Summer 2024 Transfer Window", january: "❄️ January 2025 Transfer Window" };

  container.innerHTML = windows.map(w => {
    const items = filtered.filter(t => t.window === w);
    if (!items.length) return "";
    return `
    <div class="tr-window">
      <div class="tr-window-title">${winLabel[w]}</div>
      <div class="tr-cards">
        ${items.map(t => {
          const plTeam = t.type === "out" ? t.from : t.to;
          const accent = typeAccent[t.type];
          const plAvatar = PLAYER_PHOTO_IDS[t.player]
            ? playerAvatar(t.player, plTeam, 44)
            : `<div class="p-avatar" style="width:44px;height:44px;background:${accent}22;border:2px solid ${accent};font-size:15px;color:${accent}">${typeIcon[t.type]}</div>`;
          const fromCrest = TEAM[t.from] ? crestImg(t.from, 18) : `<span style="font-size:.7rem">${t.from}</span>`;
          const toCrest   = TEAM[t.to]   ? crestImg(t.to, 18)   : `<span style="font-size:.7rem">${t.to}</span>`;
          return `
          <div class="tr-card tr-${t.type}" style="--tr-accent:${accent}">
            <div class="tr-card-top">
              ${plAvatar}
              <div class="tr-card-info">
                <strong>${t.player}</strong>
                <span class="tr-pos-badge">${t.pos}</span>
              </div>
              <div class="tr-fee" style="color:${accent}">${t.fee}</div>
            </div>
            <div class="tr-route">
              <span class="tr-club">${fromCrest} ${sn(t.from)}</span>
              <span class="tr-arrow" style="color:${accent}">→</span>
              <span class="tr-club">${toCrest} ${sn(t.to)}</span>
            </div>
            <div class="tr-meta">
              <span class="tr-type-badge" style="background:${accent}22;color:${accent};border-color:${accent}55">${typeIcon[t.type]} ${typeLabel[t.type]}</span>
              <span class="tr-month">${t.month}</span>
            </div>
            ${t.note ? `<div class="tr-note">${t.note}</div>` : ""}
          </div>`;
        }).join("")}
      </div>
    </div>`;
  }).join("");
}

// -- Boot ------------------------------------------------------
window.addEventListener("DOMContentLoaded", loadAll);
