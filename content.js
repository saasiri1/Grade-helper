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
    is59: true,
    borderlineF1: true,
    between55and58: true,
    between50and54: true,
    incompleteOrContinue: true,
    finalZero: true,
    distH: true,
    distMax: true,
    failBoundary: 59,
    atRisk1Min: 55,
    atRisk1Max: 58,
    atRisk2Min: 50,
    atRisk2Max: 54,
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

  // ---------- count badges (populated by checkStudentsTable) ----------
  const ruleCounts = {};

  // ---------- input helpers ----------
  function makeNumberInput(value, min, max, onChange) {
    const inp = document.createElement("input");
    inp.type = "number";
    inp.value = value;
    inp.min = min;
    inp.max = max;
    inp.style.width = "52px";
    inp.style.fontSize = "12px";
    inp.style.padding = "2px 4px";
    inp.style.border = "1px solid #ccc";
    inp.style.borderRadius = "4px";
    inp.style.textAlign = "center";
    inp.addEventListener("change", () => {
      const v = parseInt(inp.value, 10);
      if (Number.isFinite(v) && v >= min && v <= max) onChange(v);
      else inp.value = value;
    });
    return inp;
  }

  function makeRangeRow(label, minKey, maxKey) {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "6px";
    row.style.marginBottom = "4px";
    row.style.paddingLeft = "22px";

    const lbl = document.createElement("span");
    lbl.textContent = label;
    lbl.style.fontSize = "12px";
    lbl.style.color = "#555";
    lbl.style.minWidth = "68px";

    const minInp = makeNumberInput(settings[minKey], 0, 100, (v) => {
      settings[minKey] = v;
      saveSettings(settings);
      runAll();
    });

    const dash = document.createElement("span");
    dash.textContent = "–";
    dash.style.fontSize = "12px";

    const maxInp = makeNumberInput(settings[maxKey], 0, 100, (v) => {
      settings[maxKey] = v;
      saveSettings(settings);
      runAll();
    });

    row.appendChild(lbl);
    row.appendChild(minInp);
    row.appendChild(dash);
    row.appendChild(maxInp);
    return row;
  }

  function createControlPanel() {
  const id = "grade-highlighter-panel";
  if (document.getElementById(id)) return;

  const panel = document.createElement("div");
  panel.id = id;
  panel.style.position = "fixed";
  panel.style.right = "12px";
  panel.style.bottom = "12px";
  panel.style.zIndex = 999999;
  panel.style.background = "rgba(255,255,255,0.97)";
  panel.style.color = "#111";
  panel.style.border = "1px solid rgba(0,0,0,0.10)";
  panel.style.boxShadow = "0 8px 28px rgba(0,0,0,0.14)";
  panel.style.padding = "10px 12px";
  panel.style.borderRadius = "10px";
  panel.style.fontSize = "14px";
  panel.style.maxWidth = "255px";
  panel.style.fontFamily = "system-ui, sans-serif";
  panel.style.direction = "ltr";
  panel.style.textAlign = "left";

  // ----- header row -----
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.marginBottom = "8px";

  const title = document.createElement("div");
  title.textContent = "Highlight rules";
  title.style.fontWeight = "700";
  title.style.fontSize = "15px";
  header.appendChild(title);

  const selectAllBtn = document.createElement("button");
  selectAllBtn.textContent = "Select all";
  selectAllBtn.style.fontSize = "12px";
  selectAllBtn.style.padding = "2px 7px";
  selectAllBtn.style.borderRadius = "4px";
  selectAllBtn.style.border = "1px solid #ccc";
  selectAllBtn.style.background = "#f0f0f0";
  selectAllBtn.style.cursor = "pointer";
  let allSelected = true;
  selectAllBtn.addEventListener("click", () => {
    allSelected = !allSelected;
    selectAllBtn.textContent = allSelected ? "Select all" : "Deselect all";
    panel.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      cb.checked = allSelected;
      settings[cb.dataset.key] = allSelected;
    });
    saveSettings(settings);
    runAll();
  });
  header.appendChild(selectAllBtn);
  panel.appendChild(header);

  // ----- separator -----
  const sep = () => {
    const d = document.createElement("hr");
    d.style.border = "none";
    d.style.borderTop = "1px solid rgba(0,0,0,0.08)";
    d.style.margin = "6px 0";
    return d;
  };

  const items = [
    ["borderline",          "Grade ceiling ×1 (×4, ×9)"],
    ["borderlineF1",        "Grade ceiling ×2 (×3, ×8)"],
    ["is59",                "Fail boundary: 59"],
    ["between55and58",      "At risk: 55–58"],
    ["between50and54",      "At risk: 50–54"],
    ["incompleteOrContinue","Incomplete / Continuing"],
    ["finalZero",           "Final mark = 0 (not absent)"],
    ["distH",               "Exceeds 10% Fails of class"],
    ["distMax",             "Highest grade in distribution"],
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

    const dot = document.createElement("span");
    const rs = rowStyles[key];
    if (rs) {
      dot.style.display = "inline-block";
      dot.style.width = "10px";
      dot.style.height = "10px";
      dot.style.borderRadius = "2px";
      dot.style.background = rs.bg;
      dot.style.outline = `2px solid ${rs.border}`;
      dot.style.flexShrink = "0";
    }

    const span = document.createElement("span");
    span.style.flex = "1";
    span.textContent = label;

    const badge = document.createElement("span");
    badge.id = `grade-badge-${key}`;
    badge.style.fontSize = "10px";
    badge.style.background = "#e9ecef";
    badge.style.borderRadius = "8px";
    badge.style.padding = "1px 5px";
    badge.style.color = "#555";
    badge.style.minWidth = "16px";
    badge.style.textAlign = "center";
    badge.style.display = "none";

    row.appendChild(cb);
    if (rs) row.appendChild(dot);
    row.appendChild(span);
    row.appendChild(badge);
    panel.appendChild(row);
  });

  panel.appendChild(sep());

  // ----- legend toggle -----
  const legendHeader = document.createElement("div");
  legendHeader.style.display = "flex";
  legendHeader.style.justifyContent = "space-between";
  legendHeader.style.alignItems = "center";
  legendHeader.style.cursor = "pointer";
  legendHeader.style.userSelect = "none";

  const legendTitle = document.createElement("div");
  legendTitle.textContent = "Color legend";
  legendTitle.style.fontWeight = "600";
  legendTitle.style.fontSize = "12px";

  const legendArrow = document.createElement("span");
  legendArrow.textContent = "▾";
  legendArrow.style.fontSize = "11px";

  legendHeader.appendChild(legendTitle);
  legendHeader.appendChild(legendArrow);
  panel.appendChild(legendHeader);

  const legendBody = document.createElement("div");
  legendBody.style.marginTop = "4px";
  legendBody.style.display = "none";
  legendBody.style.direction = "ltr";
  legendBody.style.textAlign = "left";

  legendHeader.addEventListener("click", () => {
    const open = legendBody.style.display !== "none";
    legendBody.style.display = open ? "none" : "block";
    legendArrow.textContent = open ? "▾" : "▴";
  });

  const legendMap = [
    ["borderline",          "Grade ceiling ×1 (×4, ×9)"],
    ["borderlineF1",        "Grade ceiling ×2 (×3, ×8)"],
    ["is59",                "Fail boundary: 59"],
    ["between55and58",      "At risk: 55–58"],
    ["between50and54",      "At risk: 50–54"],
    ["incompleteOrContinue","Incomplete / Continuing"],
    ["finalZero",           "Final mark = 0 (not absent)"],
    ["distH",               "هـ exceeds 10% of class"],
    ["distMax",             "Highest grade in distribution"],
  ];

  legendMap.forEach(([key, text]) => {
    const rs = rowStyles[key];
    if (!rs) return;

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "6px";
    row.style.marginBottom = "3px";

    const dot = document.createElement("span");
    dot.style.width = "18px";
    dot.style.height = "8px";
    dot.style.borderRadius = "2px";
    dot.style.flexShrink = "0";
    dot.style.background = rs.bg;
    dot.style.outline = `2px solid ${rs.border}`;

    const lbl = document.createElement("span");
    lbl.textContent = text;

    row.appendChild(dot);
    row.appendChild(lbl);
    legendBody.appendChild(row);
  });

  panel.appendChild(legendBody);
  panel.appendChild(sep());

  // ----- advanced settings -----
  const advHeader = document.createElement("div");
  advHeader.style.display = "flex";
  advHeader.style.justifyContent = "space-between";
  advHeader.style.alignItems = "center";
  advHeader.style.cursor = "pointer";
  advHeader.style.userSelect = "none";

  const advTitle = document.createElement("div");
  advTitle.textContent = "Advanced settings";
  advTitle.style.fontWeight = "600";
  advTitle.style.fontSize = "12px";

  const advArrow = document.createElement("span");
  advArrow.textContent = "▾";
  advArrow.style.fontSize = "11px";

  advHeader.appendChild(advTitle);
  advHeader.appendChild(advArrow);
  panel.appendChild(advHeader);

  const advBody = document.createElement("div");
  advBody.style.marginTop = "6px";
  advBody.style.display = "none";
  advBody.style.direction = "ltr";
  advBody.style.textAlign = "left";

  advHeader.addEventListener("click", () => {
    const open = advBody.style.display !== "none";
    advBody.style.display = open ? "none" : "block";
    advArrow.textContent = open ? "▾" : "▴";
  });

  const makeAdvRow = (labelText, inputEl) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.marginBottom = "6px";

    const lbl = document.createElement("span");
    lbl.textContent = labelText;
    lbl.style.fontSize = "12px";
    lbl.style.color = "#444";

    row.appendChild(lbl);
    row.appendChild(inputEl);
    return row;
  };

  // fail boundary
  const failInp = makeNumberInput(settings.failBoundary, 0, 100, (v) => {
    settings.failBoundary = v; saveSettings(settings); runAll();
  });
  failInp.dataset.setting = "failBoundary";
  advBody.appendChild(makeAdvRow("Fail boundary:", failInp));

  // at risk high range
  const risk1Wrap = document.createElement("div");
  risk1Wrap.style.display = "flex";
  risk1Wrap.style.alignItems = "center";
  risk1Wrap.style.gap = "4px";
  const risk1Min = makeNumberInput(settings.atRisk1Min, 0, 100, (v) => {
    settings.atRisk1Min = v; saveSettings(settings); runAll();
  });
  risk1Min.dataset.setting = "atRisk1Min";
  const dash1 = document.createElement("span");
  dash1.textContent = "–";
  dash1.style.fontSize = "12px";
  const risk1Max = makeNumberInput(settings.atRisk1Max, 0, 100, (v) => {
    settings.atRisk1Max = v; saveSettings(settings); runAll();
  });
  risk1Max.dataset.setting = "atRisk1Max";
  risk1Wrap.appendChild(risk1Min);
  risk1Wrap.appendChild(dash1);
  risk1Wrap.appendChild(risk1Max);
  advBody.appendChild(makeAdvRow("At risk (high):", risk1Wrap));

  // at risk low range
  const risk2Wrap = document.createElement("div");
  risk2Wrap.style.display = "flex";
  risk2Wrap.style.alignItems = "center";
  risk2Wrap.style.gap = "4px";
  const risk2Min = makeNumberInput(settings.atRisk2Min, 0, 100, (v) => {
    settings.atRisk2Min = v; saveSettings(settings); runAll();
  });
  risk2Min.dataset.setting = "atRisk2Min";
  const dash2 = document.createElement("span");
  dash2.textContent = "–";
  dash2.style.fontSize = "12px";
  const risk2Max = makeNumberInput(settings.atRisk2Max, 0, 100, (v) => {
    settings.atRisk2Max = v; saveSettings(settings); runAll();
  });
  risk2Max.dataset.setting = "atRisk2Max";
  risk2Wrap.appendChild(risk2Min);
  risk2Wrap.appendChild(dash2);
  risk2Wrap.appendChild(risk2Max);
  advBody.appendChild(makeAdvRow("At risk (low):", risk2Wrap));

  panel.appendChild(advBody);
  panel.appendChild(sep());

  // ----- actions -----
  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "6px";

  const btnStyle = (btn) => {
    btn.style.fontSize = "12px";
    btn.style.padding = "4px 10px";
    btn.style.borderRadius = "5px";
    btn.style.border = "1px solid #ccc";
    btn.style.background = "#f8f9fa";
    btn.style.cursor = "pointer";
    btn.style.flex = "1";
  };

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Reset";
  btnStyle(resetBtn);
  resetBtn.addEventListener("click", () => {
    settings = { ...defaultSettings };
    saveSettings(settings);
    panel.querySelectorAll("input[type=checkbox]").forEach((el) => {
      el.checked = !!settings[el.dataset.key];
    });
    // restore number inputs to default values
    panel.querySelectorAll("input[type=number][data-setting]").forEach((el) => {
      el.value = defaultSettings[el.dataset.setting] ?? el.value;
    });
    allSelected = true;
    selectAllBtn.textContent = "Select all";
    runAll();
  });

  const hideBtn = document.createElement("button");
  hideBtn.textContent = "Hide";
  btnStyle(hideBtn);
  hideBtn.addEventListener("click", () => {
    panel.style.display = "none";
    const toggleBtn = document.getElementById("grade-highlighter-toggle");
    if (toggleBtn) toggleBtn.style.display = "block";
  });

  actions.appendChild(resetBtn);
  actions.appendChild(hideBtn);
  panel.appendChild(actions);

  // ----- copyright -----
  const copy = document.createElement("div");
  copy.style.marginTop = "8px";
  copy.style.textAlign = "center";
  copy.style.fontSize = "10px";
  copy.style.color = "#888";

  const copyText = document.createTextNode("© saasiri · ");
  const copyLink = document.createElement("a");
  copyLink.href = "https://saasiri1.github.io/";
  copyLink.target = "_blank";
  copyLink.rel = "noopener noreferrer";
  copyLink.textContent = "saasiri1.github.io";
  copyLink.style.color = "#555";
  copyLink.style.textDecoration = "none";
  copyLink.style.borderBottom = "1px dotted #aaa";

  copy.appendChild(copyText);
  copy.appendChild(copyLink);
  panel.appendChild(copy);

  document.body.appendChild(panel);

  panel.style.display = "none";
  const toggleBtn = document.getElementById("grade-highlighter-toggle");
  if (toggleBtn) toggleBtn.style.display = "block";
}

  function updateBadges() {
    const keys = ["borderline","borderlineF1","is59","between55and58","between50and54","incompleteOrContinue","finalZero"];
    keys.forEach((key) => {
      const el = document.getElementById(`grade-badge-${key}`);
      if (!el) return;
      const n = ruleCounts[key] || 0;
      if (n > 0) {
        el.textContent = n;
        el.style.display = "inline-block";
      } else {
        el.style.display = "none";
      }
    });
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
    bg: "rgba(249, 245, 3, 0.18)",
    border: "rgba(247, 9, 9, 0.95)"
  },
  distH: {
    bg: "rgba(255, 235, 59, 0.25)",
    border: "rgba(255, 193, 7, 0.8)"
  },
  distMax: {
    bg: "rgba(25, 135, 84, 0.18)",
    border: "rgba(25, 135, 84, 0.65)"
  }
};

  // ---------- check students table ----------
  function checkStudentsTable() {
    const table = document.querySelector(`#${cssEscape("myFrm:students")}`);
    if (!table) return;

    // reset counts
    ["borderline","borderlineF1","is59","between55and58","between50and54","incompleteOrContinue","finalZero"].forEach(k => { ruleCounts[k] = 0; });

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
        Number.isFinite(totalMark) && totalMark === settings.failBoundary && !statusIsAbsent;
      const isBetween55and58 =
        Number.isFinite(totalMark) && totalMark >= settings.atRisk1Min && totalMark <= settings.atRisk1Max && !statusIsAbsent;
      const isBetween50and54 =
        Number.isFinite(totalMark) && totalMark >= settings.atRisk2Min && totalMark <= settings.atRisk2Max && !statusIsAbsent;

        
      // priority order
      const matched = [];
      if (isBorderline && settings.borderline) matched.push("borderline");
      if (isEqual59 && settings.is59) matched.push("is59");
      if (isBorderlineF1 && settings.borderlineF1) matched.push("borderlineF1");
      if (isBetween55and58 && settings.between55and58) matched.push("between55and58");
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
      if (ruleCounts[key] !== undefined) ruleCounts[key]++;
    });

    updateBadges();
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
      setCellStyle(elements["هـ"], rowStyles.distH.bg, `2px solid ${rowStyles.distH.border}`);
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
        setCellStyle(elements[maxGrade], rowStyles.distMax.bg, `2px solid ${rowStyles.distMax.border}`);
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
  createToggleButton();   
  createControlPanel();  
  checkStudentsTable();
  checkDistributionTable();
}


  runAll();

  const observer = new MutationObserver(() => {
    clearTimeout(window.__gradeCheckerTimer);
    window.__gradeCheckerTimer = setTimeout(runAll, 150);
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
