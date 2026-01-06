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
  const borderlineTotals = new Set([59, 64, 69, 74, 79, 84, 89, 94]); // 99 ignored
  const absentWords = ["غائب", "غياب", "غ"];
  const incompleteWord = "غير مكتمل";

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
    "ع": "myFrm:ean"
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

      const finalMark = toInt(tds[4].innerText);
      const totalMark = toInt(tds[5].innerText);
      const statusText = normalize(tds[7].innerText);

      // ignore total = 99
      if (totalMark === 99) return;

      const statusIsAbsent = absentWords.some((w) =>
        statusText.includes(w)
      );
      const statusIsIncomplete = statusText.includes(incompleteWord);

      const isBorderline = borderlineTotals.has(totalMark);
      const isBetween55and59 =
        Number.isFinite(totalMark) && totalMark >= 55 && totalMark <= 59 && !statusIsAbsent;

      // RED: borderline or 55–59
      if (isBorderline || isBetween55and59) {
        tr.style.backgroundColor = "rgba(255, 0, 0, 0.18)";
        tr.style.outline = "2px solid rgba(255, 0, 0, 0.65)";
      }
      // ORANGE: غير مكتمل
      else if (statusIsIncomplete) {
        tr.style.backgroundColor = "rgba(255, 165, 0, 0.30)";
        tr.style.outline = "2px solid rgba(200, 120, 0, 0.75)";
      }
      // YELLOW: final = 0 but not absent
      else if (finalMark === 0 && !statusIsAbsent) {
        tr.style.backgroundColor = "rgba(255, 255, 0, 0.30)";
        tr.style.outline = "2px solid rgba(180, 140, 0, 0.75)";
      }
    });
  }

  // ---------- check distribution table ----------
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
  if (Number.isFinite(hCount) && hCount / totalStudents > 0.10) {
    setCellStyle(
      elements["هـ"],
      "rgba(255, 255, 0, 0.35)",
      "2px solid rgba(180, 140, 0, 0.75)"
    );
  }

  // (2) highlight highest count except هـ
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


  function runAll() {
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
