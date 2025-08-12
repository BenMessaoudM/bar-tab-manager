/* =========================================================
   Bar Tab Manager - Frontend (updated for local + hosted)
   ========================================================= */

/* ---------- API base: auto-detect (local vs hosted) ---------- */
const API_BASE = (() => {
  // Optional manual override before this file loads
  if (window.API_BASE_OVERRIDE) return window.API_BASE_OVERRIDE;

  const host = window.location.hostname;
  const isGhPages = host.endsWith('github.io');
  const isFile = window.location.protocol === 'file:'; // opened directly
  const isLocal = host === 'localhost' || host === '127.0.0.1';

  // When served from GitHub Pages or a file, use your Render API
  if (isGhPages || isFile) return 'https://bar-tab-api.onrender.com/api';

  // Default to local dev
  return 'http://127.0.0.1:5000/api';
})();

let token = localStorage.getItem('token') || '';
let userRole = ''; // 'worker' or 'superuser'

/* ---------- Tiny DOM helpers ---------- */
const el = (s) => document.querySelector(s);
const show = (s) => { const n = el(s); if (n) n.classList.remove('hidden'); };
const hide = (s) => { const n = el(s); if (n) n.classList.add('hidden'); };
const toggleNode = (n, on) => { if (n) n.classList.toggle('hidden', !on); };
const val = (s) => { const n = el(s); return n ? n.value : ''; };
const setVal = (s, v) => { const n = el(s); if (n) n.value = v; };
const openModal = (s) => { const m = el(s); if (m) m.classList.add('open'); };
const closeModal = (s) => { const m = el(s); if (m) m.classList.remove('open'); };

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Wire login button (in case form submit is prevented)
  const loginBtn = el('#login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      login();
    });
  }

  if (token) fetchUserInfo(); else showLogin();

  // Delegate drink buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.drink-btn');
    if (!btn) return;
    const price = Number(btn.dataset.price);
    const name = btn.dataset.name || 'Drink';
    const customerId = getSelectedCustomerId();
    if (!customerId) return alert('Select a customer first.');

    // Drink -> negative charge
    createTransaction(customerId, -Math.abs(price), name, true);
  });
});

/* ---------- Auth ---------- */
async function login() {
  const username = val('#login-username').trim();
  const password = val('#login-password').trim();
  const errorBox = el('#login-error'); if (errorBox) errorBox.textContent = '';
  if (!username || !password) { if (errorBox) errorBox.textContent = 'Enter username & password'; return; }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Login failed');

    token = data.token; localStorage.setItem('token', token);
    await fetchUserInfo();
  } catch (err) {
    console.error(err);
    if (errorBox) errorBox.textContent = err.message || 'Network error';
  }
}

function logout() { token = ''; userRole = ''; localStorage.removeItem('token'); showLogin(); }
function showLogin() { show('#login-view'); hide('#dashboard-view'); }
function showDashboard() { hide('#login-view'); show('#dashboard-view'); }

async function fetchUserInfo() {
  const payload = parseJwt(token);
  userRole = payload?.role || 'worker';

  try {
    const probe = await fetch(`${API_BASE}/customers`, { headers: { Authorization: `Bearer ${token}` } });
    if (!probe.ok) throw new Error('Invalid token');

    showDashboard();
    const roleEl = el('#user-role');
    if (roleEl) roleEl.textContent = userRole;
    toggleNode(el('#add-customer-section'), userRole === 'superuser');
    toggleNode(el('#manage-drinks-section'), userRole === 'superuser');

    await Promise.all([loadCustomers(), loadTransactions(), loadDrinks()]);
  } catch {
    logout();
  }
}

/* ---------- Customers ---------- */
async function loadCustomers() {
  const list = el('#customers-list');
  const sel = el('#customer-select');
  if (list) list.innerHTML = '';
  if (sel) sel.innerHTML = '';

  const res = await authed(`${API_BASE}/customers`);
  if (!res.ok) { alert('Failed to load customers'); return; }
  const customers = await res.json();

  let sessionTotal = 0;

  customers.forEach((c) => {
    const bal = getBalance(c); sessionTotal += bal;

    // list item row
    const li = document.createElement('li');

    const label = document.createElement('span');
    label.textContent = `${c.name} — Balance: ${formatEUR(bal)}`;
    if (bal < 0) label.style.color = '#E53E3E';

    const actions = document.createElement('span');

    // BOTH roles can print receipt
    const printBtn = document.createElement('button');
    printBtn.className = 'btn btn-muted';
    printBtn.textContent = 'Receipt';
    printBtn.onclick = () => openReceiptModal(c._id, c.name);
    actions.appendChild(printBtn);

    if (userRole === 'superuser') {
      const del = document.createElement('button');
      del.className = 'btn btn-danger';
      del.style.marginLeft = '8px';
      del.textContent = 'Delete';
      del.onclick = () => deleteCustomer(c._id);
      actions.appendChild(del);
    }

    li.appendChild(label);
    li.appendChild(actions);
    if (list) list.appendChild(li);

    // dropdown
    const opt = document.createElement('option');
    opt.value = c._id; opt.textContent = c.name;
    if (sel) sel.appendChild(opt);
  });

  const tot = el('#total-session-value');
  if (tot) tot.textContent = formatEUR(sessionTotal);
}

