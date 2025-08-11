document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // Show superuser-only tools
  if (role === "superuser") {
    document.getElementById("admin-links").style.display = "block";
    document.getElementById("add-customer-block").style.display = "block";
  }

  document.getElementById("user-role").textContent = `Logged in as: ${role}`;
  fetchCustomers();
});

function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}

function fetchCustomers() {
  fetch("/api/customers", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  })
    .then(res => res.json())
    .then(customers => renderCustomers(customers));
}

function renderCustomers(customers) {
  const list = document.getElementById("customerList");
  list.innerHTML = "";

  let total = 0;

  customers.forEach(customer => {
    const card = document.createElement("div");
    card.className = "customer-card";

    const name = document.createElement("h3");
    name.textContent = customer.name;

    const amount = document.createElement("div");
    amount.className = "amount";
    amount.textContent = `${customer.amount.toFixed(2)} €`;
    if (customer.amount < 0) amount.classList.add("negative");

    total += customer.amount;

    const addButtons = document.createElement("div");
    addButtons.className = "add-buttons";

    [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10].forEach(val => {
      const btn = document.createElement("button");
      btn.textContent = `+${val}`;
      btn.onclick = () => updateAmount(customer._id, val);
      addButtons.appendChild(btn);
    });

    const minusBtn = document.createElement("button");
    minusBtn.textContent = "-1";
    minusBtn.onclick = () => updateAmount(customer._id, -1);
    addButtons.appendChild(minusBtn);

    card.appendChild(name);
    card.appendChild(amount);
    card.appendChild(addButtons);

    // Superuser-only buttons
    if (localStorage.getItem("role") === "superuser") {
      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️";
      editBtn.className = "edit-btn";
      editBtn.onclick = () => editCustomer(customer);

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️";
      deleteBtn.className = "delete-btn";
      deleteBtn.onclick = () => deleteCustomer(customer._id);

      card.appendChild(editBtn);
      card.appendChild(deleteBtn);
    }

    list.appendChild(card);
  });

  document.getElementById("totalSession").textContent = `Session Total: ${total.toFixed(2)} €`;
}

function updateAmount(id, amount) {
  fetch(`/api/transactions/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify({ amount })
  })
    .then(res => res.json())
    .then(() => fetchCustomers());
}

function deleteCustomer(id) {
  if (!confirm("Delete this customer?")) return;

  fetch(`/api/customers/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  }).then(() => fetchCustomers());
}

function editCustomer(customer) {
  const newName = prompt("Edit name:", customer.name);
  if (!newName) return;

  fetch(`/api/customers/${customer._id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify({ name: newName })
  }).then(() => fetchCustomers());
}

// Add Customer Modal Logic
function openAddCustomerModal() {
  document.getElementById("add-customer-modal").style.display = "flex";
}

function closeAddCustomerModal() {
  document.getElementById("add-customer-modal").style.display = "none";
  document.getElementById("newCustomerName").value = "";
}

function addCustomer() {
  const name = document.getElementById("newCustomerName").value;
  if (!name.trim()) return alert("Please enter a name");

  fetch("/api/customers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify({ name })
  })
    .then(res => res.json())
    .then(() => {
      closeAddCustomerModal();
      fetchCustomers();
    });
}

// Receipt modal logic
function showReceiptModal() {
  fetch("/api/customers", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  })
    .then(res => res.json())
    .then(customers => {
      const tbody = document.getElementById("receipt-body");
      tbody.innerHTML = "";
      customers.forEach(c => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${c.name}</td><td>${c.amount.toFixed(2)} €</td>`;
        tbody.appendChild(row);
      });
      document.getElementById("receipt-modal").style.display = "flex";
    });
}

function hideReceiptModal() {
  document.getElementById("receipt-modal").style.display = "none";
}
                                