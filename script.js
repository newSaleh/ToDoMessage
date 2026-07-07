(function () {
  "use strict";

  var STORAGE_KEY = "taskUpdateBuilder.v1";
  var MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  var DOW = ["S","M","T","W","T","F","S"];
  var DOT_COLORS = ["#4f9dff", "#f5a623", "#8b93a3", "#3ecf6f", "#e5534b", "#b57bee"];

  function todayISO() {
    var d = new Date();
    return isoFromParts(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function isoFromParts(y, m, d) {
    var mm = String(m + 1).padStart(2, "0");
    var dd = String(d).padStart(2, "0");
    return y + "-" + mm + "-" + dd;
  }
  function parseISO(iso) {
    var parts = iso.split("-").map(Number);
    return { y: parts[0], m: parts[1] - 1, d: parts[2] };
  }
  function formatDisplayDate(iso) {
    var p = parseISO(iso);
    var dd = String(p.d).padStart(2, "0");
    return dd + "/" + MONTHS[p.m] + "/" + p.y;
  }
  function generateId() {
    return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  var STYLE_OPTIONS = [
    { key: "numbers", label: "123" },
    { key: "letters", label: "ABC" },
    { key: "stars", label: "✱" }
  ];

  function defaultSections() {
    return [
      { id: generateId(), title: "To Do", style: "numbers", items: [] },
      { id: generateId(), title: "Currently Doing", style: "stars", items: [] },
      { id: generateId(), title: "On Hold", style: "letters", items: [] }
    ];
  }

  function defaultState() {
    return {
      date: todayISO(),
      calViewYear: null,
      calViewMonth: null,
      sections: defaultSections()
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      if (!parsed.sections && (parsed.todo || parsed.doing || parsed.hold)) {
        // Migrate from the older fixed todo/doing/hold format.
        var styles = parsed.styles || {};
        parsed.sections = [
          { id: generateId(), title: "To Do", style: styles.todo || "numbers", items: parsed.todo || [] },
          { id: generateId(), title: "Currently Doing", style: styles.doing || "stars", items: parsed.doing || [] },
          { id: generateId(), title: "On Hold", style: styles.hold || "letters", items: parsed.hold || [] }
        ];
      }
      var state = defaultState();
      state.date = parsed.date || state.date;
      state.calViewYear = parsed.calViewYear != null ? parsed.calViewYear : state.calViewYear;
      state.calViewMonth = parsed.calViewMonth != null ? parsed.calViewMonth : state.calViewMonth;
      if (Array.isArray(parsed.sections) && parsed.sections.length) {
        state.sections = parsed.sections.map(function (s) {
          return {
            id: s.id || generateId(),
            title: s.title || "Untitled",
            style: s.style || "numbers",
            items: Array.isArray(s.items) ? s.items : []
          };
        });
      }
      return state;
    } catch (e) {
      return defaultState();
    }
  }
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  var state = loadState();
  if (state.calViewYear == null) {
    var p0 = parseISO(state.date);
    state.calViewYear = p0.y;
    state.calViewMonth = p0.m;
  }

  // ---------- Calendar ----------
  function renderCalendar() {
    var y = state.calViewYear, m = state.calViewMonth;
    document.getElementById("calMonthLabel").textContent = MONTHS[m] + " " + y;

    var grid = document.getElementById("calGrid");
    grid.innerHTML = "";
    DOW.forEach(function (d) {
      var el = document.createElement("div");
      el.className = "dow";
      el.textContent = d;
      grid.appendChild(el);
    });

    var firstDow = new Date(y, m, 1).getDay();
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var daysInPrevMonth = new Date(y, m, 0).getDate();
    var todayIso = todayISO();

    var cells = [];
    for (var i = 0; i < firstDow; i++) {
      cells.push({ day: daysInPrevMonth - firstDow + 1 + i, muted: true });
    }
    for (var d2 = 1; d2 <= daysInMonth; d2++) {
      cells.push({ day: d2, muted: false, iso: isoFromParts(y, m, d2) });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: cells.length - (firstDow + daysInMonth) + 1, muted: true });
    }

    cells.forEach(function (c) {
      var el = document.createElement("div");
      el.className = "cal-day";
      el.textContent = c.day;
      if (c.muted) {
        el.classList.add("muted");
      } else {
        if (c.iso === todayIso) el.classList.add("today");
        if (c.iso === state.date) el.classList.add("selected");
        el.addEventListener("click", function () {
          state.date = c.iso;
          saveState();
          renderCalendar();
        });
      }
      grid.appendChild(el);
    });

    document.getElementById("selectedDateLabel").textContent =
      "Selected: " + formatDisplayDate(state.date);
  }

  document.getElementById("prevMonth").addEventListener("click", function () {
    state.calViewMonth--;
    if (state.calViewMonth < 0) { state.calViewMonth = 11; state.calViewYear--; }
    saveState();
    renderCalendar();
  });
  document.getElementById("nextMonth").addEventListener("click", function () {
    state.calViewMonth++;
    if (state.calViewMonth > 11) { state.calViewMonth = 0; state.calViewYear++; }
    saveState();
    renderCalendar();
  });
  document.getElementById("todayBtn").addEventListener("click", function () {
    state.date = todayISO();
    var p = parseISO(state.date);
    state.calViewYear = p.y;
    state.calViewMonth = p.m;
    saveState();
    renderCalendar();
  });

  // ---------- Sections rendering ----------
  function renderSections() {
    var container = document.getElementById("sectionsContainer");
    container.innerHTML = "";

    state.sections.forEach(function (section, sectionIdx) {
      var card = document.createElement("div");
      card.className = "card";

      var header = document.createElement("div");
      header.className = "section-header";

      var dot = document.createElement("span");
      dot.className = "section-dot";
      dot.style.background = DOT_COLORS[sectionIdx % DOT_COLORS.length];
      header.appendChild(dot);

      var titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.className = "section-title-input";
      titleInput.value = section.title;
      titleInput.placeholder = "Section title";
      titleInput.addEventListener("input", function () {
        section.title = titleInput.value;
        saveState();
      });
      header.appendChild(titleInput);

      var removeBtn = document.createElement("button");
      removeBtn.className = "danger";
      removeBtn.textContent = "✕";
      removeBtn.title = "Remove section";
      removeBtn.addEventListener("click", function () {
        if (state.sections.length <= 1) {
          alert("You need at least one section.");
          return;
        }
        if (!confirm('Delete the "' + section.title + '" section and all its tasks?')) return;
        state.sections = state.sections.filter(function (s) { return s.id !== section.id; });
        saveState();
        renderSections();
      });
      header.appendChild(removeBtn);

      card.appendChild(header);

      var styleSelector = document.createElement("div");
      styleSelector.className = "style-selector";
      STYLE_OPTIONS.forEach(function (opt) {
        var btn = document.createElement("button");
        btn.textContent = opt.label;
        btn.title = "Number this section with " + opt.label;
        if (section.style === opt.key) btn.classList.add("active");
        btn.addEventListener("click", function () {
          section.style = opt.key;
          saveState();
          renderSections();
        });
        styleSelector.appendChild(btn);
      });
      card.appendChild(styleSelector);

      var listEl = document.createElement("div");
      section.items.forEach(function (item, idx) {
        var row = document.createElement("div");
        row.className = "task-row";

        var impBtn = document.createElement("button");
        impBtn.className = "important-toggle" + (item.important ? " active" : "");
        impBtn.textContent = "!";
        impBtn.title = "Mark as VERY IMPORTANT";
        impBtn.addEventListener("click", function () {
          item.important = !item.important;
          saveState();
          renderSections();
        });
        row.appendChild(impBtn);

        var input = document.createElement("input");
        input.type = "text";
        input.value = item.text;
        input.placeholder = "New item...";
        input.addEventListener("input", function () {
          item.text = input.value;
          saveState();
        });
        row.appendChild(input);

        var orderWrap = document.createElement("div");
        orderWrap.className = "order-btns";
        var upBtn = document.createElement("button");
        upBtn.textContent = "▲";
        upBtn.disabled = idx === 0;
        upBtn.addEventListener("click", function () {
          section.items.splice(idx - 1, 0, section.items.splice(idx, 1)[0]);
          saveState();
          renderSections();
        });
        var downBtn = document.createElement("button");
        downBtn.textContent = "▼";
        downBtn.disabled = idx === section.items.length - 1;
        downBtn.addEventListener("click", function () {
          section.items.splice(idx + 1, 0, section.items.splice(idx, 1)[0]);
          saveState();
          renderSections();
        });
        orderWrap.appendChild(upBtn);
        orderWrap.appendChild(downBtn);
        row.appendChild(orderWrap);

        var delBtn = document.createElement("button");
        delBtn.className = "danger";
        delBtn.textContent = "✕";
        delBtn.title = "Delete";
        delBtn.addEventListener("click", function () {
          section.items.splice(idx, 1);
          saveState();
          renderSections();
        });
        row.appendChild(delBtn);

        listEl.appendChild(row);
      });
      card.appendChild(listEl);

      var addTaskBtn = document.createElement("button");
      addTaskBtn.className = "add-task-btn";
      addTaskBtn.textContent = "+ Add task";
      addTaskBtn.addEventListener("click", function () {
        section.items.push({ text: "", important: false });
        saveState();
        renderSections();
        var inputs = listEl.parentNode.querySelectorAll("input[type=text]");
        var last = inputs[inputs.length - 1];
        if (last) last.focus();
      });
      card.appendChild(addTaskBtn);

      container.appendChild(card);
    });
  }

  document.getElementById("addSectionBtn").addEventListener("click", function () {
    state.sections.push({ id: generateId(), title: "New Section", style: "numbers", items: [] });
    saveState();
    renderSections();
    var titleInputs = document.querySelectorAll(".section-title-input");
    var last = titleInputs[titleInputs.length - 1];
    if (last) { last.focus(); last.select(); }
  });

  // ---------- Message generation ----------
  function itemPrefix(style, index) {
    if (style === "numbers") return (index + 1) + ". ";
    if (style === "letters") return String.fromCharCode(65 + index) + ") ";
    return "* ";
  }

  function appendSectionLines(lines, items, style) {
    var i = 0;
    items.forEach(function (item) {
      if (!item.text.trim()) return;
      var important = item.important ? "*VERY IMPORTANT*: " : "";
      lines.push(itemPrefix(style, i) + important + item.text.trim());
      if (style === "letters") lines.push("");
      i++;
    });
  }

  function trimTrailingBlank(lines) {
    while (lines.length && lines[lines.length - 1] === "") lines.pop();
  }

  var SEPARATOR = "___________________________";

  function generateMessage() {
    var lines = [];
    state.sections.forEach(function (section, idx) {
      if (idx > 0) {
        trimTrailingBlank(lines);
        lines.push("");
        lines.push(SEPARATOR);
      }
      var titleText = (section.title || "Untitled").trim();
      var header = idx === 0
        ? "*" + titleText + ": " + formatDisplayDate(state.date) + ":*"
        : "*" + titleText + ":*";
      lines.push(header);
      lines.push("");
      appendSectionLines(lines, section.items, section.style);
    });
    trimTrailingBlank(lines);
    return lines.join("\n");
  }

  document.getElementById("generateBtn").addEventListener("click", function () {
    document.getElementById("output").value = generateMessage();
  });

  document.getElementById("copyBtn").addEventListener("click", function () {
    var output = document.getElementById("output");
    if (!output.value.trim()) {
      output.value = generateMessage();
    }
    output.select();
    output.setSelectionRange(0, output.value.length);
    var done = function () {
      var msg = document.getElementById("copiedMsg");
      msg.style.display = "inline";
      setTimeout(function () { msg.style.display = "none"; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(output.value).then(done).catch(function () {
        document.execCommand("copy");
        done();
      });
    } else {
      document.execCommand("copy");
      done();
    }
  });

  // ---------- Parsing pasted messages ----------
  function stripInvisible(str) {
    return str.replace(/[⁠​‌‍﻿]/g, "");
  }

  var LINE_PATTERNS = [
    { style: "numbers", source: "^\\s*\\d+[.)]\\s*(.+)$" },
    { style: "letters", source: "^\\s*[A-Za-z]\\)\\s*(.+)$" },
    { style: "stars", source: "^\\s*[*\\-•]\\s*(.+)$" }
  ];

  function extractItems(block) {
    var best = null;
    LINE_PATTERNS.forEach(function (p) {
      var re = new RegExp(p.source, "gm");
      var items = [];
      var mm;
      while ((mm = re.exec(block)) !== null) {
        var line = mm[1].trim();
        if (line) items.push(line);
      }
      if (items.length && (!best || items.length > best.items.length)) {
        best = { style: p.style, items: items };
      }
    });
    return best;
  }

  function parsePastedMessage(raw) {
    var text = stripInvisible(raw).replace(/\r\n/g, "\n");

    var dateMatch = text.match(/(\d{1,2})\/([A-Za-z]{3})\/(\d{4})/);
    if (dateMatch) {
      var day = parseInt(dateMatch[1], 10);
      var monIdx = MONTHS.indexOf(dateMatch[2].toUpperCase());
      var year = parseInt(dateMatch[3], 10);
      if (monIdx !== -1) {
        state.date = isoFromParts(year, monIdx, day);
        state.calViewYear = year;
        state.calViewMonth = monIdx;
      }
    }

    // Any line fully wrapped in a single pair of asterisks is treated as a section header.
    var lines = text.split("\n");
    var blocks = [];
    var current = null;
    lines.forEach(function (line) {
      var trimmed = line.trim();
      var headerMatch = trimmed.match(/^\*(.+)\*$/);
      if (headerMatch) {
        var title = headerMatch[1]
          .replace(/(\d{1,2})\/([A-Za-z]{3})\/(\d{4})/, "")
          .replace(/[:\s]+$/, "")
          .trim();
        current = { title: title, contentLines: [] };
        blocks.push(current);
        return;
      }
      if (/^_{3,}$/.test(trimmed)) return;
      if (current) current.contentLines.push(line);
    });

    if (!blocks.length) return false;

    state.sections = blocks.map(function (b) {
      var found = extractItems(b.contentLines.join("\n"));
      var items = found
        ? found.items.map(function (line) {
            var important = /\*?VERY IMPORTANT\*?:?\s*/i.test(line);
            var text = line.replace(/\*?VERY IMPORTANT\*?:?\s*/i, "").trim();
            return { text: text, important: important };
          })
        : [];
      return {
        id: generateId(),
        title: b.title || "Untitled",
        style: found ? found.style : "numbers",
        items: items
      };
    });
    return true;
  }

  document.getElementById("loadBtn").addEventListener("click", function () {
    var raw = document.getElementById("pasteBox").value;
    if (!raw.trim()) return;
    var ok = parsePastedMessage(raw);
    if (!ok) {
      alert("Couldn't find any *Section Title* headers in that text.");
      return;
    }
    saveState();
    renderCalendar();
    renderSections();
    document.getElementById("output").value = "";
  });

  document.getElementById("pasteClearBtn").addEventListener("click", function () {
    document.getElementById("pasteBox").value = "";
  });

  document.getElementById("clearAllBtn").addEventListener("click", function () {
    if (!confirm("Clear the date and all sections?")) return;
    state = defaultState();
    saveState();
    renderCalendar();
    renderSections();
    document.getElementById("output").value = "";
  });

  // ---------- Init ----------
  renderCalendar();
  renderSections();
})();
