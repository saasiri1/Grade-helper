(() => {
  // ---------- helpers ----------
  const cssEscape = (s) =>
    window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/:/g, "\\:");

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
  const borderlineFail2 = new Set([63, 68, 73, 78, 83, 88, 93]);
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
    between55and59: true,
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
    } catch (e) {
      return { ...defaultSettings };
    }
  };

  const saveSettings = (s) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));

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
      ["borderline", "Borderline totals (64,69...)"],
      ["borderlineF1", "Borderline (fail1) totals"],
      ["between55and59", "Total 55–59"],
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

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "6px";
    actions.style.marginTop = "6px";

    const resetBtn = document.createElement("button");
    resetBtn.textContent = "Reset";
    resetBtn.style.fontSize = "12px";
    resetBtn.addEventListener("click", () => {
      settings = { ...defaultSettings };
      saveSettings(settings);
      // update checkboxes
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
    });

    actions.appendChild(resetBtn);
    actions.appendChild(hideBtn);
    panel.appendChild(actions);

    document.body.appendChild(panel);
  }

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

      const finalMark = toInt(tds[4].innerText);
      const totalMark = toInt(tds[5].innerText);
      const statusText = normalize(tds[7].innerText);

      // ignore total = 99
      if (totalMark === 99) return;

      const statusIsAbsent = absentWords.some((w) => statusText.includes(w));
      const statusIsIncomplete = statusText.includes(incompleteWord);
      const statusIsContinue = statusText.includes(continueWord);

      const isBorderline = borderlineTotals.has(totalMark);
      const isBorderlineF1 = borderlineFail2.has(totalMark);
      const isBetween55and59 =
        Number.isFinite(totalMark) && totalMark >= 55 && totalMark <= 59 && !statusIsAbsent;
      const isBetween50and54 =
        Number.isFinite(totalMark) && totalMark >= 50 && totalMark <= 54 && !statusIsAbsent;

      // Determine which (enabled) criteria match, in priority order
      const matched = [];
      if (isBorderline && settings.borderline) matched.push("borderline");
      if (isBorderlineF1 && settings.borderlineF1) matched.push("borderlineF1");
      if (isBetween55and59 && settings.between55and59) matched.push("between55and59");
      if (isBetween50and54 && settings.between50and54) matched.push("between50and54");
      if ((statusIsIncomplete || statusIsContinue) && settings.incompleteOrContinue)
        matched.push("incompleteOrContinue");
      if (finalMark === 0 && !statusIsAbsent && settings.finalZero) matched.push("finalZero");

      if (matched.length === 0) return; // nothing to highlight

      // Apply style based on the highest-priority matched rule
      const key = matched[0];
      if (key === "borderline" || key === "between55and59") {
        tr.style.backgroundColor = "rgba(255, 0, 0, 0.18)";
        tr.style.outline = "2px solid rgba(255, 0, 0, 0.65)";
      } else if (key === "borderlineF1") {
        tr.style.backgroundColor = "rgba(0, 255, 21, 0.18)";
        tr.style.outline = "2px solid rgba(200, 255, 0, 0.65)";
      } else if (key === "between50and54") {
        tr.style.backgroundColor = "rgba(255, 25, 0, 0.18)";
        tr.style.outline = "2px solid rgba(55, 0, 255, 0.65)";
      } else if (key === "incompleteOrContinue") {
        tr.style.backgroundColor = "rgba(255, 165, 0, 0.30)";
        tr.style.outline = "2px solid rgba(200, 120, 0, 0.75)";
      } else if (key === "finalZero") {
        tr.style.backgroundColor = "rgba(255, 255, 0, 0.30)";
        tr.style.outline = "2px solid rgba(180, 140, 0, 0.75)";
      }
    });
  }

  // ---------- check distribution table (SAFE) ----------
  function checkDistributionTable() {
    // check if any distribution element exists first
    const sampleEl = document.querySelector(`#${cssEscape("myFrm:a_plus")}`);
    if (!sampleEl) return; // distribution table not available → ignore

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

    // (1) هـ > 10% of total students
    const hCount = counts["هـ"];
    if (settings.distH && Number.isFinite(hCount) && hCount / totalStudents > 0.10) {
      setCellStyle(
        elements["هـ"],
        "rgba(255, 255, 0, 0.35)",
        "2px solid rgba(180, 140, 0, 0.75)"
      );
    }

    // (2) highlight highest count except هـ
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
          "rgba(0, 255, 0, 0.18)",
          "2px solid rgba(0, 140, 0, 0.65)"
        );
      }
    }
  }

  function runAll() {
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
