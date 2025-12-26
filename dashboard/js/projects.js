
document.addEventListener("DOMContentLoaded", async () => {
  const sess = BXCore.requireAuth({ role: "admin" });
  if (!sess) return;

  const clientFilterRow = document.getElementById("projectsClientRow");
  const clientFilterSelect = document.getElementById("projectsClientSelect");
  const statusFilter = document.getElementById("projectsStatusFilter");
  const addProjectClientSelect = document.getElementById("addProjectClientSelect");
  const projectsList = document.getElementById("projectsList");
  const statusBox = document.getElementById("addProjectStatus");
  const actionStatusEl = document.getElementById("projectsActionStatus");
  const toggleAddProjectBtn = document.getElementById("toggleAddProject");
  const addProjectPanel = document.getElementById("addProjectPanel");
  const openAddProjectInline = document.getElementById("openAddProjectInline");
  const cancelAddProjectBtn = document.getElementById("cancelAddProject");

  const showActionStatus = (message, type = "success") => {
    if (!actionStatusEl) return;
    actionStatusEl.classList.remove("alert-success", "alert-error", "alert-info");
    actionStatusEl.classList.add(`alert-${type}`);
    actionStatusEl.textContent = message;
    actionStatusEl.style.display = "block";
    setTimeout(() => {
      actionStatusEl.style.display = "none";
    }, 2200);
  };

  BXCore.renderSkeleton(projectsList, "card", 3);

  let data;
  try {
    data = await BXCore.apiGetAll();
    BXCore.updateSidebarStats(data);
  } catch (err) {
    console.error(err);
    projectsList.innerHTML =
      '<div class="empty">We could not load projects. Please refresh and try again.</div>';
    showActionStatus("We could not load projects. Please refresh and try again.", "error");
    return;
  }

  let clients = data.clients || [];
  let projects = data.projects || [];
  let tasks = data.tasks || [];
  let projectActionsBound = false;

  function populateClientSelects() {
    clientFilterSelect.innerHTML = '<option value="all">All clients</option>';
    addProjectClientSelect.innerHTML = "";

    clients.forEach((c) => {
      const opt1 = document.createElement("option");
      opt1.value = c.clientId;
      opt1.textContent = c.clientName || c.username || c.clientId;
      clientFilterSelect.appendChild(opt1);

      const opt2 = opt1.cloneNode(true);
      addProjectClientSelect.appendChild(opt2);
    });
  }

  function renderProjects() {
    const clientId = clientFilterSelect.value;
    const status = statusFilter.value;

    projectsList.innerHTML = "";
    let filtered = projects.slice();

    if (clientId !== "all") {
      filtered = filtered.filter((p) => p.clientId === clientId);
    }
    if (status !== "all") {
      filtered = filtered.filter((p) => (p.status || "not-started") === status);
    }

    if (!filtered.length) {
      projectsList.innerHTML = '<div class="empty">No projects match the filter.</div>';
      return;
    }

    filtered.forEach((p) => {
      const pTasks = tasks.filter((t) => t.projectId === p.projectId);
      const progress = BXCore.computeProjectProgress(pTasks);
      const client = clients.find((c) => c.clientId === p.clientId);

      const card = document.createElement("article");
      card.className = "project-card";
      card.dataset.projectId = p.projectId;
      card.innerHTML = `
        <header>
          <div>
            <h3>${p.name || "Untitled project"}</h3>
            <p class="project-desc">${p.description || ""}</p>
            <p class="project-desc" style="font-size:0.8rem;margin-top:0.2rem;">
              Client: <strong>${client?.clientName || client?.username || "Unknown"}</strong>
            </p>
          </div>
          <div class="project-card-actions">
            <span class="badge ${p.status || "in-progress"}">
              ${(p.status || "in-progress").replace("-", " ")}
            </span>
            <div class="project-actions">
              <button class="btn-secondary btn-compact project-edit-toggle" type="button">Edit</button>
              <button class="btn-danger btn-compact project-delete" type="button"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        </header>
        <div class="project-meta">
          <div style="flex:1">
            <progress max="100" value="${progress}"></progress>
          </div>
          <span class="progress-label">${progress}%</span>
          ${
            p.driveLink
              ? `<a class="ghost" href="${p.driveLink}" target="_blank" rel="noopener">Drive</a>`
              : ""
          }
        </div>
        <div class="project-desc" style="font-size:0.8rem;margin-top:0.3rem;">
          ${pTasks.length} tasks
        </div>
        <div class="project-edit" aria-hidden="true">
          <div class="project-edit-title">Edit project</div>
          <div class="project-edit-grid">
            <div class="form-row">
              <label>Name</label>
              <input class="admin-project-name" value="${p.name || ""}" />
            </div>
            <div class="form-row">
              <label>Description</label>
              <textarea class="admin-project-desc" rows="2">${p.description || ""}</textarea>
            </div>
            <div class="form-row">
              <label>Status</label>
              <select class="admin-project-status">
                <option value="not-started" ${p.status === "not-started" ? "selected" : ""}>Not started</option>
                <option value="in-progress" ${p.status === "in-progress" ? "selected" : ""}>In progress</option>
                <option value="completed" ${p.status === "completed" ? "selected" : ""}>Completed</option>
                <option value="blocked" ${p.status === "blocked" ? "selected" : ""}>Blocked</option>
              </select>
            </div>
            <div class="form-row">
              <label>Drive link</label>
              <input class="admin-project-drive" type="url" value="${p.driveLink || ""}" placeholder="https://drive.google.com/..." />
            </div>
          </div>
          <div class="project-edit-actions">
            <div style="flex:1"></div>
            <div class="project-actions">
              <button class="btn-danger admin-project-delete" type="button">Delete</button>
              <button class="btn-secondary admin-project-save" type="button">Save changes</button>
            </div>
          </div>
        </div>
      `;
      projectsList.appendChild(card);
    });

    if (!projectActionsBound) {
      projectActionsBound = true;
      projectsList.addEventListener("click", async (e) => {
        const toggleBtn = e.target.closest(".project-edit-toggle");
        if (toggleBtn) {
          const card = toggleBtn.closest(".project-card");
          if (!card) return;
          const isOpen = card.classList.toggle("is-editing");
          toggleBtn.textContent = isOpen ? "Close" : "Edit";
          const editPanel = card.querySelector(".project-edit");
          if (editPanel) editPanel.setAttribute("aria-hidden", isOpen ? "false" : "true");
          return;
        }

        const saveBtn = e.target.closest(".admin-project-save");
        const deleteBtn = e.target.closest(".admin-project-delete") || e.target.closest(".project-delete");
        if (!saveBtn && !deleteBtn) return;
        const card = e.target.closest(".project-card");
        if (!card) return;
        const projectId = card.dataset.projectId;
        const nameInput = card.querySelector(".admin-project-name");
        const descInput = card.querySelector(".admin-project-desc");
        const statusSelect = card.querySelector(".admin-project-status");
        const driveInput = card.querySelector(".admin-project-drive");

        if (deleteBtn) {
          const confirmDelete = window.confirm("Delete this project? Related tasks will remain but may become orphaned.");
          if (!confirmDelete) return;
          BXCore.setButtonLoading(deleteBtn, true, "Deleting...");
          try {
            await BXCore.apiPost({
              action: "deleteProject",
              projectId,
            });
            data = await BXCore.apiGetAll(true);
            BXCore.updateSidebarStats(data);
            clients = data.clients || [];
            projects = data.projects || [];
            tasks = data.tasks || [];
            renderProjects();
            showActionStatus("Project deleted.", "success");
          } catch (err) {
            console.error(err);
            showActionStatus("Couldn't delete the project. Please try again.", "error");
          } finally {
            BXCore.setButtonLoading(deleteBtn, false);
          }
          return;
        }

        if (!nameInput.value.trim()) {
          showActionStatus("Project name is required.", "error");
          return;
        }

        BXCore.setButtonLoading(saveBtn, true, "Saving...");
        const nextName = nameInput.value.trim();
        const nextDescription = descInput.value.trim();
        const nextStatus = statusSelect.value;
        const nextDriveLink = driveInput.value.trim();
        try {
          await BXCore.apiPost({
            action: "updateProject",
            projectId,
            name: nextName,
            projectName: nextName,
            title: nextName,
            description: nextDescription,
            status: nextStatus,
            driveLink: nextDriveLink,
            updatedAt: new Date().toISOString(),
          });
          data = await BXCore.apiGetAll(true);
          BXCore.updateSidebarStats(data);
          clients = data.clients || [];
          projects = data.projects || [];
          tasks = data.tasks || [];
          renderProjects();
          showActionStatus("Project updated successfully.", "success");
        } catch (err) {
          console.error(err);
          showActionStatus("Couldn't update the project. Please try again.", "error");
        } finally {
          BXCore.setButtonLoading(saveBtn, false);
        }
      });
    }
  }

  clientFilterSelect.addEventListener("change", renderProjects);
  statusFilter.addEventListener("change", renderProjects);

  if (toggleAddProjectBtn && addProjectPanel) {
    toggleAddProjectBtn.addEventListener("click", () => {
      const isCollapsed = addProjectPanel.classList.toggle("is-collapsed");
      toggleAddProjectBtn.textContent = isCollapsed ? "Show" : "Hide";
      addProjectPanel.setAttribute("aria-hidden", isCollapsed ? "true" : "false");
    });
  }

  if (openAddProjectInline && addProjectPanel) {
    openAddProjectInline.addEventListener("click", () => {
      addProjectPanel.classList.remove("is-collapsed");
      addProjectPanel.setAttribute("aria-hidden", "false");
      toggleAddProjectBtn.textContent = "Hide";
      addProjectPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (cancelAddProjectBtn && addProjectPanel) {
    cancelAddProjectBtn.addEventListener("click", () => {
      addProjectPanel.classList.add("is-collapsed");
      addProjectPanel.setAttribute("aria-hidden", "true");
      toggleAddProjectBtn.textContent = "Show";
    });
  }

  document.getElementById("addProjectForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (statusBox) statusBox.style.display = "none";
    const submitBtn = e.target.querySelector("button[type=\"submit\"]");

    const fd = new FormData(e.target);
    const clientId = fd.get("clientId");
    if (!clientId) {
      showActionStatus("Please select a client before saving the project.", "error");
      return;
    }
    BXCore.setButtonLoading(submitBtn, true, "Saving...");

    const projectId = "project_" + Date.now();
    const name = String(fd.get("name") || "").trim();
    const description = String(fd.get("description") || "").trim();
    const status = String(fd.get("status") || "in-progress").trim();
    const driveLink = String(fd.get("driveLink") || "").trim();

    try {
      const resp = await BXCore.apiPost({
        action: "addProject",
        projectId,
        clientId,
        name,
        projectName: name,
        title: name,
        description,
        status,
        driveLink,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      if (resp && resp.error) throw new Error(resp.error);

      e.target.reset();
      if (statusBox) {
        statusBox.textContent = "Project added successfully.";
        statusBox.style.display = "block";
        setTimeout(() => (statusBox.style.display = "none"), 2000);
      }
      showActionStatus("Project saved. The list is refreshed.", "success");

      data = await BXCore.apiGetAll(true);
      BXCore.updateSidebarStats(data);
      clients = data.clients || [];
      projects = data.projects || [];
      tasks = data.tasks || [];

      populateClientSelects();
      renderProjects();
    } catch (err) {
      console.error(err);
      showActionStatus("Couldn't save the project. Please try again.", "error");
    } finally {
      BXCore.setButtonLoading(submitBtn, false);
    }
  });

  populateClientSelects();
  renderProjects();
});
