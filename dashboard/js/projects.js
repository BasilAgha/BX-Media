
document.addEventListener("DOMContentLoaded", async () => {
  const sess = BXCore.requireAuth({ role: "admin" });
  if (!sess) return;

  const clientFilterRow = document.getElementById("projectsClientRow");
  const clientFilterSelect = document.getElementById("projectsClientSelect");
  const statusFilter = document.getElementById("projectsStatusFilter");
  const addProjectClientSelect = document.getElementById("addProjectClientSelect");
  const projectsList = document.getElementById("projectsList");
  const statusBox = document.getElementById("addProjectStatus");

  let data = await BXCore.apiGetAll(true);
  BXCore.updateSidebarStats(data);

  let clients = data.clients || [];
  let projects = data.projects || [];
  let tasks = data.tasks || [];

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
      card.innerHTML = `
        <header>
          <div>
            <h3>${p.name || "Untitled project"}</h3>
            <p class="project-desc">${p.description || ""}</p>
            <p class="project-desc" style="font-size:0.8rem;margin-top:0.2rem;">
              Client: <strong>${client?.clientName || client?.username || "—"}</strong>
            </p>
          </div>
          <span class="badge ${p.status || "in-progress"}">
            ${(p.status || "in-progress").replace("-", " ")}
          </span>
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
      `;
      projectsList.appendChild(card);
    });
  }

  clientFilterSelect.addEventListener("change", renderProjects);
  statusFilter.addEventListener("change", renderProjects);

  document.getElementById("addProjectForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (statusBox) statusBox.style.display = "none";

    const fd = new FormData(e.target);
    const clientId = fd.get("clientId");
    if (!clientId) {
      alert("Select a client.");
      return;
    }

    const projectId = "project_" + Date.now();

    try {
      const resp = await BXCore.apiPost({
        action: "addProject",
        projectId,
        clientId,
        name: fd.get("name"),
        description: fd.get("description"),
        status: fd.get("status"),
        driveLink: fd.get("driveLink"),
      });
      if (resp && resp.error) throw new Error(resp.error);

      e.target.reset();
      if (statusBox) {
        statusBox.textContent = "Project added successfully.";
        statusBox.style.display = "block";
        setTimeout(() => (statusBox.style.display = "none"), 2000);
      }

      data = await BXCore.apiGetAll(true);
      BXCore.updateSidebarStats(data);
      clients = data.clients || [];
      projects = data.projects || [];
      tasks = data.tasks || [];

      populateClientSelects();
      renderProjects();
    } catch (err) {
      console.error(err);
      alert("Failed to add project.");
    }
  });

  populateClientSelects();
  renderProjects();
});
