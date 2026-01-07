(() => {
  // ---------- helpers ----------
  const cssEscape = (s) =>
    window.CSS && CSS.escape ? CSS.escape(s) : String(s || "").replace(/:/g, "\\:");

  const normalize = (s) => (s || "").replace(/\s+/g, " ").trim();

  const toInt = (s) => {
    const m = String(s || "").match(/\d+/);
    return m ? parseInt(m[0], 10) : NaN;
  };

  const setCellStyle = (el, bg, outline) => {
    if (!el) return;
    el.style.backgroundColor = bg || "";
    el.style.outline = outline || "";
    el.style.borderRadius = "4px";
    el.style.padding = "2px 4px";
  };

  // ---------- config ----------
  const borderlineTotals = new Set([64, 69, 74, 79, 84, 89, 94]);
  const borderlineTotals2 = new Set([63, 68, 73, 78, 83, 88, 93]);
  const absentWords = ["غائب", "غياب", "غ"];
  const incompleteWord = "غير مكتمل";
  const continueWord = "مستمر";

  const distIds = {
    "أ+": "myFrm:a_plus",
    "أ": "myFrm:a",
    "ب+": "myFrm:b_plus",
    "ب": "myFrm:b",
    "ج+": "myFrm:g_plus",
    "ج": "myFrm:g",
    "د+": "myFrm:d_plus",
    "د": "myFrm:d",
    "هـ": "myFrm:h",
    "غ": "myFrm:gaen",
    "ح": "myFrm:hh",
    "ع": "myFrm:ean",
  };

  // ---------- settings / UI ----------
  const STORAGE_KEY = "gradeHighlighterSettings_v1";
  const defaultSettings = {
    borderline: true,
    borderlineF1: true,
    between55and58: true,
    between50and54: true,
    incompleteOrContinue: true,
    finalZero: true,
    distH: true,
    distMax: true,
  };

  const loadSettings = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...defaultSettings };
      const parsed = JSON.parse(raw);
      return { ...defaultSettings, ...parsed };
    } catch {
      return { ...defaultSettings };
    }
  };

  const saveSettings = (s) => localStorage.setItem(STORAGE_KEY, JSON.stringify(s));

  let settings = loadSettings();

  function createControlPanel() {
  const id = "grade-highlighter-panel";
  if (document.getElementById(id)) return;

  const panel = document.createElement("div");
  panel.id = id;
  panel.style.position = "fixed";
  panel.style.right = "12px";
  panel.style.bottom = "12px";
  panel.style.zIndex = 999999;
  panel.style.background = "rgba(255,255,255,0.95)";
  panel.style.color = "#111";
  panel.style.border = "1px solid rgba(0,0,0,0.08)";
  panel.style.boxShadow = "0 6px 24px rgba(0,0,0,0.12)";
  panel.style.padding = "8px 10px";
  panel.style.borderRadius = "8px";
  panel.style.fontSize = "12px";
  panel.style.maxWidth = "240px";

  const title = document.createElement("div");
  title.textContent = "Highlight rules";
  title.style.fontWeight = "600";
  title.style.marginBottom = "6px";
  panel.appendChild(title);

  const items = [
    ["borderline", "Borderline totals (4,9)"],
    ["borderlineF1", "Borderline  totals (3,8)"],
    ["between55and58", "Total 55–59"],
    ["between50and54", "Total 50–54"],
    ["incompleteOrContinue", "Incomplete / Continuing"],
    ["finalZero", "Final = 0 (not absent)"],
    ["distH", "Distribution: هـ > 10%"],
    ["distMax", "Distribution: highest grade"],
  ];

  items.forEach(([key, label]) => {
    const row = document.createElement("label");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "6px";
    row.style.marginBottom = "4px";
    row.style.cursor = "pointer";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.key = key;
    cb.checked = !!settings[key];
    cb.addEventListener("change", (e) => {
      settings[key] = e.target.checked;
      saveSettings(settings);
      runAll();
    });

    const span = document.createElement("span");
    span.textContent = label;

    row.appendChild(cb);
    row.appendChild(span);
    panel.appendChild(row);
  });

  // ----- legend -----
  const legendTitle = document.createElement("div");
  legendTitle.textContent = "Color meaning";
  legendTitle.style.fontWeight = "600";
  legendTitle.style.marginTop = "8px";
  legendTitle.style.marginBottom = "4px";
  panel.appendChild(legendTitle);

  const legendItems = [
    ["Borderline total (4,9)", "rgba(220,20,60,0.9)"],
    ["Borderline (3,8)", "rgba(111,66,193,0.9)"],
    ["Total between 55 and 59", "rgba(13,110,253,0.9)"],
    ["Total between 50 and 54", "rgba(253,126,20,0.9)"],
    ["Incomplete or continuing", "rgba(121,85,72,0.9)"],
    ["Final grade = 0 and is not Absent", "rgba(32,201,151,0.9)"],
  ];

  legendItems.forEach(([text, color]) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "6px";
    row.style.marginBottom = "3px";

    const dot = document.createElement("span");
    dot.style.width = "10px";
    dot.style.height = "10px";
    dot.style.borderRadius = "50%";
    dot.style.background = color;

    const label = document.createElement("span");
    label.textContent = text;

    row.appendChild(dot);
    row.appendChild(label);
    panel.appendChild(row);
  });

  // ----- actions -----
  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "6px";
  actions.style.marginTop = "8px";

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Reset";
  resetBtn.style.fontSize = "12px";
  resetBtn.addEventListener("click", () => {
    settings = { ...defaultSettings };
    saveSettings(settings);

    panel.querySelectorAll("input[type=checkbox]").forEach((el) => {
      const k = el.dataset.key;
      el.checked = !!settings[k];
    });

    runAll();
  });

  const hideBtn = document.createElement("button");
  hideBtn.textContent = "Hide";
  hideBtn.style.fontSize = "12px";
  hideBtn.addEventListener("click", () => {
    panel.style.display = "none";

    const toggleBtn = document.getElementById("grade-highlighter-toggle");
    if (toggleBtn) toggleBtn.style.display = "block";
  });

  actions.appendChild(resetBtn);
  actions.appendChild(hideBtn);
  panel.appendChild(actions);

  document.body.appendChild(panel);

  // panel shows -> toggle hides
  panel.style.display = "block";
  const toggleBtn = document.getElementById("grade-highlighter-toggle");
  if (toggleBtn) toggleBtn.style.display = "none";
}


  // ---------- shared row styles ----------
