document.addEventListener("DOMContentLoaded", async () => {
  const sess = BXCore.requireAuth();
  if (!sess) return;

  const titleEl = document.getElementById("overviewTitle");
  const subtitleEl = document.getElementById("overviewSubtitle");
  const statusEl = document.getElementById("overviewStatus");
  const summaryEl = document.getElementById("overviewSummary");
  const projectsEl = document.getElementById("overviewProjects");
  const tasksEl = document.getElementById("overviewTasks");

  const renderTimeline = (items, projects, clients) => {
    tasksEl.innerHTML = "";
    if (!items.length) {
      tasksEl.innerHTML = '<div class="empty">No updates yet. Check back later for activity.</div>';
      return;
    }

    const timeline = document.createElement("div");
    timeline.className = "timeline";

    items
      .slice()
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .slice(0, 12)
      .forEach((t) => {
        const proj = projects.find((p) => p.projectId === t.projectId);
        const client = proj ? clients.find((c) => c.clientId === proj.clientId) : null;
        const statusLabel = (t.status || "not-started").replace("-", " ");
        const type =
          t.status === "completed" ? "delivery" : t.status === "in-progress" ? "team" : "system";
        const tagLabel =
          type === "delivery" ? "File delivery" : type === "team" ? "Team update" : "System update";
        const marker = type === "delivery" ? "D" : type === "team" ? "T" : "S";

        const item = document.createElement("div");
        item.className = "timeline-item";
        item.innerHTML = `
          <div class="timeline-marker">${marker}</div>
          <div class="timeline-content">
            <h4>${t.title || "Task update"}</h4>
            <p>${proj?.name || "Project"} - Status: ${statusLabel}</p>
            <div class="timeline-meta">
              <span>${BXCore.formatDateTime(t.updatedAt) || "No recent update"}</span>
              ${client ? `<span>Client: ${client.clientName || client.username}</span>` : ""}
              <span class="timeline-tag ${type}">${tagLabel}</span>
            </div>
          </div>
        `;
        timeline.appendChild(item);
      });

    tasksEl.appendChild(timeline);
  };

  try {
    BXCore.renderSkeleton(summaryEl, "summary", 5);
    BXCore.renderSkeleton(projectsEl, "card", 3);
    BXCore.renderSkeleton(tasksEl, "timeline", 4);

    const data = await BXCore.apiGetAll();
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
        projectsEl.innerHTML = '<div class="empty">No projects yet.</div>';
      } else {
        projects.forEach((p) => {
          const pTasks = tasks.filter((t) => t.projectId === p.projectId);
          const progress = BXCore.computeProjectProgress(pTasks);
          const client = clients.find((c) => c.clientId === p.clientId);
          const updatedLabel = BXCore.formatDateTime(p.updatedAt || p.createdAt) || "Not updated yet";

          const card = document.createElement("article");
          card.className = "project-card";
          card.innerHTML = `
            <header>
              <div>
                <h3>${p.name || "Untitled project"}</h3>
                <p class="project-desc">${p.description || ""}</p>
                <p class="project-desc" style="font-size:0.8rem;margin-top:0.2rem;">
                  Client: <strong>${client?.clientName || client?.username || "Unknown"}</strong>
                </p>
                <p class="project-meta-line">Updated: ${updatedLabel}</p>
              </div>
              <span class="badge ${p.status || "in-progress"}">
                Status: ${(p.status || "in-progress").replace("-", " ")}
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

      renderTimeline(tasks, projects, clients);
    } else {
      const client =
        clients.find((c) => c.clientId === sess.clientId) ||
        clients.find((c) => c.username === sess.username);

      if (titleEl)
        titleEl.textContent = client
          ? `Welcome back, ${client.clientName || sess.username}`
          : `Welcome back, ${sess.username}`;
      if (subtitleEl)
        subtitleEl.textContent = "Here's the latest on your active BX Media projects.";

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
        projectsEl.innerHTML = '<div class="empty">No projects yet.</div>';
      } else {
        clientProjects.forEach((p) => {
          const pTasks = clientTasks.filter((t) => t.projectId === p.projectId);
          const progress = BXCore.computeProjectProgress(pTasks);
          const updatedLabel = BXCore.formatDateTime(p.updatedAt || p.createdAt) || "Not updated yet";

          const card = document.createElement("article");
          card.className = "project-card";
          card.innerHTML = `
            <header>
              <div>
                <h3>${p.name || "Untitled project"}</h3>
                <p class="project-desc">${p.description || ""}</p>
                <p class="project-meta-line">Updated: ${updatedLabel}</p>
              </div>
              <span class="badge ${p.status || "in-progress"}">
                Status: ${(p.status || "in-progress").replace("-", " ")}
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

      renderTimeline(clientTasks, projects, clients);
    }
  } catch (err) {
    console.error(err);
    if (subtitleEl) {
      subtitleEl.textContent = "Failed to load data. Please refresh and try again.";
    }
    if (statusEl) {
      statusEl.textContent = "Failed to load data. Please refresh and try again.";
      statusEl.style.display = "block";
    }
  }
});
