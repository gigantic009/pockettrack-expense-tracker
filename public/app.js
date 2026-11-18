const $ = id => document.getElementById(id);

const money = n => new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
}).format(n || 0);

const icons = {
    Food:"🍜",
    Transport:"🚌",
    Shopping:"🛍️",
    Bills:"🧾",
    Education:"📚",
    Health:"💊",
    Entertainment:"🎬",
    Other:"📦",
    Salary:"💼",
    Allowance:"💸",
    Freelance:"💻",
    Scholarship:"🎓",
    Gift:"🎁"
};

let user = null;
let transactions = [];
let categories = [];
let editingId = null;

/* INDIA DATE HANDLING */

const today = () => new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
}).format(new Date());

const monthOf = d => d.slice(0, 7);
const percentClass = (value, max) =>
    Math.min(100, Math.max(0, Math.round((value / max) * 100)));

/* Set current month */

$("monthPicker").value = monthOf(today());

/* API */

async function api(url, options = {}) {

    const res = await fetch(url, {
        ...options,
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw Error(data.error || "Something went wrong.");
    }

    return data;
}

/* AUTHENTICATION */

function showAuth(register = false) {

    $("authView").classList.remove("hidden");
    $("appView").classList.add("hidden");

    $("loginPanel").classList.toggle("hidden", register);
    $("registerPanel").classList.toggle("hidden", !register);
}

function showApp() {

    $("authView").classList.add("hidden");
    $("appView").classList.remove("hidden");

    $("welcomeUser").textContent = "Hi, " + user.name;
}

/* LOAD DASHBOARD */

async function load() {

    const month = $("monthPicker").value;

    const [tx, cat, summary] = await Promise.all([
        api("/api/transactions?month=" + month),
        api("/api/categories"),
        api("/api/summary?month=" + month)
    ]);

    transactions = tx.transactions;
    categories = cat.categories;

    $("balance").textContent = money(summary.balance);
    $("income").textContent = money(summary.income);
    $("expenses").textContent = money(summary.expense);
    $("savings").textContent = summary.savingsRate + "%";

    renderCategories(summary.byCategory);
    renderRows();
    renderChart();
    fillCategoryFilter();
    await loadFinanceTools();
}


let pendingCsvText = null;

async function loadFinanceTools() {
  const month = $("monthPicker").value;
  const [budgetData, recurringData, auditData] = await Promise.all([
    api("/api/budgets?month=" + month),
    api("/api/recurring-rules"),
    api("/api/audit?limit=10")
  ]);
  $("budgetCategory").innerHTML = categories.filter(c => c.type === "expense")
    .map(c => '<option value="' + esc(c.name) + '">' + esc(c.name) + '</option>').join("");
  $("recType").value = "expense";
  fillRecurringCategories();
  $("budgetList").innerHTML = budgetData.budgets.length
    ? budgetData.budgets.map(b => '<div class="catrow"><div><b>' + esc(b.category) +
      '</b><div class="track"><div class="fill width-' + percentClass(b.spent, b.amount) +
      '"></div></div><small>' + money(b.spent) + ' of ' + money(b.amount) +
      ' · ' + (b.remaining >= 0 ? money(b.remaining) + ' left' : money(-b.remaining) + ' over') +
      '</small></div><button class="outline" data-budget-delete="' + b.id + '">Remove</button></div>').join("")
    : '<div class="empty">No budgets for this month yet.</div>';
  $("auditList").innerHTML = auditData.events.length
    ? auditData.events.map(event => '<div class="catrow"><div><b>' + esc(event.eventType.replaceAll("_", " ")) + '</b><div class="sub">' + esc(event.createdAt) + '</div></div></div>').join("")
    : '<div class="empty">No account activity yet.</div>';
  $("recurringList").innerHTML = recurringData.rules.length
    ? recurringData.rules.map(r => '<div class="catrow"><div><b>' + esc(r.description) +
      '</b><div class="sub">' + esc(r.frequency) + ' · ' + esc(r.category) + ' · ' +
      money(r.amount) + ' · next ' + esc(r.next_run_date) + '</div></div>' +
      '<button class="outline" data-rec-run="' + r.id + '">Run due</button>' +
      '<button class="outline" data-rec-delete="' + r.id + '">Delete</button></div>').join("")
    : '<div class="empty">No recurring rules yet.</div>';
}

function fillRecurringCategories() {
  const type = $("recType").value;
  const list = categories.filter(c => c.type === type);
  $("recCategory").innerHTML = list.map(c => '<option value="' + esc(c.name) + '">' + esc(c.name) + '</option>').join("");
}

$("budgetForm").onsubmit = async event => {
  event.preventDefault();
  try {
    await api("/api/budgets", { method: "POST", body: JSON.stringify({
      category: $("budgetCategory").value,
      month: $("monthPicker").value,
      amount: Number($("budgetAmount").value)
    })});
    $("budgetAmount").value = "";
    await loadFinanceTools();
  } catch (error) { alert(error.message); }
};

$("budgetList").addEventListener("click", async event => {
  const button = event.target.closest("[data-budget-delete]");
  if (!button) return;
  try {
    await api("/api/budgets/" + button.dataset.budgetDelete, { method: "DELETE" });
    await loadFinanceTools();
  } catch (error) { alert(error.message); }
});

$("previewCsvBtn").onclick = async () => {
  const file = $("csvFile").files[0];
  if (!file) { $("csvPreview").textContent = "Choose a CSV file first."; return; }
  if (file.size > 1000000) { $("csvPreview").textContent = "CSV must be 1 MB or smaller."; return; }
  try {
    pendingCsvText = await file.text();
    const result = await api("/api/transactions/import/preview", {
      method: "POST", body: JSON.stringify({ csv: pendingCsvText })
    });
    $("csvPreview").textContent = result.validRows + " ready · " +
      result.duplicateRows + " duplicates · " + result.invalidRows + " invalid. " +
      (result.errors || []).slice(0, 3).map(e => "Row " + e.row + ": " + e.issues.join(" ")).join(" ");
    $("importCsvBtn").disabled = result.validRows === 0 || result.invalidRows > 0;
  } catch (error) {
    pendingCsvText = null;
    $("importCsvBtn").disabled = true;
    $("csvPreview").textContent = error.message;
  }
};

$("importCsvBtn").onclick = async () => {
  if (!pendingCsvText) return;
  try {
    const result = await api("/api/transactions/import", {
      method: "POST", body: JSON.stringify({ csv: pendingCsvText })
    });
    $("csvPreview").textContent = "Imported " + result.imported +
      " transactions; skipped " + result.skippedDuplicates + " duplicates.";
    pendingCsvText = null;
    $("importCsvBtn").disabled = true;
    await refresh();
  } catch (error) { $("csvPreview").textContent = error.message; }
};

$("exportCsvBtn").onclick = () => {
  window.location.href = "/api/transactions/export.csv?month=" + encodeURIComponent($("monthPicker").value);
};

$("recType").onchange = fillRecurringCategories;
$("recurringForm").onsubmit = async event => {
  event.preventDefault();
  try {
    await api("/api/recurring-rules", { method: "POST", body: JSON.stringify({
      description: $("recDescription").value,
      amount: Number($("recAmount").value),
      type: $("recType").value,
      category: $("recCategory").value,
      frequency: $("recFrequency").value,
      startDate: $("recStartDate").value,
      endDate: $("recEndDate").value || null
    })});
    $("recurringForm").reset();
    $("recStartDate").value = today();
    fillRecurringCategories();
    await loadFinanceTools();
  } catch (error) { alert(error.message); }
};

$("recurringList").addEventListener("click", async event => {
  const run = event.target.closest("[data-rec-run]");
  const remove = event.target.closest("[data-rec-delete]");
  try {
    if (run) {
      const result = await api("/api/recurring-rules/" + run.dataset.recRun + "/run", { method: "POST" });
      alert(result.blockedByBalance
        ? result.created + " created. The next occurrence is waiting because available balance is insufficient."
        : result.created + " due transaction(s) created.");
    } else if (remove) {
      if (!confirm("Delete this recurring rule? Existing transactions will remain.")) return;
      await api("/api/recurring-rules/" + remove.dataset.recDelete, { method: "DELETE" });
    } else return;
    await refresh();
  } catch (error) { alert(error.message); }
});

$("recStartDate").value = today();

/* CATEGORY DISPLAY */

function renderCategories(list) {

    const max = Math.max(1, ...list.map(x => x.total));

    $("categories").innerHTML = list.length
        ? list.map(x => `
            <div class="catrow">
                <div class="caticon">${icons[x.category] || "📦"}</div>
                <div>
                    <b>${esc(x.category)}</b>
                    <div class="track">
                        <div class="fill width-${percentClass(x.total, max)}"></div>
                    </div>
                </div>
                <small>${money(x.total)}</small>
            </div>
        `).join("")
        : '<div class="empty">No expenses this month yet.</div>';
}

/* CASH FLOW CHART */

function renderChart() {

    const current = new Date($("monthPicker").value + "-01T12:00:00");
    const arr = [];

    for (let i = 5; i >= 0; i--) {

        const d = new Date(
            current.getFullYear(),
            current.getMonth() - i,
            1
        );

        const key = d.getFullYear() + "-" +
            String(d.getMonth() + 1).padStart(2, "0");

        const list = transactionsAllCache.filter(
            t => monthOf(t.date) === key
        );

        arr.push({
            label: d.toLocaleDateString("en", { month: "short" }),
            inc: list.filter(t => t.type === "income")
                .reduce((a, t) => a + t.amount, 0),
            exp: list.filter(t => t.type === "expense")
                .reduce((a, t) => a + t.amount, 0)
        });
    }

    const max = Math.max(1, ...arr.flatMap(x => [x.inc, x.exp]));

    $("chart").innerHTML = arr.map(x => `
        <div class="monthbar">
            <div class="barset">
                <div class="bar incbar height-${percentClass(x.inc, max)}"
                    title="${money(x.inc)}"></div>

                <div class="bar expbar height-${percentClass(x.exp, max)}"
                    title="${money(x.exp)}"></div>
            </div>
            <small>${x.label}</small>
        </div>
    `).join("");
}

let transactionsAllCache = [];

async function loadChartData() {

    const d = await api("/api/transactions");

    transactionsAllCache = d.transactions;
}

/* HTML ESCAPING */

function esc(s) {

    return String(s).replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));
}

