// ===============================
// calendar.js
// ===============================

// 現在の年月
let currentDate = new Date();
let currentYear = currentDate.getFullYear();
let currentMonth = currentDate.getMonth();
let selectedDate = null;

// DOM取得
const yearSelect = document.getElementById("yearSelect");
const monthSelect = document.getElementById("monthSelect");
const calendarGrid = document.getElementById("calendar-grid");
const content = document.getElementById("content");

// ===============================
// 年・月プルダウン初期化
// ===============================
function initYearMonthSelectors() {
  // 年（2010〜2050）
  for (let y = 2010; y <= 2050; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = `${y}年`;
    yearSelect.appendChild(opt);
  }

  // 月（1〜12）
  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement("option");
    opt.value = m - 1;
    opt.textContent = `${m}月`;
    monthSelect.appendChild(opt);
  }

  // 初期値
  yearSelect.value = currentYear;
  monthSelect.value = currentMonth;
}

// ===============================
// カレンダー描画
// ===============================
function renderCalendar(year, month) {
  calendarGrid.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  // 空白（1日の曜日まで）
  for (let i = 0; i < firstDay; i++) {
    calendarGrid.appendChild(document.createElement("div"));
  }

  // 日付描画
  for (let day = 1; day <= lastDate; day++) {
    const div = document.createElement("div");
    div.className = "day";
    div.textContent = day;

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const weekday = new Date(year, month, day).getDay();

    // 土日色付け
    if (weekday === 0) div.classList.add("sun");
    if (weekday === 6) div.classList.add("sat");

    // 祝日色付け（holidays.js のデータを参照）
    if (holidays[dateStr]) {
      div.classList.add("holiday");
    }

    // 日付クリック
    div.addEventListener("click", () => {
      document.querySelectorAll(".day").forEach(d => d.classList.remove("selected-day"));
      div.classList.add("selected-day");

      selectedDate = dateStr;

      const member = document.getElementById("memberSelect").value;
      if (member) {
        content.textContent = `${member} の ${selectedDate} のブログ画像一覧`;
      }
    });

    calendarGrid.appendChild(div);
  }
}

// ===============================
// 月移動ボタン
// ===============================
function setupMonthButtons() {
  document.getElementById("prevMonth").addEventListener("click", () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    yearSelect.value = currentYear;
    monthSelect.value = currentMonth;
    renderCalendar(currentYear, currentMonth);
  });

  document.getElementById("nextMonth").addEventListener("click", () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    yearSelect.value = currentYear;
    monthSelect.value = currentMonth;
    renderCalendar(currentYear, currentMonth);
  });
}

// ===============================
// 年・月プルダウン変更イベント
// ===============================
function setupYearMonthChange() {
  yearSelect.addEventListener("change", () => {
    currentYear = Number(yearSelect.value);
    renderCalendar(currentYear, currentMonth);
  });

  monthSelect.addEventListener("change", () => {
    currentMonth = Number(monthSelect.value);
    renderCalendar(currentYear, currentMonth);
  });
}

// ===============================
// カレンダー選択リセット（グループ切替時用）
// ===============================
function resetCalendarSelection() {
  selectedDate = null;
  document.querySelectorAll(".day").forEach(d => d.classList.remove("selected-day"));
}

// ===============================
// index.html から呼ばれる初期化関数
// ===============================
function initCalendar() {
  initYearMonthSelectors();
  setupMonthButtons();
  setupYearMonthChange();
  renderCalendar(currentYear, currentMonth);
}
