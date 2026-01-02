
document.addEventListener("DOMContentLoaded", async () => {
  const sess = BXCore.requireAuth({ role: "admin" });
  if (!sess) return;

  const isAdmin = sess.role === "admin";

  const clientRow = document.getElementById("tasksClientRow");
  const clientSelect = document.getElementById("tasksClientSelect");
  const projectSelect = document.getElementById("tasksProjectSelect");
  const statusFilter = document.getElementById("tasksStatusFilter");
  const addTaskProjectSelect = document.getElementById("addTaskProjectSelect");
  const addTaskStatus = document.getElementById("addTaskStatus");
  const tasksTableWrapper = document.getElementById("tasksTableWrapper");
  const actionStatusEl = document.getElementById("tasksActionStatus");
  const toggleAddTaskBtn = document.getElementById("toggleAddTask");
  const addTaskPanel = document.getElementById("addTaskPanel");
  const openAddTaskInline = document.getElementById("openAddTaskInline");
  const cancelAddTaskBtn = document.getElementById("cancelAddTask");

  const showActionStatus = (message, type = "success") => {
    if (!actionStatusEl) return;
    actionStatusEl.classList.remove("alert-success", "alert-error", "alert-info");
    actionStatusEl.classList.add(`alert-${type}`);
    actionStatusEl.textContent = message;
    actionStatusEl.style.display = "block";
    BXCore.showToast(message, type);
    setTimeout(() => {
      actionStatusEl.style.display = "none";
    }, 2200);
  };

  BXCore.renderSkeleton(tasksTableWrapper, "table", 1);

  let data;
  try {
    data = await BXCore.apiGetAll();
    BXCore.updateSidebarStats(data);
  } catch (err) {
    console.error(err);
    tasksTableWrapper.innerHTML =
      '<div class="empty">We could not load tasks. Please refresh and try again.</div>';
    showActionStatus("We could not load tasks. Please refresh and try again.", "error");
    return;
  }

  let clients = data.clients || [];
  let projects = data.projects || [];
  let tasks = data.tasks || [];

  let currentClientId = null;
  let currentProjectId = null;
  const quickProjectId = new URLSearchParams(window.location.search).get("projectId");

  if (!isAdmin) {
    if (clientRow) clientRow.style.display = "none";
    const client =
      clients.find((c) => c.clientId === sess.clientId) ||
      clients.find((c) => c.username === sess.username);
    currentClientId = client?.clientId || null;
  }

  if (toggleAddTaskBtn && addTaskPanel) {
    toggleAddTaskBtn.addEventListener("click", () => {
      const isCollapsed = addTaskPanel.classList.toggle("is-collapsed");
      toggleAddTaskBtn.textContent = isCollapsed ? "Show" : "Hide";
      addTaskPanel.setAttribute("aria-hidden", isCollapsed ? "true" : "false");
    });
  }

  if (openAddTaskInline && addTaskPanel) {
    openAddTaskInline.addEventListener("click", () => {
      addTaskPanel.classList.remove("is-collapsed");
      addTaskPanel.setAttribute("aria-hidden", "false");
      if (toggleAddTaskBtn) toggleAddTaskBtn.textContent = "Hide";
      addTaskPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (cancelAddTaskBtn && addTaskPanel) {
    cancelAddTaskBtn.addEventListener("click", () => {
      addTaskPanel.classList.add("is-collapsed");
      addTaskPanel.setAttribute("aria-hidden", "true");
      if (toggleAddTaskBtn) toggleAddTaskBtn.textContent = "Show";
    });
  }

  function getVisibleProjects() {
    let list = projects.slice();
    if (currentClientId) {
      list = list.filter((p) => p.clientId === currentClientId);
    }
    return list;
  }

  function populateClientSelect() {
    if (!isAdmin) return;
    clientSelect.innerHTML = '<option value="all">All clients</option>';
    clients.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.clientId;
      opt.textContent = c.clientName || c.username || c.clientId;
      clientSelect.appendChild(opt);
    });
  }

  function populateProjectSelects() {
    const visibleProjects = getVisibleProjects();

    projectSelect.innerHTML = '<option value="all">All projects</option>';
    visibleProjects.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.projectId;
      opt.textContent = p.name || p.projectId;
      projectSelect.appendChild(opt);
    });

    addTaskProjectSelect.innerHTML = "";
    visibleProjects.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.projectId;
      opt.textContent = p.name || p.projectId;
      addTaskProjectSelect.appendChild(opt);
    });
  }

  function buildProjectOptions(selectedId) {
    return projects
      .map(
        (p) =>
          `<option value="${p.projectId}" ${p.projectId === selectedId ? "selected" : ""}>${
            p.name || p.projectId
          }</option>`
      )
      .join("");
  }
  function getClientNameForTask(task) {
    const project = projects.find((p) => p.projectId === task.projectId);
    if (!project) return "Unknown client";
    const client = clients.find((c) => c.clientId === project.clientId);
    return client?.clientName || client?.username || client?.clientId || "Unknown client";
  }

  function getProjectNameForTask(task) {
    const project = projects.find((p) => p.projectId === task.projectId);
    return project?.name || project?.projectId || "Unknown project";
  }

  function renderTasks() {
    tasksTableWrapper.innerHTML = "";

    if (!tasks.length) {
      tasksTableWrapper.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fas fa-list-check"></i></div>
          <div>
            <h3>No tasks yet</h3>
            <p>Create the first task to start tracking delivery.</p>
            <button class="btn-primary" type="button" id="emptyAddTask">
              <i class="fas fa-plus"></i> Add task
            </button>
          </div>
        </div>
      `;
      const emptyAddBtn = document.getElementById("emptyAddTask");
      if (emptyAddBtn) {
        emptyAddBtn.addEventListener("click", () => {
          if (!addTaskPanel) return;
          addTaskPanel.classList.remove("is-collapsed");
          addTaskPanel.setAttribute("aria-hidden", "false");
          if (toggleAddTaskBtn) toggleAddTaskBtn.textContent = "Hide";
          addTaskPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
      return;
    }

    let filtered = tasks.slice();
    if (currentClientId) {
      const projIds = getVisibleProjects().map((p) => p.projectId);
      filtered = filtered.filter((t) => projIds.includes(t.projectId));
    }
    if (projectSelect.value !== "all") {
      filtered = filtered.filter((t) => t.projectId === projectSelect.value);
    }
    if (statusFilter.value !== "all") {
      filtered = filtered.filter((t) => (t.status || "not-started") === statusFilter.value);
    }

    if (!filtered.length) {
      tasksTableWrapper.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fas fa-list-check"></i></div>
          <div>
            <h3>No tasks match the filters</h3>
            <p>Adjust filters or create a new task.</p>
          </div>
        </div>
      `;
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "task-cards";

    filtered
      .slice()
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .forEach((t) => {
        const clientName = getClientNameForTask(t);
        const projectName = getProjectNameForTask(t);
        const card = document.createElement("article");
        card.className = "task-card";
        card.dataset.taskId = t.taskId;
        card.innerHTML = `
          <header class="task-card-header">
            <div>
              <h3>${t.title || "Untitled task"}</h3>
              <p class="task-card-meta">
                <span>${projectName}</span>
                <span class="task-card-sep">&gt;</span>
                <span>${clientName}</span>
              </p>
            </div>
            <div>
              ${
                isAdmin
                  ? `<select class="admin-status">
                       <option value="not-started" ${t.status === "not-started" ? "selected" : ""}>Not started</option>
                       <option value="in-progress" ${t.status === "in-progress" ? "selected" : ""}>In progress</option>
                       <option value="completed" ${t.status === "completed" ? "selected" : ""}>Completed</option>
                       <option value="blocked" ${t.status === "blocked" ? "selected" : ""}>Blocked</option>
                     </select>`
                  : `<span class="badge ${t.status || "not-started"}">${
                      (t.status || "not-started").replace("-", " ")
                    }</span>`
              }
            </div>
          </header>
          <div class="task-card-grid">
            <div class="form-row">
              <label>Project</label>
              ${
                isAdmin
                  ? `<select class="admin-project">
                       ${buildProjectOptions(t.projectId)}
                     </select>`
                  : `<div class="task-static">${projectName}</div>`
              }
            </div>
            <div class="form-row">
              <label>Progress</label>
              ${
                isAdmin
                  ? `<input class="admin-progress" type="number" min="0" max="100" value="${
                      t.progress || 0
                    }" />`
                  : `<div class="task-static">${t.progress || 0}%</div>`
              }
            </div>
            <div class="form-row">
              <label>Due date</label>
              ${
                isAdmin
                  ? `<input class="admin-dueDate" type="date" value="${t.dueDate || ""}" />`
                  : `<div class="task-static">${BXCore.formatDate(t.dueDate) || "TBD"}</div>`
              }
            </div>
            <div class="form-row">
              <label>Updated</label>
              <div class="task-static">${BXCore.formatDateTime(t.updatedAt)}</div>
            </div>
          </div>
          ${
            isAdmin
              ? `<div class="task-card-actions">
                   <button class="ghost admin-save" type="button">Save</button>
                   <button class="btn-danger admin-delete" type="button">Delete</button>
                 </div>`
              : ""
          }
        `;
        wrap.appendChild(card);
      });

    if (isAdmin) {
      wrap.addEventListener("click", async (e) => {
        const card = e.target.closest("article.task-card");
        if (!card) return;
        const taskId = card.dataset.taskId;

      if (e.target.classList.contains("admin-delete")) {
        const confirmDelete = await BXCore.confirmAction({
          title: "Delete task?",
          message: "This will permanently remove the task from the project.",
          confirmLabel: "Delete task",
          tone: "danger",
        });
        if (!confirmDelete) return;
        BXCore.setButtonLoading(e.target, true, "Deleting...");
        try {
          const resp = await BXCore.apiPost({ action: "deleteTask", taskId });
          if (!resp.ok) throw new Error(resp.error || "Delete failed");
          data = await BXCore.apiGetAll(true);
          BXCore.updateSidebarStats(data);
          projects = data.projects || [];
          tasks = data.tasks || [];
          renderTasks();
          showActionStatus("Task removed. The list is up to date.", "success");
        } catch (err) {
          console.error(err);
          showActionStatus("Couldn't delete the task. Please try again.", "error");
        } finally {
          BXCore.setButtonLoading(e.target, false);
        }
        return;
      }

      if (e.target.classList.contains("admin-save")) {
        const projectSel = card.querySelector(".admin-project");
        const statusSel = card.querySelector(".admin-status");
        const progressInput = card.querySelector(".admin-progress");
        const dueInput = card.querySelector(".admin-dueDate");
        BXCore.setButtonLoading(e.target, true, "Saving...");
        try {
          const resp = await BXCore.apiPost({
            action: "updateTask",
            taskId,
            projectId: projectSel.value,
            status: statusSel.value,
            progress: Number(progressInput.value || 0),
            dueDate: dueInput.value || "",
            updatedAt: new Date().toISOString(),
          });
          if (!resp.ok) throw new Error(resp.error || "Update failed");
          data = await BXCore.apiGetAll(true);
          BXCore.updateSidebarStats(data);
          projects = data.projects || [];
          tasks = data.tasks || [];
          renderTasks();
          showActionStatus("Task updated successfully.", "success");
        } catch (err) {
          console.error(err);
          showActionStatus("Couldn't update the task. Please try again.", "error");
        } finally {
          BXCore.setButtonLoading(e.target, false);
        }
      }
    });
  }

    tasksTableWrapper.appendChild(wrap);
  }

  clientSelect.addEventListener("change", () => {
    currentClientId = clientSelect.value === "all" ? null : clientSelect.value;
    populateProjectSelects();
    renderTasks();
  });

  projectSelect.addEventListener("change", () => {
    currentProjectId = projectSelect.value === "all" ? null : projectSelect.value;
    renderTasks();
  });

  statusFilter.addEventListener("change", renderTasks);

  document.getElementById("addTaskForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (addTaskStatus) addTaskStatus.style.display = "none";
    const submitBtn = e.target.querySelector("button[type=\"submit\"]");

    const fd = new FormData(e.target);
    const projectId = fd.get("projectId");
    if (!projectId) {
      showActionStatus("Please select a project before adding a task.", "error");
      return;
    }
    BXCore.setButtonLoading(submitBtn, true, "Saving...");

    const taskId = "task_" + Date.now();
    const title = String(fd.get("title") || "").trim();
    const description = String(fd.get("description") || "").trim();
    const status = String(fd.get("status") || "in-progress").trim();
    const progress = Number(fd.get("progress") || 0);
    const dueDate = String(fd.get("dueDate") || "");

    try {
      const resp = await BXCore.apiPost({
        action: "addTask",
        taskId,
        projectId,
        title,
        description,
        status,
        progress: Number.isFinite(progress) ? progress : 0,
        dueDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      if (!resp.ok) throw new Error(resp.error || "Create failed");

      e.target.reset();
      if (addTaskStatus) {
        addTaskStatus.textContent = "Task added successfully.";
        addTaskStatus.style.display = "block";
        setTimeout(() => (addTaskStatus.style.display = "none"), 2000);
      }
      showActionStatus("Task saved. The list is refreshed.", "success");

      data = await BXCore.apiGetAll(true);
      BXCore.updateSidebarStats(data);
      projects = data.projects || [];
      tasks = data.tasks || [];
      populateProjectSelects();
      renderTasks();
    } catch (err) {
      console.error(err);
      showActionStatus("Couldn't save the task. Please try again.", "error");
    } finally {
      BXCore.setButtonLoading(submitBtn, false);
    }
  });

  populateClientSelect();
  populateProjectSelects();

  if (quickProjectId) {
    const quickProject = projects.find((p) => p.projectId === quickProjectId);
    if (quickProject) {
      projectSelect.value = quickProjectId;
      addTaskProjectSelect.value = quickProjectId;
      if (addTaskPanel) {
        addTaskPanel.classList.remove("is-collapsed");
        addTaskPanel.setAttribute("aria-hidden", "false");
        if (toggleAddTaskBtn) toggleAddTaskBtn.textContent = "Hide";
        addTaskPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  renderTasks();
});