/* CATEGORY OPTIONS */

function fillCategoryOptions(type, selected) {

    const list = categories.filter(x => x.type === type);

    $("category").innerHTML = list.map(x => `
        <option ${x.name === selected ? "selected" : ""}>
            ${esc(x.name)}
        </option>
    `).join("");
}

function fillCategoryFilter() {

    const old = $("categoryFilter").value;

    const all = [...new Set(transactions.map(x => x.category))];

    $("categoryFilter").innerHTML =
        '<option value="all">All categories</option>' +
        all.map(x => `<option>${esc(x)}</option>`).join("");

    $("categoryFilter").value = all.includes(old) ? old : "all";
}

/* TRANSACTION TABLE */

function renderRows() {

    const q = $("search").value.toLowerCase();
    const type = $("typeFilter").value;
    const cat = $("categoryFilter").value;

    const list = transactions.filter(t =>
        (type === "all" || t.type === type) &&
        (cat === "all" || t.category === cat) &&
        (
            t.description.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q)
        )
    );

    $("rows").innerHTML = list.length
        ? list.map(t => `
            <tr>
                <td><b>${esc(t.description)}</b></td>

                <td>
                    <span class="pill">
                        ${icons[t.category] || "📦"}
                        ${esc(t.category)}
                    </span>
                </td>

                <td>
                    ${new Date(t.date + "T12:00:00").toLocaleDateString("en-IN")}
                </td>

                <td class="${t.type === "income" ? "positive" : "negative"}">
                    ${t.type}
                </td>

                <td class="${t.type === "income" ? "positive" : "negative"}">
                    <b>${t.type === "income" ? "+" : "−"}${money(t.amount)}</b>
                </td>

                <td class="actions">
                    <button data-action="edit" data-id="${t.id}" aria-label="Edit transaction">✎</button>
                    <button data-action="delete" data-id="${t.id}" aria-label="Delete transaction">×</button>
                </td>
            </tr>
        `).join("")
        : '<tr><td colspan="6" class="empty">No transactions found.</td></tr>';
}

