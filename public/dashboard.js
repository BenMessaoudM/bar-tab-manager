// public/dashboard.js

// If the frontend is served by the same server as the API, leave API_BASE = ''.
// If you host frontend separately (e.g., GitHub Pages), set API_BASE to your Render URL:
//   const API_BASE = 'https://<your-render-app>.onrender.com';
const API_BASE = ''; // '' means same origin; change to full URL if hosting separately.

/* ----------------------- auth / boot ----------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const role  = localStorage.getItem('role');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // show superuser-only controls
  if (role === 'superuser') {
    show('#admin-links');
    show('#add-customer-block');
  }

  const roleEl = document.getElementById('user-role');
  if (roleEl) roleEl.textContent = `Logged in as: ${role}`;

  fetchCustomers();
});

function logout() {
  localStorage.clear();
  window.location.href = 'login.html';
}

/* ----------------------- helpers ----------------------- */
function show(sel){ const n = document.querySelector(sel); if (n) n.style.display = 'block'; }
function hide(sel){ const n = document.querySelector(sel); if (n) n.style.display = 'none'; }
function authed(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = Object.assign(
    { Authorization: `Bearer ${token}` },
    options.headers || {}
  );
  return fetch(url, Object.assign({}, options, { headers }));
}

/* ----------------------- customers ----------------------- */
function fetchCustomers() {
  authed(`${API_BASE}/api/customers`)
    .then(res => res.json())
    .then(customers => renderCustomers(Array.isArray(customers) ? customers : []))
    .catch(() => renderCustomers([]));
}

function renderCustomers(customers) {
  const list = document.getElementById('customerList');
  if (!list) return;
  list.innerHTML = '';

  let total = 0;

  customers.forEach(customer => {
    // normalize amount (some APIs use balance)
    const amt = typeof customer.amount === 'number'
      ? customer.amount
      : (typeof customer.balance === 'number' ? customer.balance : 0);

    total += amt;

    const card = document.createElement('div');
    card.className = 'customer-card';

    const name = document.createElement('h3');
    name.textContent = customer.name;

    const amount = document.createElement('div');
    amount.className = 'amount';
    amount.textContent = `${amt.toFixed(2)} €`;
    if (amt < 0) amount.classList.add('negative');

    const addButtons = document.createElement('div');
    addButtons.className = 'add-buttons';

    // buttons for charges: positive label -> negative transaction
    [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10].forEach(val => {
      const btn = document.createElement('button');
      btn.textContent = `+${val}`;
      btn.onclick = () => updateAmount(customer._id, -Math.abs(val), `Drink ${val}€`);
      addButtons.appendChild(btn);
    });

    // quick -1 (also a charge)
    const minusBtn = document.createElement('button');
    minusBtn.textContent = '-1';
    minusBtn.onclick = () => updateAmount(customer._id, -1, 'Manual charge');
    addButtons.appendChild(minusBtn);

    card.appendChild(name);
    card.appendChild(amount);
    card.appendChild(addButtons);

    // superuser-only actions
    if (localStorage.getItem('role') === 'superuser') {
      const editBtn = document.createElement('button');
      editBtn.textContent = '✏️';
      editBtn.className = 'edit-btn';
      editBtn.onclick = () => editCustomer(customer);

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑️';
      deleteBtn.className = 'delete-btn';
      deleteBtn.onclick = () => deleteCustomer(customer._id);

      card.appendChild(editBtn);
      card.appendChild(deleteBtn);
    }

    list.appendChild(card);
  });

  const totalEl = document.getElementById('totalSession');
  if (totalEl) totalEl.textContent = `Session Total: ${total.toFixed(2)} €`;
}

/* Create a transaction:
   backend expects POST /api/transactions
   body: { customerId, amount, description }
*/
function updateAmount(customerId, amount, description = 'Custom') {
  authed(`${API_BASE}/api/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId, amount, description })
  })
    .then(res => res.ok ? res.json() : res.json().then(e => Promise.reject(e)))
    .then(() => fetchCustomers())
    .catch(err => alert(err.message || 'Failed to add transaction'));
}

function deleteCustomer(id) {
  if (!confirm('Delete this customer? This will remove their transactions too.')) return;

  authed(`${API_BASE}/api/customers/${id}`, { method: 'DELETE' })
    .then(() => fetchCustomers())
    .catch(() => fetchCustomers());
}

function editCustomer(customer) {
  const newName = prompt('Edit name:', customer.name);
  if (!newName) return;

  authed(`${API_BASE}/api/customers/${customer._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName })
  })
    .then(() => fetchCustomers())
    .catch(() => fetchCustomers());
}

/* ----------------------- add customer modal ----------------------- */
function openAddCustomerModal() {
  const m = document.getElementById('add-customer-modal');
  if (m) m.style.display = 'flex';
}

function closeAddCustomerModal() {
  const m = document.getElementById('add-customer-modal');
  const input = document.getElementById('newCustomerName');
  if (m) m.style.display = 'none';
  if (input) input.value = '';
}

function addCustomer() {
  const input = document.getElementById('newCustomerName');
  const name = (input?.value || '').trim();
  if (!name) return alert('Please enter a name');

  authed(`${API_BASE}/api/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  })
    .then(res => res.ok ? res.json() : res.json().then(e => Promise.reject(e)))
    .then(() => { closeAddCustomerModal(); fetchCustomers(); })
    .catch(err => alert(err.message || 'Failed to add customer'));
}

/* ----------------------- receipt modal ----------------------- */
function showReceiptModal() {
  authed(`${API_BASE}/api/customers`)
    .then(res => res.json())
    .then(customers => {
      const tbody = document.getElementById('receipt-body');
      if (!tbody) return;
      tbody.innerHTML = '';
      (customers || []).forEach(c => {
        const amt = typeof c.amount === 'number'
          ? c.amount
          : (typeof c.balance === 'number' ? c.balance : 0);
        const row = document.createElement('tr');
        row.innerHTML = `<td>${escapeHtml(c.name)}</td><td>${amt.toFixed(2)} €</td>`;
        tbody.appendChild(row);
      });
      const m = document.getElementById('receipt-modal');
      if (m) m.style.display = 'flex';
    });
}

function hideReceiptModal() {
  const m = document.getElementById('receipt-modal');
  if (m) m.style.display = 'none';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/* expose for inline handlers (if any) */
window.logout = logout;
window.openAddCustomerModal = openAddCustomerModal;
window.closeAddCustomerModal = closeAddCustomerModal;
window.addCustomer = addCustomer;
window.showReceiptModal = showReceiptModal;
window.hideReceiptModal = hideReceiptModal;
