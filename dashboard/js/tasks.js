
document.addEventListener("DOMContentLoaded", async () => {
  const sess = BXCore.requireAuth();
  if (!sess) return;

  const isAdmin = sess.role === "admin";

  const clientRow = document.getElementById("tasksClientRow");
  const clientSelect = document.getElementById("tasksClientSelect");
  const projectSelect = document.getElementById("tasksProjectSelect");
  const statusFilter = document.getElementById("tasksStatusFilter");
  const addTaskProjectSelect = document.getElementById("addTaskProjectSelect");
  const addTaskStatus = document.getElementById("addTaskStatus");
  const tasksTableWrapper = document.getElementById("tasksTableWrapper");

  let data = await BXCore.apiGetAll(true);
  BXCore.updateSidebarStats(data);

  let clients = data.clients || [];
  let projects = data.projects || [];
  let tasks = data.tasks || [];

  let currentClientId = null;
  let currentProjectId = null;

  if (!isAdmin) {
    if (clientRow) clientRow.style.display = "none";
    const client =
      clients.find((c) => c.clientId === sess.clientId) ||
      clients.find((c) => c.username === sess.username);
    currentClientId = client?.clientId || null;
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

  function renderTasks() {
    tasksTableWrapper.innerHTML = "";

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
      tasksTableWrapper.innerHTML = '<div class="empty">No tasks match the filters.</div>';
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "table-wrapper";
    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Task</th>
          <th>Project</th>
          <th>Status</th>
          <th>Progress</th>
          <th>Due</th>
          <th>Updated</th>
          ${isAdmin ? "<th>Actions</th>" : ""}
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    filtered
      .slice()
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .forEach((t) => {
        const proj = projects.find((p) => p.projectId === t.projectId);
        const tr = document.createElement("tr");
        tr.dataset.taskId = t.taskId;
        tr.innerHTML = `
          <td>${t.title || ""}</td>
          <td>${proj?.name || "—"}</td>
          <td>
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
          </td>
          <td>
            ${
              isAdmin
                ? `<input class="admin-progress" type="number" min="0" max="100" value="${
                    t.progress || 0
                  }" />`
                : `${t.progress || 0}%`
            }
          </td>
          <td>
            ${
              isAdmin
                ? `<input class="admin-dueDate" type="date" value="${t.dueDate || ""}" />`
                : BXCore.formatDate(t.dueDate)
            }
          </td>
          <td>${BXCore.formatDateTime(t.updatedAt)}</td>
          ${
            isAdmin
              ? `<td>
                   <button class="ghost admin-save" type="button">Save</button>
                   <button class="btn-danger admin-delete" type="button">Delete</button>
                 </td>`
              : ""
          }
        `;
        tbody.appendChild(tr);
      });

    if (isAdmin) {
      table.addEventListener("click", async (e) => {
        const row = e.target.closest("tr[data-task-id]");
        if (!row) return;
        const taskId = row.dataset.taskId;

        if (e.target.classList.contains("admin-delete")) {
          if (!confirm("Delete this task?")) return;
          try {
            await BXCore.apiPost({ action: "deleteTask", taskId });
            data = await BXCore.apiGetAll(true);
            BXCore.updateSidebarStats(data);
            projects = data.projects || [];
            tasks = data.tasks || [];
            renderTasks();
          } catch (err) {
            console.error(err);
            alert("Failed to delete task.");
          }
          return;
        }

        if (e.target.classList.contains("admin-save")) {
          const statusSel = row.querySelector(".admin-status");
          const progressInput = row.querySelector(".admin-progress");
          const dueInput = row.querySelector(".admin-dueDate");
          try {
            await BXCore.apiPost({
              action: "updateTask",
              taskId,
              status: statusSel.value,
              progress: Number(progressInput.value || 0),
              dueDate: dueInput.value || "",
              updatedAt: new Date().toISOString(),
            });
            data = await BXCore.apiGetAll(true);
            BXCore.updateSidebarStats(data);
            projects = data.projects || [];
            tasks = data.tasks || [];
            renderTasks();
          } catch (err) {
            console.error(err);
            alert("Failed to update task.");
          }
        }
      });
    }

    wrap.appendChild(table);
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

    const fd = new FormData(e.target);
    const projectId = fd.get("projectId");
    if (!projectId) {
      alert("Select a project.");
      return;
    }

    const taskId = "task_" + Date.now();

    try {
      await BXCore.apiPost({
        action: "addTask",
        taskId,
        projectId,
        title: fd.get("title"),
        description: fd.get("description"),
        status: fd.get("status"),
        progress: Number(fd.get("progress") || 0),
        dueDate: fd.get("dueDate") || "",
        updatedAt: new Date().toISOString(),
      });

      e.target.reset();
      if (addTaskStatus) {
        addTaskStatus.textContent = "Task added successfully.";
        addTaskStatus.style.display = "block";
        setTimeout(() => (addTaskStatus.style.display = "none"), 2000);
      }

      data = await BXCore.apiGetAll(true);
      BXCore.updateSidebarStats(data);
      projects = data.projects || [];
      tasks = data.tasks || [];
      populateProjectSelects();
      renderTasks();
    } catch (err) {
      console.error(err);
      alert("Failed to add task.");
    }
  });

  populateClientSelect();
  populateProjectSelects();
  renderTasks();
});
