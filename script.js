const STORAGE_KEY = "todo_pwa_state_v1";

const el = {
  rate: document.getElementById("rate"),
  streak: document.getElementById("streak"),
  stats: document.getElementById("stats"),
  overdue: document.getElementById("overdue"),
  priority: document.getElementById("priority"),
  today: document.getElementById("today"),
  other: document.getElementById("other"),
  completed: document.getElementById("completed"),
  completedToggle: document.getElementById("completedToggle"),
  completedList: document.getElementById("completedList"),
  addBtn: document.getElementById("addBtn"),
  historyView: document.getElementById("historyView"),
  historyBack: document.getElementById("historyBack"),
  historyChart: document.getElementById("historyChart"),
  historyList: document.getElementById("historyList"),
  sheet: document.getElementById("sheet"),
  sheetBackdrop: document.getElementById("sheetBackdrop"),
  taskForm: document.getElementById("taskForm"),
  taskId: document.getElementById("taskId"),
  titleInput: document.getElementById("titleInput"),
  typeSegment: document.getElementById("typeSegment"),
  dueField: document.getElementById("dueField"),
  dueInput: document.getElementById("dueInput"),
  hasCheckInput: document.getElementById("hasCheckInput"),
  priorityInput: document.getElementById("priorityInput"),
  deleteBtn: document.getElementById("deleteBtn"),
};

let state = loadState();

function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function compareDate(a, b) {
  return parseDate(a).getTime() - parseDate(b).getTime();
}

function isPast(dateStr) {
  return compareDate(dateStr, todayStr()) < 0;
}

function isToday(dateStr) {
  return dateStr === todayStr();
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      tasks: [],
      history: [],
      lastDailyDate: todayStr(),
      completedCollapsed: true,
    };
  }
  try {
    const data = JSON.parse(raw);
    data.tasks = Array.isArray(data.tasks) ? data.tasks : [];
    data.history = Array.isArray(data.history) ? data.history : [];
    data.lastDailyDate = data.lastDailyDate || todayStr();
    data.completedCollapsed = data.completedCollapsed !== false;
    return data;
  } catch {
    return {
      tasks: [],
      history: [],
      lastDailyDate: todayStr(),
      completedCollapsed: true,
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeTasks() {
  state.tasks.forEach((task) => {
    if (task.type === "daily") {
      task.hasCheck = true;
      task.priority = false;
    }
    if (task.priority) {
      task.type = "once";
      task.hasCheck = false;
      task.completed = false;
    }
    if (task.type === "once" && !task.hasCheck) {
      task.completed = false;
    }
  });
}

function upsertHistory(date, total, done) {
  const idx = state.history.findIndex((h) => h.date === date);
  const record = { date, total, done };
  if (idx >= 0) state.history[idx] = record;
  else state.history.push(record);
}

function handleDayChange() {
  const today = todayStr();
  if (state.lastDailyDate === today) return;

  const lastDate = state.lastDailyDate;
  const dailyTasks = state.tasks.filter((t) => t.type === "daily");
  const total = dailyTasks.length;
  const done = dailyTasks.filter((t) => t.completed).length;
  if (lastDate) {
    upsertHistory(lastDate, total, done);
  }

  state.tasks.forEach((task) => {
    if (task.type === "daily") task.completed = false;
  });

  state.lastDailyDate = today;
  saveState();
}

function computeTodayRate() {
  const daily = state.tasks.filter((t) => t.type === "daily");
  const total = daily.length;
  const done = daily.filter((t) => t.completed).length;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, rate };
}

function computeStreak() {
  const today = todayStr();
  const todayStat = computeTodayRate();
  const historyMap = new Map(state.history.map((h) => [h.date, h]));

  let streak = 0;
  let cursor = today;

  while (true) {
    let record;
    if (cursor === today) {
      record = todayStat;
    } else {
      record = historyMap.get(cursor);
    }

    if (!record) break;
    if (record.total === 0) {
      cursor = shiftDate(cursor, -1);
      continue;
    }
    if (record.done !== record.total) break;
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }

  return streak;
}

function shiftDate(dateStr, deltaDays) {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + deltaDays);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function renderStats() {
  const { total, done, rate } = computeTodayRate();
  el.rate.textContent = `今日の達成率 ${rate}% (${done} / ${total})`;
  const streak = computeStreak();
  el.streak.textContent = `🔥 連続100%：${streak}日`;
}

function createTaskElement(task, options = {}) {
  const item = document.createElement("div");
  item.className = "task";
  if (options.overdue) item.classList.add("overdue");
  if (task.priority) item.classList.add("goal");
  if (task.completed) item.classList.add("completed");

  const left = document.createElement("div");
  if (task.hasCheck) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!task.completed;
    checkbox.addEventListener("click", (e) => {
      e.stopPropagation();
      task.completed = checkbox.checked;
      saveState();
      render();
    });
    left.appendChild(checkbox);
  } else {
    const dot = document.createElement("div");
    dot.className = "dot";
    left.appendChild(dot);
  }

  const center = document.createElement("div");
  const title = document.createElement("div");
  title.className = "title";
  title.textContent = task.title;
  center.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "meta";
  const parts = [];
  if (task.type === "daily") parts.push("毎日");
  if (task.type === "once" && task.dueDate) parts.push(task.dueDate);
  if (parts.length) meta.textContent = parts.join(" ・ ");
  center.appendChild(meta);

  const right = document.createElement("div");
  if (options.showDelete) {
    const btn = document.createElement("button");
    btn.textContent = "×";
    btn.className = "badge";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteTask(task.id);
    });
    right.appendChild(btn);
  }

  item.appendChild(left);
  item.appendChild(center);
  item.appendChild(right);

  item.addEventListener("click", () => openSheet(task));
  return item;
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((t) => t.id !== id);
  saveState();
  render();
}

