document.addEventListener("DOMContentLoaded", async () => {
  // Require admin login
  const sess = BXCore.requireAuth({ role: "admin" });
  if (!sess) return;

  const statusEl = document.getElementById("addClientStatus");

  /* ---------------------------------------------------------
     RENDER CLIENTS TABLE
  --------------------------------------------------------- */
  async function renderClients() {
    const data = await BXCore.apiGetAll(true);
    BXCore.updateSidebarStats(data);

    const clients = data.clients || [];
    const projects = data.projects || [];
    const tasks = data.tasks || [];

    const wrapper = document.getElementById("clientsTableWrapper");
    wrapper.innerHTML = "";

    if (!clients.length) {
      wrapper.innerHTML = `<div class="empty">No clients found.</div>`;
      return;
    }

    const tableWrap = document.createElement("div");
    tableWrap.className = "table-wrapper";

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Client</th>
          <th>Username</th>
          <th>Projects</th>
          <th>Tasks</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    clients.forEach((c) => {
      const clientProjects = projects.filter((p) => p.clientId === c.clientId);
      const clientTasks = tasks.filter((t) =>
        clientProjects.some((p) => p.projectId === t.projectId)
      );

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${c.clientName || "—"}</strong></td>
        <td>${c.username || "—"}</td>
        <td>${clientProjects.length}</td>
        <td>${clientTasks.length}</td>
        <td>
          <button class="btn-danger" data-delete="${c.clientId}" style="font-size:0.8rem;padding:0.2rem 0.7rem;">
            <i class="fas fa-trash"></i> Delete
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Delete button handler
    table.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-delete]");
      if (!btn) return;

      const clientId = btn.getAttribute("data-delete");
      if (!confirm("Delete this client and all their projects/tasks?")) return;

      try {
        const resp = await BXCore.apiPost({ action: "deleteClient", clientId });
        if (resp && resp.error) throw new Error(resp.error);

        // Refresh counters & table
        const fresh = await BXCore.apiGetAll(true);
        BXCore.updateSidebarStats(fresh);

        await renderClients();
      } catch (err) {
        console.error(err);
        alert("Failed to delete client.");
      }
    });

    tableWrap.appendChild(table);
    wrapper.appendChild(tableWrap);
  }

  /* ---------------------------------------------------------
     ADD CLIENT HANDLER
  --------------------------------------------------------- */
  document.getElementById("addClientForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (statusEl) statusEl.style.display = "none";

    const fd = new FormData(e.target);

    const clientName = String(fd.get("clientName") || "").trim();
    const username = String(fd.get("username") || "").trim();
    const password = String(fd.get("password") || "").trim();

    if (!clientName || !username || !password) {
      alert("Please fill in all fields.");
      return;
    }

    const clientId = "client_" + Date.now();

    try {
      const resp = await BXCore.apiPost({
        action: "addClient",
        clientId,
        clientName,
        username,
        password
      });

      if (resp && resp.error) throw new Error(resp.error);

      e.target.reset();

      if (statusEl) {
        statusEl.textContent = "Client added successfully.";
        statusEl.style.display = "block";
        setTimeout(() => (statusEl.style.display = "none"), 2000);
      }

      // 🔥 Refresh sidebar counters
      const fresh = await BXCore.apiGetAll(true);
      BXCore.updateSidebarStats(fresh);

      // Refresh table
      await renderClients();
    } catch (err) {
      console.error(err);
      alert("Failed to add client.");
    }
  });

  /* ---------------------------------------------------------
     INITIAL LOAD
  --------------------------------------------------------- */
  renderClients();
});