/* ADD / EDIT TRANSACTION MODAL */

function openModal(t) {

    editingId = t?.id || null;

    $("modalTitle").textContent = t
        ? "Edit transaction"
        : "Add transaction";

    $("description").value = t?.description || "";
    $("amount").value = t?.amount || "";
    $("type").value = t?.type || "expense";

    fillCategoryOptions($("type").value, t?.category);

    /*
       IMPORTANT:
       Prevent selecting any date after today.
       Today is allowed.
    */

    $("date").max = today();

    $("date").value = t?.date || today();

    $("formError").textContent = "";

    $("modal").classList.add("show");
}

function closeModal() {

    $("modal").classList.remove("show");

    editingId = null;
}

/* EDIT TRANSACTION */

window.editTx = id => {

    const t = transactions.find(x => x.id === id);

    if (t) openModal(t);
};

/* DELETE TRANSACTION */

window.deleteTx = async id => {

    if (confirm("Delete this transaction?")) {

        try {

            await api("/api/transactions/" + id, {
                method: "DELETE"
            });

            await refresh();

        } catch (e) {

            alert(e.message);
        }
    }
};



/* Transaction actions use delegated listeners instead of inline HTML handlers. */
$("rows").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    if (!Number.isSafeInteger(id)) return;

    if (button.dataset.action === "edit") {
        window.editTx(id);
    } else if (button.dataset.action === "delete") {
        window.deleteTx(id);
    }
});