async function addCustomer() {
  const name = val('#customer-name').trim();
  if (!name) return alert('Enter customer name');
  const res = await authed(`${API_BASE}/customers`, {
    method: 'POST', body: JSON.stringify({ name })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return alert(data.message || 'Failed to add');
  setVal('#customer-name', '');
  await loadCustomers();
}

async function deleteCustomer(id) {
  if (!confirm('Delete this customer? This will remove their transactions, too.')) return;
  try {
    const res = await authed(`${API_BASE}/customers/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Delete failed');
    await loadCustomers();
  } catch (err) {
    alert(err.message);
  }
}

/* ---------- Transactions ---------- */
async function loadTransactions() {
  const list = el('#transactions-list'); if (list) list.innerHTML = '';
  const res = await authed(`${API_BASE}/transactions`);
  if (!res.ok) return;
  const txs = await res.json();
  txs.forEach((t) => {
    const name = t.customer?.name || t.customer || 'Unknown';
    const v = Number(t.price ?? t.amount ?? 0);
    const li = document.createElement('li');
    li.textContent = `${t.drink || t.description || 'Transaction'}: ${formatEUR(v)} for ${name}`;
    if (v < 0) li.style.color = '#E53E3E';
    if (list) list.appendChild(li);
  });
}

function toggleTransactions() {
  const box = el('#transactions-section');
  const btn = el('#tx-toggle');
  const hidden = box?.classList.toggle('hidden');
  if (btn) btn.textContent = hidden ? 'Show' : 'Hide';
}

function getSelectedCustomerId() {
  const s = el('#customer-select'); return s ? s.value : '';
}

async function addTransaction() {
  const customerId = getSelectedCustomerId();
  if (!customerId) return alert('Select a customer');

  let amount = Number(val('#transaction-amount'));
  const description = val('#transaction-description').trim() || 'Custom';

  if (!Number.isFinite(amount)) return alert('Enter a valid number');
  // If not a payment, positive amounts become negative charges
  if (!isPayment(description) && amount > 0) amount = -amount;

  await createTransaction(customerId, amount, description, false);
}

async function createTransaction(customerId, amount, description, silent = false) {
  try {
    const res = await authed(`${API_BASE}/transactions`, {
      method: 'POST',
      body: JSON.stringify({ customerId, amount, description })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to add transaction');

    if (!silent) { setVal('#transaction-amount', ''); setVal('#transaction-description', ''); }
    await Promise.all([loadCustomers(), loadTransactions()]);
  } catch (err) { alert(err.message); }
}

/* ---------- Drinks ---------- */
async function loadDrinks() {
  const wrap = el('#drinks-buttons'); if (wrap) wrap.innerHTML = '';
  const ul = el('#drinks-list'); if (ul) ul.innerHTML = '';

  const res = await authed(`${API_BASE}/drinks`);
  if (!res.ok) return;
  const drinks = await res.json();

  // Buttons for workers/admins (active only)
  drinks.filter(d => d.active).forEach((d) => {
    const b = document.createElement('button');
    b.className = 'drink-btn';
    b.dataset.price = d.price; b.dataset.name = d.name;
    b.textContent = `${d.name} (${formatEUR(d.price).replace(',00 €', '€')})`;
    if (wrap) wrap.appendChild(b);
  });

  // Superuser list in modal
  if (userRole !== 'superuser' || !ul) return;
  drinks.forEach((d) => {
    const li = document.createElement('li');
    li.style.display = 'grid';
    li.style.gridTemplateColumns = '1fr 120px 80px 1fr';
    li.style.gap = '8px'; li.style.alignItems = 'center';

    const n = document.createElement('input'); n.value = d.name;
    const p = document.createElement('input'); p.type = 'number'; p.step = '0.01'; p.value = d.price;
    const lab = document.createElement('label'); lab.style.display = 'flex'; lab.style.alignItems = 'center';
    const chk = document.createElement('input'); chk.type = 'checkbox'; chk.checked = !!d.active;
    lab.appendChild(chk); lab.appendChild(document.createTextNode(' Active'));

    const actions = document.createElement('div'); actions.style.textAlign = 'right';
    const save = document.createElement('button'); save.className = 'btn btn-blue'; save.textContent = 'Save';
    save.onclick = () => updateDrink(d._id, { name: n.value.trim(), price: Number(p.value), active: chk.checked });
    const del = document.createElement('button'); del.className = 'btn btn-danger'; del.style.marginLeft = '8px'; del.textContent = 'Delete';
    del.onclick = () => deleteDrink(d._id);

    actions.appendChild(save); actions.appendChild(del);

    li.appendChild(n); li.appendChild(p); li.appendChild(lab); li.appendChild(actions);
    ul.appendChild(li);
  });
}

async function addDrink() {
  const name = val('#new-drink-name').trim();
  const price = Number(val('#new-drink-price'));
  if (!name || !Number.isFinite(price) || price <= 0) return alert('Valid name & price required');
  const res = await authed(`${API_BASE}/drinks`, {
    method: 'POST', body: JSON.stringify({ name, price, active: true })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return alert(data.message || 'Failed to add drink');
  setVal('#new-drink-name', ''); setVal('#new-drink-price', '');
  await loadDrinks();
}

async function updateDrink(id, patch) {
  if (!patch.name || !Number.isFinite(patch.price) || patch.price <= 0) return alert('Valid name & price required');
  const res = await authed(`${API_BASE}/drinks/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return alert(data.message || 'Update failed');
  await loadDrinks();
}
async function deleteDrink(id) {
  if (!confirm('Delete this drink?')) return;
  const res = await authed(`${API_BASE}/drinks/${id}`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return alert(data.message || 'Delete failed');
  await loadDrinks();
}

/* ---------- Workers (superuser) ---------- */
function openWorkersModal() {
  if (userRole !== 'superuser') return alert('Superuser only');
  openModal('#workers-modal'); loadWorkers();
}
function closeWorkersModal() { closeModal('#workers-modal'); }

async function loadWorkers() {
  const ul = el('#workers-list'); if (ul) ul.innerHTML = '';
  const res = await authed(`${API_BASE}/users`);
  if (!res.ok) return;
  const users = await res.json();
  const workers = users.filter(u => u.role === 'worker');

  workers.forEach((w) => {
    const li = document.createElement('li');
    const label = document.createElement('span'); label.textContent = `${w.username} (worker)`;
    const del = document.createElement('button'); del.className = 'btn btn-danger'; del.textContent = 'Delete';
    del.onclick = () => deleteWorker(w._id);
    li.appendChild(label); li.appendChild(del);
    if (ul) ul.appendChild(li);
  });
}

async function addWorker() {
  const username = val('#worker-username').trim();
  const password = val('#worker-password').trim();
  if (!username || !password) return alert('Enter username & password');
  const res = await authed(`${API_BASE}/users`, {
    method: 'POST', body: JSON.stringify({ username, password, role: 'worker' })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return alert(data.message || 'Failed to add worker');
  setVal('#worker-username', ''); setVal('#worker-password', '');
  await loadWorkers();
}

async function deleteWorker(id) {
  if (!confirm('Delete this worker account?')) return;
  try {
    const res = await authed(`${API_BASE}/users/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Delete failed');
    await loadWorkers();
  } catch (err) {
    alert(err.message);
  }
}

/* ---------- Manage drinks modal wrappers ---------- */
function openManageDrinksModal() {
  if (userRole !== 'superuser') return alert('Superuser only');
  openModal('#manage-drinks-modal'); loadDrinks();
}
function closeManageDrinksModal() { closeModal('#manage-drinks-modal'); }

/* ---------- Receipt ---------- */
async function openReceiptModal(customerId, customerName) {
  try {
    const res = await authed(`${API_BASE}/transactions/customer/${customerId}`);
    if (!res.ok) throw new Error('Failed to load transactions');
    const txs = await res.json();

    const { groupedPurchases, payments, netTotal } = groupTransactions(txs);

    const cEl = el('#receipt-customer'); if (cEl) cEl.textContent = `Customer: ${customerName}`;
    const dEl = el('#receipt-date'); if (dEl) dEl.textContent = new Date().toLocaleDateString();

    const tbody = el('#receipt-table tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr><th colspan="2">Purchases</th></tr>
        ${
          groupedPurchases.length
            ? groupedPurchases.map(p => `
                <tr>
                  <td>${escapeHtml(p.name)} × ${p.qty}</td>
                  <td style="text-align:right">${formatEUR(p.sum)}</td>
                </tr>`).join('')
            : `<tr><td colspan="2" style="text-align:center;color:#666">No purchases</td></tr>`
        }
        <tr><th colspan="2">Payments</th></tr>
        ${
          payments.length
            ? payments.map(pay => `
                <tr>
                  <td>${escapeHtml(pay.desc)} — ${escapeHtml(pay.when)}</td>
                  <td style="text-align:right">${formatEUR(pay.amount)}</td>
                </tr>`).join('')
            : `<tr><td colspan="2" style="text-align:center;color:#666">No payments</td></tr>`
        }
        <tr>
          <td><strong>Net Balance</strong></td>
          <td style="text-align:right; ${netTotal < 0 ? 'color:#E53E3E' : ''}">
            <strong>${formatEUR(netTotal)}</strong>
          </td>
        </tr>
        ${
          netTotal <= -75
            ? `<tr><td colspan="2" style="color:#E53E3E;font-weight:700;border:2px solid #E53E3E;text-align:center">
                 ⚠ Please settle your tab now (limit exceeded).
               </td></tr>`
            : ''
        }
      `;
    }
    openModal('#receipt-modal');
  } catch (err) { alert(err.message); }
}
function closeReceipt() { closeModal('#receipt-modal'); }
function printReceipt() { window.print(); }

/* ---------- Helpers ---------- */
function parseJwt(jwt) {
  try {
    const b = jwt.split('.')[1];
    const p = atob(b.replace(/-/g, '+').replace(/_/g, '/')); 
    return JSON.parse(p);
  } catch { return {}; }
}
function getBalance(c) { return typeof c.balance === 'number' ? c.balance : (typeof c.amount === 'number' ? c.amount : 0); }
function isPayment(desc) { const d = (desc || '').toLowerCase(); return d.includes('pay') || d.includes('cash') || d.includes('card') || d.includes('deposit'); }
function formatEUR(n) {
  try { return new Intl.NumberFormat('fi-FI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' €'; }
  catch { return n.toFixed(2).replace('.', ',') + ' €'; }
}
function authed(url, opts = {}) {
  const headers = Object.assign({ 'Authorization': `Bearer ${token}` }, opts.headers || {});
  if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  return fetch(url, Object.assign({}, opts, { headers }));
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function num(t) { const raw = Number(t.price ?? t.amount ?? 0); return Number.isFinite(raw) ? raw : 0; }
function prettifyPaymentName(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('cash')) return 'Payment (Cash)';
  if (n.includes('card')) return 'Payment (Card)';
  if (n === 'payment' || n === 'deposit' || n === 'payback') return 'Payment';
  return name || 'Payment';
}
function groupTransactions(txs) {
  let netTotal = 0; const map = new Map(); const payments = [];
  txs.forEach((t) => {
    const v = num(t); netTotal += v;
    if (v < 0) {
      const n = (t.drink || t.description || 'Drink').trim();
      const e = map.get(n) || { qty: 0, sum: 0 }; e.qty += 1; e.sum += Math.abs(v); map.set(n, e);
    } else if (v > 0) {
      payments.push({ when: new Date(t.createdAt).toLocaleString(), desc: prettifyPaymentName(t.drink || t.description || 'Payment'), amount: v });
    }
  });
  const groupedPurchases = Array.from(map.entries())
    .map(([name, e]) => ({ name, qty: e.qty, sum: e.sum }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { groupedPurchases, payments, netTotal };
}

/* expose to window for inline onclick */
window.login = login; window.logout = logout;
window.addCustomer = addCustomer; window.addTransaction = addTransaction;
window.openManageDrinksModal = openManageDrinksModal; window.closeManageDrinksModal = closeManageDrinksModal;
window.addDrink = addDrink; window.printReceipt = printReceipt; window.closeReceipt = closeReceipt;
window.openWorkersModal = openWorkersModal; window.closeWorkersModal = closeWorkersModal;
window.addWorker = addWorker; window.deleteWorker = deleteWorker;
window.toggleTransactions = toggleTransactions;