const rowStyles = {
  // Strong risk (clear red)
  borderline: {
    bg: "rgba(0, 13, 255, 0.35)",      // crimson
    border: "rgba(18, 219, 14, 0.95)"
  },

  // Borderline but different case (purple)
  borderlineF1: {
    bg: "rgba(0, 13, 255, 0.15)",     // purple
    border: "rgba(18, 219, 14, 0.95)"
  },

  // 55–59 (blue)
  between55and58: {
    bg: "rgba(255, 0, 0, 0.50)",     // blue
    border: "rgba(18, 219, 14, 0.95)"
  },

  // 50–54 (orange)
  between50and54: {
    bg: "rgba(255, 0, 0, 0.30)",     // orange
    border: "rgba(18, 219, 14, 0.95)"
  },

  // Incomplete / continuing (brown)
  incompleteOrContinue: {
    bg: "rgba(249, 245, 3, 0.18)",      // brown
    border: "rgba(247, 9, 9, 0.95)"
  },
  is59: {
    bg: "rgba(255, 0, 0, 0.70)",      // brown
    border: "rgba(18, 219, 14, 0.95)"
  },
  // Final = 0 (teal)
  finalZero: {
    bg: "rgba(249, 245, 3, 0.18)",     // teal
    border: "rgba(247, 9, 9, 0.95)"
  }
};

  // ---------- check students table ----------
  function checkStudentsTable() {
    const table = document.querySelector(`#${cssEscape("myFrm:students")}`);
    if (!table) return;

    const rows = table.querySelectorAll("tbody tr");
    rows.forEach((tr) => {
      tr.style.backgroundColor = "";
      tr.style.outline = "";

      const tds = tr.querySelectorAll("td");
      if (tds.length < 8) return;

      const finalMark = toInt(tds[4]?.innerText);
      const totalMark = toInt(tds[5]?.innerText);
      const statusText = normalize(tds[7]?.innerText);

      // ignore total = 99
      if (totalMark === 99) return;

      const statusIsAbsent = absentWords.some((w) => statusText.includes(w));
      const statusIsIncomplete = statusText.includes(incompleteWord);
      const statusIsContinue = statusText.includes(continueWord);

      const isBorderline = borderlineTotals.has(totalMark);
      const isBorderlineF1 = borderlineTotals2.has(totalMark);

      const isEqual59 =
        Number.isFinite(totalMark) && totalMark == 59 && !statusIsAbsent;
      const isBetween55and58 =
        Number.isFinite(totalMark) && totalMark >= 55 && totalMark <= 58 && !statusIsAbsent;
      const isBetween50and54 =
        Number.isFinite(totalMark) && totalMark >= 50 && totalMark <= 54 && !statusIsAbsent;

        
      // priority order
      const matched = [];
      if (isBorderline && settings.borderline) matched.push("borderline");
      if (isEqual59) matched.push("is59");
      if (isBorderlineF1 && settings.borderlineF1) matched.push("borderlineF1");
      if (isBetween55and58 && settings.between55and59) matched.push("between55and58");
      if (isBetween50and54 && settings.between50and54) matched.push("between50and54");
      if ((statusIsIncomplete || statusIsContinue) && settings.incompleteOrContinue)
        matched.push("incompleteOrContinue");
      if (finalMark === 0 && !statusIsAbsent && settings.finalZero) matched.push("finalZero");

      if (matched.length === 0) return;

      const key = matched[0];
      const s = rowStyles[key];
      if (!s) return;

      tr.style.backgroundColor = s.bg;
      tr.style.outline = `2px solid ${s.border}`;
    });
  }

  // ---------- check distribution table (SAFE) ----------
  function checkDistributionTable() {
    const sampleEl = document.querySelector(`#${cssEscape("myFrm:a_plus")}`);
    if (!sampleEl) return;

    const totalEl = document.querySelector(`#${cssEscape("myFrm:studentsSize")}`);
    const totalStudents = totalEl ? toInt(totalEl.value) : NaN;
    if (!Number.isFinite(totalStudents) || totalStudents <= 0) return;

    const counts = {};
    const elements = {};

    for (const [grade, id] of Object.entries(distIds)) {
      const el = document.querySelector(`#${cssEscape(id)}`);
      if (!el) continue;
      elements[grade] = el;
      counts[grade] = toInt(el.textContent);
      setCellStyle(el, "", "");
    }

    // (1) هـ > 10%
    const hCount = counts["هـ"];
    if (settings.distH && Number.isFinite(hCount) && hCount / totalStudents > 0.1) {
      setCellStyle(
        elements["هـ"],
        "rgba(255, 235, 59, 0.25)",
        "2px solid rgba(255, 193, 7, 0.8)"
      );
    }

    // (2) max except هـ
    if (settings.distMax) {
      let maxGrade = null;
      let maxValue = -Infinity;

      for (const [grade, val] of Object.entries(counts)) {
        if (grade === "هـ") continue;
        if (!Number.isFinite(val)) continue;
        if (val > maxValue) {
          maxValue = val;
          maxGrade = grade;
        }
      }

      if (maxGrade && elements[maxGrade]) {
        setCellStyle(
          elements[maxGrade],
          "rgba(25, 135, 84, 0.18)",
          "2px solid rgba(25, 135, 84, 0.65)"
        );
      }
    }
  }
function createToggleButton() {
  const id = "grade-highlighter-toggle";
  if (document.getElementById(id)) return;

  const btn = document.createElement("button");
  btn.id = id;
  btn.textContent = "Highlight settings";
  btn.style.position = "fixed";
  btn.style.right = "12px";
  btn.style.bottom = "60px";
  btn.style.zIndex = 999999;
  btn.style.padding = "6px 10px";
  btn.style.fontSize = "12px";
  btn.style.borderRadius = "6px";
  btn.style.border = "1px solid #ccc";
  btn.style.background = "#f8f9fa";
  btn.style.cursor = "pointer";

  btn.addEventListener("click", () => {
    const panel = document.getElementById("grade-highlighter-panel");
    if (!panel) return;
    panel.style.display = "block";
    btn.style.display = "none"; // hide button when panel shows
  });

  document.body.appendChild(btn);
}


  function runAll() {
    createControlPanel();
    checkStudentsTable();
    checkDistributionTable();
    createToggleButton();
  }

  runAll();

  const observer = new MutationObserver(() => {
    clearTimeout(window.__gradeCheckerTimer);
    window.__gradeCheckerTimer = setTimeout(runAll, 150);
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
