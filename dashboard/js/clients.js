document.addEventListener("DOMContentLoaded", async () => {
  // Require admin login
  const sess = BXCore.requireAuth({ role: "admin" });
  if (!sess) return;

  const statusEl = document.getElementById("addClientStatus");
  const actionStatusEl = document.getElementById("clientsActionStatus");
  const clientsTableWrapper = document.getElementById("clientsTableWrapper");
  const detailModal = document.getElementById("clientDetailModal");
  const detailClose = document.getElementById("clientModalClose");
  const detailBody = document.getElementById("clientModalBody");
  const detailTitle = document.getElementById("clientModalTitle");
  const detailSubtitle = document.getElementById("clientModalSubtitle");

  let data = null;
  let clients = [];
  let projects = [];
  let tasks = [];
  let actionsBound = false;
  let modalActionsBound = false;

  const showActionStatus = (message, type = "success") => {
    if (!actionStatusEl) return;
    actionStatusEl.classList.remove("alert-success", "alert-error", "alert-info");
    actionStatusEl.classList.add(`alert-${type}`);
    actionStatusEl.textContent = message;
    actionStatusEl.style.display = "block";
  };

  /* ---------------------------------------------------------
     RENDER CLIENTS TABLE
  --------------------------------------------------------- */
  async function renderClients() {
    if (!clientsTableWrapper) return;
    BXCore.renderSkeleton(clientsTableWrapper, "table", 1);

    try {
      data = await BXCore.apiGetAll();
      BXCore.updateSidebarStats(data);
    } catch (err) {
      console.error(err);
      clientsTableWrapper.innerHTML =
        '<div class="empty">We could not load clients. Please refresh and try again.</div>';
      showActionStatus("We could not load clients. Please refresh and try again.", "error");
      return;
    }

    clients = BXCore.validateClientsSchema(data.clients || []);
    projects = data.projects || [];
    tasks = data.tasks || [];

    clientsTableWrapper.innerHTML = "";

    if (!clients.length) {
      clientsTableWrapper.innerHTML = '<div class="empty">No clients found.</div>';
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
          <th>Status</th>
          <th>Projects</th>
          <th>Tasks</th>
          <th>Manage</th>
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
        <td><strong>${c.clientName || "Unknown"}</strong></td>
        <td>${c.username || "Unknown"}</td>
        <td><span class="badge ${c.status || "active"}">${(c.status || "active").replace("-", " ")}</span></td>
        <td>${clientProjects.length}</td>
        <td>${clientTasks.length}</td>
        <td>
          <button class="btn-secondary btn-compact" data-manage="${c.clientId}">
            <i class="fas fa-gear"></i> Manage
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Delete button handler
    tableWrap.appendChild(table);
    clientsTableWrapper.appendChild(tableWrap);
  }

  function renderClientDetail(client, clientProjects, clientTasks, options = {}) {
    if (!detailModal || !detailBody) return;
    if (!client) return;

    const completed = clientTasks.filter((t) => t.status === "completed").length;
    const inProgress = clientTasks.filter((t) => t.status === "in-progress").length;
    const blocked = clientTasks.filter((t) => t.status === "blocked").length;
    const clientStatus = client.status || "active";

    if (detailTitle) detailTitle.textContent = client.clientName || client.username || "Client";
    if (detailSubtitle)
      detailSubtitle.textContent = `${clientProjects.length} projects, ${clientTasks.length} tasks for this client.`;

    detailBody.innerHTML = `
      <div class="client-summary-grid">
        <div class="client-summary-card">
          <span>Projects</span>
          <strong>${clientProjects.length}</strong>
        </div>
        <div class="client-summary-card">
          <span>Tasks</span>
          <strong>${clientTasks.length}</strong>
        </div>
        <div class="client-summary-card">
          <span>In progress</span>
          <strong>${inProgress}</strong>
        </div>
        <div class="client-summary-card">
          <span>Completed</span>
          <strong>${completed}</strong>
        </div>
        <div class="client-summary-card">
          <span>Blocked</span>
          <strong>${blocked}</strong>
        </div>
        <div class="client-summary-card">
          <span>Status</span>
          <strong>${clientStatus}</strong>
        </div>
      </div>
      <div class="client-lists">
        <div class="client-list">
          <h3>Projects</h3>
          ${
            clientProjects.length
              ? `<ul>${clientProjects
                  .map(
                    (p) =>
                      `<li><span>${p.name || "Untitled"}</span><span class="badge ${p.status ||
                        "not-started"}">${(p.status || "not-started").replace("-", " ")}</span></li>`
                  )
                  .join("")}</ul>`
              : "<p class='empty'>No projects yet.</p>"
          }
        </div>
        <div class="client-list">
          <h3>Tasks</h3>
          ${
            clientTasks.length
              ? `<ul>${clientTasks
                  .slice(0, 10)
                  .map(
                    (t) =>
                      `<li><span>${t.title || "Untitled task"}</span><span class="badge ${t.status ||
                        "not-started"}">${(t.status || "not-started").replace("-", " ")}</span></li>`
                  )
                  .join("")}</ul>
                  ${clientTasks.length > 10 ? `<p class="helper">${clientTasks.length - 10} more tasks not shown.</p>` : ""}
                  `
              : "<p class='empty'>No tasks yet.</p>"
          }
        </div>
      </div>
      <div class="client-admin">
        <div class="client-admin-header">
          <div>
            <h3>Client access</h3>
            <p class="helper">Update name, login, or status. Leave password blank to keep it.</p>
          </div>
          <button type="button" class="btn-danger btn-compact" data-client-delete="${client.clientId}">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
        <div id="clientEditStatus" class="alert alert-info" style="display:none"></div>
        <form id="clientEditForm" class="form-grid" data-client-id="${client.clientId}">
          <div class="client-admin-grid">
            <div class="form-row">
              <label for="editClientName">Client name</label>
              <input id="editClientName" name="clientName" value="${client.clientName || ""}" required />
            </div>
            <div class="form-row">
              <label for="editClientUsername">Username</label>
              <input id="editClientUsername" name="username" value="${client.username || ""}" required />
            </div>
            <div class="form-row">
              <label for="editClientPassword">Password</label>
              <input id="editClientPassword" name="password" type="password" value="" placeholder="Leave blank to keep current" />
            </div>
            <div class="form-row">
              <label for="editClientStatus">Status</label>
              <select id="editClientStatus" name="status">
                <option value="active" ${clientStatus === "active" ? "selected" : ""}>Active</option>
                <option value="inactive" ${clientStatus === "inactive" ? "selected" : ""}>Inactive</option>
                <option value="blocked" ${clientStatus === "blocked" ? "selected" : ""}>Blocked</option>
                <option value="archived" ${clientStatus === "archived" ? "selected" : ""}>Archived</option>
              </select>
            </div>
          </div>
          <div class="client-admin-actions">
            <button type="submit" class="btn-primary btn-compact">
              <i class="fas fa-save"></i> Save changes
            </button>
          </div>
        </form>
      </div>
    `;

    detailModal.classList.add("is-open");
    detailModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    if (options.focusEdit) {
      const focusInput = detailBody.querySelector("#editClientName");
      if (focusInput) setTimeout(() => focusInput.focus(), 0);
    }
  }

  function closeDetailModal() {
    if (!detailModal) return;
    detailModal.classList.remove("is-open");
    detailModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  /* ---------------------------------------------------------
     ADD CLIENT HANDLER
  --------------------------------------------------------- */
  document.getElementById("addClientForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (statusEl) statusEl.style.display = "none";
    const submitBtn = e.target.querySelector("button[type=\"submit\"]");

    const fd = new FormData(e.target);

    const clientName = String(fd.get("clientName") || "").trim();
    const username = String(fd.get("username") || "").trim();
    const password = String(fd.get("password") || "").trim();

    if (!clientName || !username || !password) {
      showActionStatus("Please complete all fields to add a client.", "error");
      return;
    }
    BXCore.setButtonLoading(submitBtn, true, "Saving...");

    const clientId = "client_" + Date.now();

    try {
      const resp = await BXCore.apiPost({
        action: "addClient",
        clientId,
        clientName,
        username,
        password,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (resp && resp.error) throw new Error(resp.error);

      e.target.reset();

      if (statusEl) {
        statusEl.textContent = "Client added successfully.";
        statusEl.style.display = "block";
        setTimeout(() => (statusEl.style.display = "none"), 2000);
      }
      showActionStatus("Client added. You can assign projects now.", "success");

      // Refresh sidebar counters
      const fresh = await BXCore.apiGetAll(true);
      BXCore.updateSidebarStats(fresh);

      // Refresh table
      await renderClients();
    } catch (err) {
      console.error(err);
      showActionStatus("Couldn't add the client. Please try again.", "error");
    } finally {
      BXCore.setButtonLoading(submitBtn, false);
    }
  });

  /* ---------------------------------------------------------
     INITIAL LOAD
  --------------------------------------------------------- */
  renderClients();

  if (detailClose && detailModal) {
    detailClose.addEventListener("click", closeDetailModal);
    const backdrop = detailModal.querySelector(".modal-backdrop");
    if (backdrop) backdrop.addEventListener("click", closeDetailModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && detailModal.classList.contains("is-open")) closeDetailModal();
    });
  }

  if (detailModal && !modalActionsBound) {
    modalActionsBound = true;
    detailModal.addEventListener("click", async (e) => {
      const deleteBtn = e.target.closest("button[data-client-delete]");
      if (!deleteBtn) return;
      const clientId = deleteBtn.getAttribute("data-client-delete");
      if (!clientId) return;

      const confirmDelete = window.confirm(
        "Delete this client? Projects and tasks will remain but may become orphaned."
      );
      if (!confirmDelete) return;

      BXCore.setButtonLoading(deleteBtn, true, "Deleting...");
      try {
        await BXCore.apiPost({
          action: "deleteClient",
          clientId,
        });
        data = await BXCore.apiGetAll(true);
        BXCore.updateSidebarStats(data);
        clients = BXCore.validateClientsSchema(data.clients || []);
        projects = data.projects || [];
        tasks = data.tasks || [];
        await renderClients();
        closeDetailModal();
        showActionStatus("Client deleted.", "success");
      } catch (err) {
        console.error(err);
        showActionStatus("Couldn't delete the client. Please try again.", "error");
      } finally {
        BXCore.setButtonLoading(deleteBtn, false);
      }
    });

    detailModal.addEventListener("submit", async (e) => {
      const form = e.target.closest("#clientEditForm");
      if (!form) return;
      e.preventDefault();

      const statusEl = form.querySelector("#clientEditStatus");
      if (statusEl) statusEl.style.display = "none";
      const submitBtn = form.querySelector("button[type=\"submit\"]");

      const fd = new FormData(form);
      const clientId = form.dataset.clientId;
      const clientName = String(fd.get("clientName") || "").trim();
      const username = String(fd.get("username") || "").trim();
      const passwordRaw = String(fd.get("password") || "").trim();
      const password = passwordRaw ? passwordRaw : undefined;
      const status = String(fd.get("status") || "active").trim();

      if (!clientName || !username) {
        if (statusEl) {
          statusEl.className = "alert alert-error";
          statusEl.textContent = "Client name and username are required.";
          statusEl.style.display = "block";
        }
        return;
      }

      BXCore.setButtonLoading(submitBtn, true, "Saving...");
      try {
        await BXCore.apiPost({
          action: "updateClient",
          clientId,
          clientName,
          username,
          password,
          status,
          updatedAt: new Date().toISOString(),
        });
        data = await BXCore.apiGetAll(true);
        BXCore.updateSidebarStats(data);
        clients = BXCore.validateClientsSchema(data.clients || []);
        projects = data.projects || [];
        tasks = data.tasks || [];
        await renderClients();
        if (statusEl) {
          statusEl.className = "alert alert-success";
          statusEl.textContent = "Client updated successfully.";
          statusEl.style.display = "block";
        }
      } catch (err) {
        console.error(err);
        if (statusEl) {
          statusEl.className = "alert alert-error";
          statusEl.textContent = "Couldn't update the client. Please try again.";
          statusEl.style.display = "block";
        }
      } finally {
        BXCore.setButtonLoading(submitBtn, false);
      }
    });
  }

  if (clientsTableWrapper && !actionsBound) {
    actionsBound = true;
    clientsTableWrapper.addEventListener("click", async (e) => {
      const manageBtn = e.target.closest("button[data-manage]");

      if (manageBtn) {
        const clientId = manageBtn.getAttribute("data-manage");
        const client = clients.find((c) => c.clientId === clientId);
        const clientProjects = projects.filter((p) => p.clientId === clientId);
        const clientTasks = tasks.filter((t) =>
          clientProjects.some((p) => p.projectId === t.projectId)
        );
        renderClientDetail(client, clientProjects, clientTasks, { focusEdit: true });
      }
    });
  }
});