function renderSection(container, tasks, options = {}) {
  container.innerHTML = "";
  if (tasks.length === 0) {
    container.style.display = "none";
    return;
  }
  container.style.display = "block";
  tasks.forEach((task) => container.appendChild(createTaskElement(task, options)));
}

function renderCompleted(tasks) {
  el.completedList.innerHTML = "";
  if (tasks.length === 0) {
    el.completed.style.display = "none";
    return;
  }
  el.completed.style.display = "block";
  tasks.forEach((task) => {
    el.completedList.appendChild(createTaskElement(task, { showDelete: true }));
  });

  el.completedToggle.textContent = `✓ ${tasks.length}`;
  el.completedToggle.setAttribute("aria-expanded", state.completedCollapsed ? "false" : "true");
  el.completedList.classList.toggle("collapsed", state.completedCollapsed);
}

function render() {
  normalizeTasks();
  renderStats();

  const daily = state.tasks.filter((t) => t.type === "daily");
  const once = state.tasks.filter((t) => t.type === "once");
  const completed = once.filter((t) => t.hasCheck && t.completed);
  const activeOnce = once.filter((t) => !(t.hasCheck && t.completed));

  const overdue = activeOnce.filter((t) => t.dueDate && isPast(t.dueDate));
  const priority = activeOnce.filter((t) => t.priority && !overdue.includes(t));
  const todayOnce = activeOnce.filter(
    (t) => t.dueDate && isToday(t.dueDate) && !t.priority
  );
  const todayTasks = [...daily, ...todayOnce];

  const used = new Set([...overdue, ...priority, ...todayOnce].map((t) => t.id));
  const others = activeOnce.filter((t) => !used.has(t.id));

  renderSection(el.overdue, overdue, { overdue: true });
  renderSection(el.priority, priority);
  renderSection(el.today, todayTasks);
  renderSection(el.other, others);
  renderCompleted(completed);
}

function openSheet(task = null) {
  el.sheet.classList.remove("hidden");
  el.sheet.setAttribute("aria-hidden", "false");

  if (task) {
    el.taskId.value = task.id;
    el.titleInput.value = task.title;
    setType(task.type);
    el.dueInput.value = task.dueDate || "";
    el.hasCheckInput.checked = task.hasCheck;
    el.priorityInput.checked = !!task.priority;
    el.deleteBtn.classList.remove("hidden");
  } else {
    el.taskId.value = "";
    el.titleInput.value = "";
    setType("daily");
    el.dueInput.value = "";
    el.hasCheckInput.checked = true;
    el.priorityInput.checked = false;
    el.deleteBtn.classList.add("hidden");
  }

  syncFormState();
  el.titleInput.focus();
}

function closeSheet() {
  el.sheet.classList.add("hidden");
  el.sheet.setAttribute("aria-hidden", "true");
}

function setType(type) {
  [...el.typeSegment.querySelectorAll("button")].forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.value === type);
  });
  el.typeSegment.dataset.value = type;
}

