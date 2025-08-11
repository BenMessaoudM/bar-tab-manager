document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || role !== "superuser") {
    alert("Access denied");
    window.location.href = "dashboard.html";
    return;
  }

  fetchUsers();
});

function fetchUsers() {
  fetch("/api/users", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  })
    .then(res => res.json())
    .then(users => renderUsers(users));
}

function renderUsers(users) {
  const list = document.getElementById("userList");
  list.innerHTML = "";

  users.forEach(user => {
    const row = document.createElement("tr");

    const usernameTd = document.createElement("td");
    usernameTd.textContent = user.username;

    const roleTd = document.createElement("td");
    roleTd.textContent = user.role;

    const actionTd = document.createElement("td");

    if (user._id !== localStorage.getItem("userId")) {
      const toggleBtn = document.createElement("button");
      toggleBtn.textContent = "Toggle Role";
      toggleBtn.onclick = () => toggleRole(user._id);
      actionTd.appendChild(toggleBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.style.marginLeft = "8px";
      deleteBtn.onclick = () => deleteUser(user._id);
      actionTd.appendChild(deleteBtn);
    } else {
      actionTd.textContent = "You";
    }

    row.appendChild(usernameTd);
    row.appendChild(roleTd);
    row.appendChild(actionTd);
    list.appendChild(row);
  });
}

function toggleRole(userId) {
  fetch(`/api/users/${userId}/role`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  })
    .then(() => fetchUsers());
}

function deleteUser(userId) {
  if (!confirm("Delete this user?")) return;

  fetch(`/api/users/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  })
    .then(() => fetchUsers());
}
