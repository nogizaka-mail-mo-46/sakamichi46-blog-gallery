function initCalendar(onDateSelect) {
  const yearSelect = document.getElementById("yearSelect");
  const monthSelect = document.getElementById("monthSelect");
  const grid = document.getElementById("calendar-grid");

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  for (let y = 2020; y <= 2030; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  }

  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    monthSelect.appendChild(opt);
  }

  yearSelect.value = year;
  monthSelect.value = month;

  function render() {
    grid.innerHTML = "";
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);

    const startDay = first.getDay();
    const total = last.getDate();

    for (let i = 0; i < startDay; i++) {
      const empty = document.createElement("div");
      grid.appendChild(empty);
    }

    for (let d = 1; d <= total; d++) {
      const div = document.createElement("div");
      div.className = "day";
      div.textContent = d;

      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      div.addEventListener("click", () => {
        onDateSelect(dateStr);
      });

      grid.appendChild(div);
    }
  }

  render();

  document.getElementById("prevMonth").onclick = () => {
    month--;
    if (month === 0) {
      month = 12;
      year--;
    }
    yearSelect.value = year;
    monthSelect.value = month;
    render();
  };

  document.getElementById("nextMonth").onclick = () => {
    month++;
    if (month === 13) {
      month = 1;
      year++;
    }
    yearSelect.value = year;
    monthSelect.value = month;
    render();
  };

  yearSelect.onchange = () => {
    year = Number(yearSelect.value);
    render();
  };

  monthSelect.onchange = () => {
    month = Number(monthSelect.value);
    render();
  };
}