function syncFormState() {
  const type = el.typeSegment.dataset.value;
  const isDaily = type === "daily";
  el.dueField.style.display = isDaily ? "none" : "flex";

  if (isDaily) {
    el.hasCheckInput.checked = true;
    el.hasCheckInput.disabled = true;
    el.priorityInput.checked = false;
    el.priorityInput.disabled = true;
  } else {
    el.hasCheckInput.disabled = false;
    el.priorityInput.disabled = false;
  }

  if (el.priorityInput.checked) {
    el.hasCheckInput.checked = false;
    el.hasCheckInput.disabled = true;
  }
}

function submitForm(e) {
  e.preventDefault();
  const id = el.taskId.value || crypto.randomUUID();
  const title = el.titleInput.value.trim();
  if (!title) return;

  const type = el.typeSegment.dataset.value;
  const dueDate = type === "once" ? el.dueInput.value || null : null;
  let hasCheck = type === "daily" ? true : el.hasCheckInput.checked;
  const priority = type === "once" ? el.priorityInput.checked : false;

  if (priority) {
    hasCheck = false;
  }

  const existing = state.tasks.find((t) => t.id === id);
  if (existing) {
    existing.title = title;
    existing.type = type;
    existing.dueDate = dueDate;
    existing.hasCheck = hasCheck;
    existing.priority = priority;
    if (!hasCheck) existing.completed = false;
  } else {
    state.tasks.push({
      id,
      title,
      type,
      dueDate,
      hasCheck,
      completed: false,
      priority,
      createdAt: Date.now(),
    });
  }

  saveState();
  closeSheet();
  render();
}

function openHistory() {
  el.historyView.classList.remove("hidden");
  el.historyView.setAttribute("aria-hidden", "false");
  renderHistory();
}

function closeHistory() {
  el.historyView.classList.add("hidden");
  el.historyView.setAttribute("aria-hidden", "true");
}

function getLast30Days() {
  const days = [];
  let cursor = todayStr();
  for (let i = 0; i < 30; i += 1) {
    days.push(cursor);
    cursor = shiftDate(cursor, -1);
  }
  return days.reverse();
}

function renderHistory() {
  const historyMap = new Map(state.history.map((h) => [h.date, h]));
  const todayStat = computeTodayRate();
  const days = getLast30Days();

  const rows = days.map((date) => {
    if (date === todayStr()) {
      return { date, ...todayStat, isToday: true };
    }
    const record = historyMap.get(date);
    if (!record) return { date, total: 0, done: 0, rate: null };
    const rate = record.total === 0 ? 0 : Math.round((record.done / record.total) * 100);
    return { date, total: record.total, done: record.done, rate };
  });

  drawChart(rows);

  el.historyList.innerHTML = "";
  rows.slice().reverse().forEach((row) => {
    const item = document.createElement("div");
    item.className = "history-row";
    const left = document.createElement("div");
    left.textContent = row.date;
    const right = document.createElement("div");
    if (row.rate === null) {
      right.textContent = "—";
    } else {
      right.textContent = `${row.rate}% (${row.done} / ${row.total})`;
    }
    if (row.isToday) right.style.color = "var(--accent)";
    item.appendChild(left);
    item.appendChild(right);
    el.historyList.appendChild(item);
  });
}

function drawChart(rows) {
  const canvas = el.historyChart;
  const ctx = canvas.getContext("2d");
  const width = canvas.clientWidth;
  const height = 180;
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0f131a";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#1f2632";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const barWidth = width / rows.length;
  rows.forEach((row, idx) => {
    if (row.rate === null) return;
    const h = (row.rate / 100) * (height - 20);
    const x = idx * barWidth + 2;
    const y = height - h - 10;
    ctx.fillStyle = row.isToday ? "#6ce3ff" : "#6dffb0";
    ctx.fillRect(x, y, Math.max(2, barWidth - 4), h);
  });
}

el.completedToggle.addEventListener("click", () => {
  state.completedCollapsed = !state.completedCollapsed;
  saveState();
  render();
});

el.addBtn.addEventListener("click", () => openSheet());

el.sheetBackdrop.addEventListener("click", closeSheet);

el.typeSegment.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  setType(btn.dataset.value);
  syncFormState();
});

el.hasCheckInput.addEventListener("change", syncFormState);
el.priorityInput.addEventListener("change", syncFormState);

el.taskForm.addEventListener("submit", submitForm);

el.deleteBtn.addEventListener("click", () => {
  const id = el.taskId.value;
  if (id) deleteTask(id);
  closeSheet();
});

el.stats.addEventListener("click", openHistory);
el.historyBack.addEventListener("click", closeHistory);

handleDayChange();
render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

window.addEventListener("resize", () => {
  if (!el.historyView.classList.contains("hidden")) renderHistory();
});
