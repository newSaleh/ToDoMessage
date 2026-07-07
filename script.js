(function () {
  "use strict";

  var STORAGE_KEY = "taskUpdateBuilder.v1";
  var MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  var DOW = ["S","M","T","W","T","F","S"];

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

  var defaultState = {
    date: todayISO(),
    calViewYear: null,
    calViewMonth: null,
    todo: [],
    doing: [],
    hold: []
  };

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(defaultState);
      var parsed = JSON.parse(raw);
      return Object.assign(clone(defaultState), parsed);
    } catch (e) {
      return clone(defaultState);
    }
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  var state = loadState();
  if (state.calViewYear == null) {
    var p = parseISO(state.date);
    state.calViewYear = p.y;
    state.calViewMonth = p.m;
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

  // ---------- Task list rendering ----------
  var SECTION_CONFIG = {
    todo: { listId: "todoList", key: "todo", important: true, placeholder: "New to-do item..." },
    doing: { listId: "doingList", key: "doing", important: false, placeholder: "New item..." },
    hold: { listId: "holdList", key: "hold", important: false, placeholder: "New item..." }
  };

  function renderTasks() {
    Object.keys(SECTION_CONFIG).forEach(function (sectionKey) {
      var cfg = SECTION_CONFIG[sectionKey];
      var container = document.getElementById(cfg.listId);
      container.innerHTML = "";
      var items = state[cfg.key];

      items.forEach(function (item, idx) {
        var row = document.createElement("div");
        row.className = "task-row";

        if (cfg.important) {
          var impBtn = document.createElement("button");
          impBtn.className = "important-toggle" + (item.important ? " active" : "");
          impBtn.textContent = "!";
          impBtn.title = "Mark as VERY IMPORTANT";
          impBtn.addEventListener("click", function () {
            item.important = !item.important;
            saveState();
            renderTasks();
          });
          row.appendChild(impBtn);
        }

        var input = document.createElement("input");
        input.type = "text";
        input.value = item.text;
        input.placeholder = cfg.placeholder;
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
          items.splice(idx - 1, 0, items.splice(idx, 1)[0]);
          saveState();
          renderTasks();
        });
        var downBtn = document.createElement("button");
        downBtn.textContent = "▼";
        downBtn.disabled = idx === items.length - 1;
        downBtn.addEventListener("click", function () {
          items.splice(idx + 1, 0, items.splice(idx, 1)[0]);
          saveState();
          renderTasks();
        });
        orderWrap.appendChild(upBtn);
        orderWrap.appendChild(downBtn);
        row.appendChild(orderWrap);

        var delBtn = document.createElement("button");
        delBtn.className = "danger";
        delBtn.textContent = "✕";
        delBtn.title = "Delete";
        delBtn.addEventListener("click", function () {
          items.splice(idx, 1);
          saveState();
          renderTasks();
        });
        row.appendChild(delBtn);

        container.appendChild(row);
      });
    });
  }

  document.querySelectorAll(".add-task-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var sectionKey = btn.getAttribute("data-section");
      var cfg = SECTION_CONFIG[sectionKey];
      state[cfg.key].push({ text: "", important: false });
      saveState();
      renderTasks();
      var inputs = document.getElementById(cfg.listId).querySelectorAll("input[type=text]");
      var last = inputs[inputs.length - 1];
      if (last) last.focus();
    });
  });

  // ---------- Message generation ----------
  function generateMessage() {
    var lines = [];
    lines.push("*To Do: " + formatDisplayDate(state.date) + ":*");
    lines.push("");
    state.todo.forEach(function (item, i) {
      if (!item.text.trim()) return;
      var prefix = item.important ? "*VERY IMPORTANT*: " : "";
      lines.push((i + 1) + ". " + prefix + item.text.trim());
    });
    lines.push("");
    lines.push("___________________________");
    lines.push("*Currently Doing:*");
    lines.push("");
    state.doing.forEach(function (item) {
      if (!item.text.trim()) return;
      lines.push("* " + item.text.trim());
    });
    lines.push("___________________________");
    lines.push("*On Hold:*");
    lines.push("");
    state.hold.forEach(function (item, i) {
      if (!item.text.trim()) return;
      var letter = String.fromCharCode(65 + i);
      lines.push(letter + ") " + item.text.trim());
      lines.push("");
    });
    while (lines.length && lines[lines.length - 1] === "") lines.pop();
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

  function parsePastedMessage(raw) {
    var text = stripInvisible(raw).replace(/\r\n/g, "\n");

    // Date: DD/MON/YYYY
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

    // Split into sections using header keywords, keep order-agnostic
    var headerRegex = /(to do|currently doing|on hold)/gi;
    var indices = [];
    var m;
    while ((m = headerRegex.exec(text)) !== null) {
      indices.push({ key: normalizeHeader(m[1]), start: m.index });
    }
    indices.push({ key: null, start: text.length });

    var blocks = { todo: "", doing: "", hold: "" };
    for (var i = 0; i < indices.length - 1; i++) {
      var cur = indices[i];
      if (!cur.key) continue;
      var chunk = text.slice(cur.start, indices[i + 1].start);
      blocks[cur.key] = (blocks[cur.key] || "") + "\n" + chunk;
    }

    var newTodo = [];
    var todoLineRegex = /^\s*\d+[.)]\s*(.+)$/gm;
    var tm;
    while ((tm = todoLineRegex.exec(blocks.todo)) !== null) {
      var line = tm[1].trim();
      var important = /\*?VERY IMPORTANT\*?:?\s*/i.test(line);
      line = line.replace(/\*?VERY IMPORTANT\*?:?\s*/i, "").trim();
      if (line) newTodo.push({ text: line, important: important });
    }

    var newDoing = [];
    var doingLineRegex = /^\s*[*\-•]\s*(.+)$/gm;
    var dm;
    while ((dm = doingLineRegex.exec(blocks.doing)) !== null) {
      var dline = dm[1].trim();
      if (dline) newDoing.push({ text: dline, important: false });
    }

    var newHold = [];
    var holdLineRegex = /^\s*[A-Za-z]\)\s*(.+)$/gm;
    var hm;
    while ((hm = holdLineRegex.exec(blocks.hold)) !== null) {
      var hline = hm[1].trim();
      if (hline) newHold.push({ text: hline, important: false });
    }

    if (newTodo.length) state.todo = newTodo;
    if (newDoing.length) state.doing = newDoing;
    if (newHold.length) state.hold = newHold;
  }

  function normalizeHeader(h) {
    h = h.toLowerCase();
    if (h === "to do") return "todo";
    if (h === "currently doing") return "doing";
    if (h === "on hold") return "hold";
    return null;
  }

  document.getElementById("loadBtn").addEventListener("click", function () {
    var raw = document.getElementById("pasteBox").value;
    if (!raw.trim()) return;
    parsePastedMessage(raw);
    saveState();
    renderCalendar();
    renderTasks();
    document.getElementById("output").value = "";
  });

  document.getElementById("pasteClearBtn").addEventListener("click", function () {
    document.getElementById("pasteBox").value = "";
  });

  document.getElementById("clearAllBtn").addEventListener("click", function () {
    if (!confirm("Clear the date and all tasks in every section?")) return;
    state = clone(defaultState);
    var p = parseISO(state.date);
    state.calViewYear = p.y;
    state.calViewMonth = p.m;
    saveState();
    renderCalendar();
    renderTasks();
    document.getElementById("output").value = "";
  });

  // ---------- Init ----------
  renderCalendar();
  renderTasks();
})();
