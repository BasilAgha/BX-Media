
document.addEventListener("DOMContentLoaded", async () => {
  const sess = BXCore.requireAuth();
  if (!sess) return;

  const titleEl = document.getElementById("overviewTitle");
  const subtitleEl = document.getElementById("overviewSubtitle");
  const summaryEl = document.getElementById("overviewSummary");
  const projectsEl = document.getElementById("overviewProjects");
  const tasksEl = document.getElementById("overviewTasks");

  try {
    const data = await BXCore.apiGetAll(true);
    BXCore.updateSidebarStats(data);

    const clients = data.clients || [];
    const projects = data.projects || [];
    const tasks = data.tasks || [];

    if (sess.role === "admin") {
      if (titleEl) titleEl.textContent = "Project control center";
      if (subtitleEl)
        subtitleEl.textContent = "High-level view of all clients, projects, and task progress.";

      const summary = BXCore.computeSummary(tasks);
      summaryEl.innerHTML = "";
      const cards = [
        ["Total projects", projects.length],
        ["Total tasks", summary.total],
        ["In progress", summary.inProgress],
        ["Completed", summary.completed],
        ["Not started", summary.notStarted],
      ];
      cards.forEach(([label, value]) => {
        const div = document.createElement("div");
        div.className = "summary-card";
        div.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
        summaryEl.appendChild(div);
      });

      projectsEl.innerHTML = "";
      if (!projects.length) {
        projectsEl.innerHTML = `<div class="empty">No projects yet.</div>`;
      } else {
        projects.forEach((p) => {
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
          `;
          projectsEl.appendChild(card);
        });
      }

      tasksEl.innerHTML = "";
      if (!tasks.length) {
        tasksEl.innerHTML = `<div class="empty">No tasks yet.</div>`;
      } else {
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
              <th>Client</th>
              <th>Due</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody></tbody>
        `;
        const tbody = table.querySelector("tbody");
        tasks
          .slice()
          .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
          .slice(0, 15)
          .forEach((t) => {
            const proj = projects.find((p) => p.projectId === t.projectId);
            const cl = proj ? clients.find((c) => c.clientId === proj.clientId) : null;
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td>${t.title || ""}</td>
              <td>${proj?.name || "—"}</td>
              <td><span class="badge ${t.status || "not-started"}">${
              (t.status || "not-started").replace("-", " ")
            }</span></td>
              <td>${t.progress || 0}%</td>
              <td>${cl?.clientName || cl?.username || "—"}</td>
              <td>${BXCore.formatDate(t.dueDate)}</td>
              <td>${BXCore.formatDateTime(t.updatedAt)}</td>
            `;
            tbody.appendChild(tr);
          });
        wrap.appendChild(table);
        tasksEl.appendChild(wrap);
      }
    } else {
      const client =
        clients.find((c) => c.clientId === sess.clientId) ||
        clients.find((c) => c.username === sess.username);

      if (titleEl)
        titleEl.textContent = client
          ? `Welcome back, ${client.clientName || sess.username}`
          : `Welcome back, ${sess.username}`;
      if (subtitleEl)
        subtitleEl.textContent = "Here’s the latest on your active BX Media projects.";

      const clientProjects = projects.filter((p) => p.clientId === client?.clientId);
      const clientTasks = tasks.filter((t) =>
        clientProjects.some((p) => p.projectId === t.projectId)
      );

      const summary = BXCore.computeSummary(clientTasks);
      summaryEl.innerHTML = "";
      const cards = [
        ["Total projects", clientProjects.length],
        ["Total tasks", summary.total],
        ["In progress", summary.inProgress],
        ["Completed", summary.completed],
        ["Not started", summary.notStarted],
      ];
      cards.forEach(([label, value]) => {
        const div = document.createElement("div");
        div.className = "summary-card";
        div.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
        summaryEl.appendChild(div);
      });

      projectsEl.innerHTML = "";
      if (!clientProjects.length) {
        projectsEl.innerHTML = `<div class="empty">No projects yet.</div>`;
      } else {
        clientProjects.forEach((p) => {
          const pTasks = clientTasks.filter((t) => t.projectId === p.projectId);
          const progress = BXCore.computeProjectProgress(pTasks);
          const card = document.createElement("article");
          card.className = "project-card";
          card.innerHTML = `
            <header>
              <div>
                <h3>${p.name || "Untitled project"}</h3>
                <p class="project-desc">${p.description || ""}</p>
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
          `;
          projectsEl.appendChild(card);
        });
      }

      tasksEl.innerHTML = "";
      if (!clientTasks.length) {
        tasksEl.innerHTML = `<div class="empty">No tasks yet.</div>`;
      } else {
        const wrap = document.createElement("div");
        wrap.className = "table-wrapper";
        const table = document.createElement("table");
        table.innerHTML = `
          <thead>
            <tr>
              <th>Task</th>
              <th>Description</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Due</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody></tbody>
        `;
        const tbody = table.querySelector("tbody");
        clientTasks
          .slice()
          .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
          .forEach((t) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td>${t.title || ""}</td>
              <td>${t.description || ""}</td>
              <td><span class="badge ${t.status || "not-started"}">${
              (t.status || "not-started").replace("-", " ")
            }</span></td>
              <td>${t.progress || 0}%</td>
              <td>${BXCore.formatDate(t.dueDate)}</td>
              <td>${BXCore.formatDateTime(t.updatedAt)}</td>
            `;
            tbody.appendChild(tr);
          });
        wrap.appendChild(table);
        tasksEl.appendChild(wrap);
      }
    }
  } catch (err) {
    console.error(err);
    if (subtitleEl)
      subtitleEl.textContent = "Failed to load data. Please refresh and try again.";
  }
});