/* REFRESH DASHBOARD */

async function refresh() {

    await loadChartData();

    await load();
}

/* AUTH BUTTONS */

$("showRegister").onclick = () => showAuth(true);
$("showLogin").onclick = () => showAuth(false);

/* REGISTER */

$("registerForm").onsubmit = async e => {

    e.preventDefault();

    $("registerError").textContent = "";

    try {

        const d = await api("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({
                name: $("regName").value,
                email: $("regEmail").value,
                password: $("regPassword").value
            })
        });

        user = d.user;

        showApp();

        await refresh();

    } catch (e) {

        $("registerError").textContent = e.message;
    }
};

/* LOGIN */

$("loginForm").onsubmit = async e => {

    e.preventDefault();

    $("loginError").textContent = "";

    try {

        const d = await api("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email: $("loginEmail").value,
                password: $("loginPassword").value
            })
        });

        user = d.user;

        showApp();

        await refresh();

    } catch (e) {

        $("loginError").textContent = e.message;
    }
};

/* LOGOUT */

$("logoutBtn").onclick = async () => {

    await api("/api/auth/logout", {
        method: "POST"
    });

    user = null;

    showAuth(false);
};

/* MODAL CONTROLS */

$("addBtn").onclick = () => openModal();

$("cancelBtn").onclick = closeModal;

$("type").onchange = () => {
    fillCategoryOptions($("type").value);
};

/* SAVE TRANSACTION */

$("transactionForm").onsubmit = async e => {

    e.preventDefault();

    $("formError").textContent = "";

    const body = {
        description: $("description").value,
        amount: Number($("amount").value),
        type: $("type").value,
        category: $("category").value,
        date: $("date").value
    };

    /*
       FRONTEND DATE VALIDATION
       Reject future dates before sending to backend.
    */

    if (!body.date) {

        $("formError").textContent = "Please select a transaction date.";

        return;
    }

    if (body.date > today()) {

        $("formError").textContent =
            "Future dates are not allowed. Please select today or an earlier date.";

        return;
    }

    try {

        await api(
            editingId
                ? "/api/transactions/" + editingId
                : "/api/transactions",
            {
                method: editingId ? "PUT" : "POST",
                body: JSON.stringify(body)
            }
        );

        closeModal();

        await refresh();

    } catch (e) {

        $("formError").textContent = e.message;
    }
};

/* FILTERS */

$("monthPicker").onchange = load;

$("search").oninput = renderRows;

$("typeFilter").onchange = renderRows;

$("categoryFilter").onchange = renderRows;

/* CLOSE MODAL WHEN CLICKING OUTSIDE */

$("modal").onclick = e => {

    if (e.target === $("modal")) {
        closeModal();
    }
};

/* INITIAL AUTHENTICATION CHECK */

(async () => {

    try {

        const d = await api("/api/auth/me");

        user = d.user;

        showApp();

        await refresh();

    } catch {

        showAuth(false);
    }

})();
