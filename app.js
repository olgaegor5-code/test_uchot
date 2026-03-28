(function () {
  const STORAGE_KEY = "nail-uchot-v1";

  const defaultServices = [
    { id: "s1", name: "Классический маникюр", price: 800, category: "manicure" },
    { id: "s2", name: "Аппаратный маникюр", price: 1200, category: "manicure" },
    { id: "s3", name: "Маникюр + гель-лак", price: 1800, category: "manicure" },
    { id: "s4", name: "Снятие гель-лака", price: 400, category: "manicure" },
    { id: "s5", name: "Наращивание / коррекция", price: 2500, category: "manicure" },
    { id: "s6", name: "Классический педикюр", price: 1500, category: "pedicure" },
    { id: "s7", name: "Аппаратный педикюр", price: 1900, category: "pedicure" },
    { id: "s8", name: "Педикюр + гель-лак", price: 2400, category: "pedicure" },
    { id: "s9", name: "Экспресс-педикюр", price: 1100, category: "pedicure" },
  ];

  const catLabels = {
    manicure: "Маникюр",
    pedicure: "Педикюр",
    other: "Другое",
  };

  const ALLOWED_CATS = new Set(["manicure", "pedicure", "other"]);

  function normalizeService(s) {
    const name = typeof s.name === "string" && s.name.trim() ? s.name.trim() : "Услуга";
    const price = Number.isFinite(Number(s.price)) ? Math.max(0, Math.round(Number(s.price))) : 0;
    const category = ALLOWED_CATS.has(s.category) ? s.category : "other";
    return { ...s, name, price, category };
  }

  function debounce(fn, ms) {
    let t;
    function run() {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    }
    run.cancel = function () {
      clearTimeout(t);
    };
    return run;
  }

  function uid() {
    return "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { services: defaultServices.map((s) => ({ ...s })), visits: [] };
      }
      const data = JSON.parse(raw);
      if (!Array.isArray(data.services) || !Array.isArray(data.visits)) {
        return { services: defaultServices.map((s) => ({ ...s })), visits: [] };
      }
      data.services = data.services.map(normalizeService);
      return data;
    } catch {
      return { services: defaultServices.map((s) => ({ ...s })), visits: [] };
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  let state = loadState();

  const debouncedPersistServices = debounce(function () {
    saveState(state);
    renderVisitServices();
  }, 380);

  const els = {
    tabs: document.querySelectorAll(".tab"),
    panels: document.querySelectorAll(".panel"),
    formVisit: document.getElementById("form-visit"),
    visitDate: document.getElementById("visit-date"),
    visitClient: document.getElementById("visit-client"),
    visitNote: document.getElementById("visit-note"),
    visitServices: document.getElementById("visit-services"),
    visitTotalSum: document.getElementById("visit-total-sum"),
    clientsDatalist: document.getElementById("clients-datalist"),
    historyList: document.getElementById("history-list"),
    filterMonth: document.getElementById("filter-month"),
    filterClear: document.getElementById("filter-clear"),
    formAddService: document.getElementById("form-add-service"),
    newServiceName: document.getElementById("new-service-name"),
    newServicePrice: document.getElementById("new-service-price"),
    newServiceCat: document.getElementById("new-service-cat"),
    servicesEditor: document.getElementById("services-editor"),
    statsMonth: document.getElementById("stats-month"),
    statRevenue: document.getElementById("stat-revenue"),
    statVisits: document.getElementById("stat-visits"),
    statClients: document.getElementById("stat-clients"),
    statByService: document.getElementById("stat-by-service"),
    btnExportCsv: document.getElementById("btn-export-csv"),
    btnResetData: document.getElementById("btn-reset-data"),
  };

  function formatMoney(n) {
    return (
      new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: 0,
      }).format(n) + " ₽"
    );
  }

  function todayISODate() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function currentMonthValue() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function visitTotal(visit) {
    return visit.lines.reduce((s, l) => s + l.price, 0);
  }

  function groupServicesByCategory(services) {
    const order = ["manicure", "pedicure", "other"];
    const groups = { manicure: [], pedicure: [], other: [] };
    services.forEach((s) => {
      const c = groups[s.category] ? s.category : "other";
      groups[c].push(s);
    });
    return order.map((k) => ({ key: k, items: groups[k] || [] })).filter((g) => g.items.length);
  }

  function renderVisitServices() {
    const groups = groupServicesByCategory(state.services);
    els.visitServices.innerHTML = "";
    if (!state.services.length) {
      els.visitServices.innerHTML =
        '<p class="empty-state">Добавьте услуги во вкладке «Услуги и цены».</p>';
      updateVisitTotal();
      return;
    }
    groups.forEach(({ key, items }) => {
      const wrap = document.createElement("div");
      wrap.className = "cat-group";
      const title = document.createElement("div");
      title.className = "cat-group-title";
      title.textContent = catLabels[key] || key;
      wrap.appendChild(title);
      items.forEach((svc) => {
        const row = document.createElement("label");
        row.className = "service-row";
        row.dataset.id = svc.id;
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.name = "svc";
        cb.value = svc.id;
        cb.addEventListener("change", () => {
          row.classList.toggle("is-checked", cb.checked);
          updateVisitTotal();
        });
        const meta = document.createElement("div");
        meta.className = "svc-meta";
        const name = document.createElement("div");
        name.className = "svc-name";
        name.textContent = svc.name;
        const price = document.createElement("div");
        price.className = "svc-price";
        price.textContent = formatMoney(svc.price);
        meta.appendChild(name);
        row.appendChild(cb);
        row.appendChild(meta);
        row.appendChild(price);
        wrap.appendChild(row);
      });
      els.visitServices.appendChild(wrap);
    });
    updateVisitTotal();
  }

  function getSelectedServiceIds() {
    return Array.from(els.visitServices.querySelectorAll('input[name="svc"]:checked')).map(
      (i) => i.value
    );
  }

  function updateVisitTotal() {
    const ids = new Set(getSelectedServiceIds());
    let sum = 0;
    state.services.forEach((s) => {
      if (ids.has(s.id)) sum += s.price;
    });
    els.visitTotalSum.textContent = formatMoney(sum);
  }

  function refreshClientsDatalist() {
    const names = new Set();
    state.visits.forEach((v) => {
      const t = (v.client || "").trim();
      if (t) names.add(t);
    });
    els.clientsDatalist.innerHTML = "";
    names.forEach((n) => {
      const opt = document.createElement("option");
      opt.value = n;
      els.clientsDatalist.appendChild(opt);
    });
  }

  function renderHistory() {
    const monthFilter = els.filterMonth.value;
    let list = [...state.visits].sort((a, b) => b.date.localeCompare(a.date));
    if (monthFilter) {
      list = list.filter((v) => v.date.startsWith(monthFilter));
    }
    els.historyList.innerHTML = "";
    if (!list.length) {
      els.historyList.innerHTML = '<p class="empty-state">Пока нет записей за выбранный период.</p>';
      return;
    }
    list.forEach((v) => {
      const total = visitTotal(v);
      const names = v.lines.map((l) => l.name).join(", ");
      const item = document.createElement("div");
      item.className = "history-item";
      item.innerHTML = `
        <div class="history-item-top">
          <div>
            <div class="history-date">${formatVisitDate(v.date)}</div>
            <div class="history-client">${escapeHtml(v.client || "Без имени")}</div>
          </div>
          <div class="history-sum">${formatMoney(total)}</div>
        </div>
        <div class="history-services">${escapeHtml(names)}</div>
        ${v.note ? `<div class="history-note">${escapeHtml(v.note)}</div>` : ""}
        <div class="history-actions">
          <button type="button" class="btn-small" data-del="${v.id}">Удалить</button>
        </div>
      `;
      els.historyList.appendChild(item);
    });
    els.historyList.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-del");
        if (confirm("Удалить эту запись?")) {
          state.visits = state.visits.filter((x) => x.id !== id);
          saveState(state);
          renderHistory();
          refreshClientsDatalist();
          renderStats();
        }
      });
    });
  }

  function formatVisitDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    if (!y) return iso;
    const months = [
      "янв",
      "фев",
      "мар",
      "апр",
      "мая",
      "июн",
      "июл",
      "авг",
      "сен",
      "окт",
      "ноя",
      "дек",
    ];
    return `${d} ${months[m - 1]} ${y}`;
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function moveService(index, delta) {
    const j = index + delta;
    if (j < 0 || j >= state.services.length) return;
    const arr = state.services;
    const tmp = arr[index];
    arr[index] = arr[j];
    arr[j] = tmp;
    saveState(state);
    renderServicesEditor();
    renderVisitServices();
  }

  function renderServicesEditor() {
    debouncedPersistServices.cancel();
    els.servicesEditor.innerHTML = "";
    state.services.forEach((s, index) => {
      const row = document.createElement("div");
      row.className = "edit-row";

      const nameIn = document.createElement("input");
      nameIn.type = "text";
      nameIn.setAttribute("aria-label", "Название услуги");
      nameIn.value = s.name;
      nameIn.addEventListener("input", () => {
        s.name = nameIn.value;
        debouncedPersistServices();
      });
      nameIn.addEventListener("blur", () => {
        debouncedPersistServices.cancel();
        const v = nameIn.value.trim();
        if (v) s.name = v;
        else nameIn.value = s.name;
        saveState(state);
        renderVisitServices();
      });

      const priceIn = document.createElement("input");
      priceIn.type = "number";
      priceIn.min = "0";
      priceIn.step = "50";
      priceIn.setAttribute("aria-label", "Цена");
      priceIn.value = String(s.price);
      priceIn.addEventListener("input", () => {
        s.price = Math.max(0, parseInt(priceIn.value, 10) || 0);
        debouncedPersistServices();
      });
      priceIn.addEventListener("blur", () => {
        debouncedPersistServices.cancel();
        s.price = Math.max(0, parseInt(priceIn.value, 10) || 0);
        priceIn.value = String(s.price);
        saveState(state);
        renderVisitServices();
      });

      const catSel = document.createElement("select");
      catSel.setAttribute("aria-label", "Категория");
      (["manicure", "pedicure", "other"]).forEach((key) => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = catLabels[key];
        catSel.appendChild(opt);
      });
      catSel.value = s.category;
      catSel.addEventListener("change", () => {
        s.category = catSel.value;
        saveState(state);
        renderVisitServices();
      });

      const actions = document.createElement("div");
      actions.className = "edit-row-actions";

      const btnUp = document.createElement("button");
      btnUp.type = "button";
      btnUp.className = "btn-icon";
      btnUp.textContent = "↑";
      btnUp.title = "Выше в списке";
      btnUp.setAttribute("aria-label", "Переместить выше");
      btnUp.disabled = index === 0;
      btnUp.addEventListener("click", () => moveService(index, -1));

      const btnDown = document.createElement("button");
      btnDown.type = "button";
      btnDown.className = "btn-icon";
      btnDown.textContent = "↓";
      btnDown.title = "Ниже в списке";
      btnDown.setAttribute("aria-label", "Переместить ниже");
      btnDown.disabled = index === state.services.length - 1;
      btnDown.addEventListener("click", () => moveService(index, 1));

      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn-icon";
      del.textContent = "Удалить";
      del.title = "Удалить услугу";
      del.addEventListener("click", () => {
        if (confirm("Удалить услугу из справочника?")) {
          state.services = state.services.filter((x) => x.id !== s.id);
          saveState(state);
          renderServicesEditor();
          renderVisitServices();
        }
      });

      actions.appendChild(btnUp);
      actions.appendChild(btnDown);
      actions.appendChild(del);

      row.appendChild(nameIn);
      row.appendChild(priceIn);
      row.appendChild(catSel);
      row.appendChild(actions);
      els.servicesEditor.appendChild(row);
    });
  }

  function renderStats() {
    const month = els.statsMonth.value;
    let visits = state.visits;
    if (month) {
      visits = visits.filter((v) => v.date.startsWith(month));
    }
    let revenue = 0;
    visits.forEach((v) => {
      revenue += visitTotal(v);
    });
    const uniqueClients = new Set();
    visits.forEach((v) => {
      const c = (v.client || "").trim();
      if (c) uniqueClients.add(c.toLowerCase());
    });
    els.statRevenue.textContent = formatMoney(revenue);
    els.statVisits.textContent = String(visits.length);
    els.statClients.textContent = String(uniqueClients.size);

    const byName = {};
    visits.forEach((v) => {
      v.lines.forEach((l) => {
        if (!byName[l.name]) byName[l.name] = { count: 0, sum: 0 };
        byName[l.name].count += 1;
        byName[l.name].sum += l.price;
      });
    });
    const names = Object.keys(byName).sort();
    els.statByService.innerHTML = "";
    if (!names.length) {
      els.statByService.innerHTML = '<p class="empty-state">Нет данных за период.</p>';
      return;
    }
    names.forEach((name) => {
      const { count, sum } = byName[name];
      const row = document.createElement("div");
      row.className = "stat-svc-row";
      row.innerHTML = `
        <span class="stat-svc-name">${escapeHtml(name)}</span>
        <span class="stat-svc-num">${count} × ${formatMoney(sum)}</span>
      `;
      els.statByService.appendChild(row);
    });
  }

  function initTabs() {
    els.tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const id = tab.getAttribute("data-tab");
        els.tabs.forEach((t) => {
          t.classList.toggle("is-active", t === tab);
          t.setAttribute("aria-selected", t === tab ? "true" : "false");
        });
        els.panels.forEach((p) => {
          const show = p.id === "panel-" + id;
          p.classList.toggle("is-visible", show);
          p.hidden = !show;
        });
        if (id === "history") renderHistory();
        if (id === "stats") renderStats();
      });
    });
  }

  els.formVisit.addEventListener("submit", (e) => {
    e.preventDefault();
    const ids = getSelectedServiceIds();
    if (!ids.length) {
      alert("Выберите хотя бы одну услугу.");
      return;
    }
    const lines = [];
    ids.forEach((sid) => {
      const svc = state.services.find((s) => s.id === sid);
      if (svc) {
        lines.push({ serviceId: svc.id, name: svc.name, price: svc.price });
      }
    });
    const visit = {
      id: uid(),
      date: els.visitDate.value || todayISODate(),
      client: (els.visitClient.value || "").trim(),
      lines,
      note: (els.visitNote.value || "").trim(),
    };
    state.visits.push(visit);
    saveState(state);
    els.visitNote.value = "";
    els.visitClient.value = "";
    els.visitServices.querySelectorAll('input[name="svc"]').forEach((i) => {
      i.checked = false;
      i.closest(".service-row")?.classList.remove("is-checked");
    });
    updateVisitTotal();
    refreshClientsDatalist();
    renderStats();
    alert("Визит сохранён.");
  });

  els.formAddService.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = (els.newServiceName.value || "").trim();
    const price = Math.max(0, parseInt(els.newServicePrice.value, 10) || 0);
    if (!name) {
      alert("Введите название услуги.");
      return;
    }
    state.services.push(
      normalizeService({
        id: uid(),
        name,
        price,
        category: els.newServiceCat.value || "other",
      })
    );
    saveState(state);
    els.newServiceName.value = "";
    els.newServicePrice.value = "";
    renderServicesEditor();
    renderVisitServices();
  });

  els.filterMonth.addEventListener("change", renderHistory);
  els.filterClear.addEventListener("click", () => {
    els.filterMonth.value = "";
    renderHistory();
  });

  els.statsMonth.addEventListener("change", renderStats);

  els.btnExportCsv.addEventListener("click", () => {
    const rows = [["Дата", "Клиент", "Услуги", "Сумма", "Комментарий"]];
    const sorted = [...state.visits].sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach((v) => {
      const services = v.lines.map((l) => l.name).join("; ");
      rows.push([
        v.date,
        v.client || "",
        services,
        String(visitTotal(v)),
        v.note || "",
      ]);
    });
    const bom = "\uFEFF";
    const csv = bom + rows.map((r) => r.map((c) => csvEscape(c)).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "uchot-visits.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  function csvEscape(s) {
    const t = String(s);
    if (/[;\r\n"]/.test(t)) return '"' + t.replace(/"/g, '""') + '"';
    return t;
  }

  els.btnResetData.addEventListener("click", () => {
    if (
      !confirm(
        "Удалить все визиты и сбросить услуги к начальному списку? Это действие необратимо."
      )
    ) {
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    state = loadState();
    renderVisitServices();
    renderServicesEditor();
    renderHistory();
    renderStats();
    refreshClientsDatalist();
  });

  els.visitDate.value = todayISODate();
  els.filterMonth.value = currentMonthValue();
  els.statsMonth.value = currentMonthValue();

  initTabs();
  renderVisitServices();
  renderServicesEditor();
  renderHistory();
  renderStats();
  refreshClientsDatalist();
})();
