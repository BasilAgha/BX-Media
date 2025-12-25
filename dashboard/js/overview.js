document.addEventListener("DOMContentLoaded", async () => {
  const sess = BXCore.requireAuth();
  if (!sess) return;

  const titleEl = document.getElementById("overviewTitle");
  const subtitleEl = document.getElementById("overviewSubtitle");
  const summaryEl = document.getElementById("overviewSummary");
  const projectsEl = document.getElementById("overviewProjects");
  const tasksEl = document.getElementById("overviewTasks");
  const isClientView = !!document.getElementById("overviewActiveProjects");
  const activeProjectsEl = document.getElementById("overviewActiveProjects") || projectsEl;
  const activityEl = document.getElementById("overviewActivity") || tasksEl;

  const renderTimeline = (items, projects, clients) => {
    if (!activityEl) return;
    activityEl.innerHTML = "";
    if (!items.length) {
      activityEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fas fa-clock"></i></div>
          <div>
            <h3>No recent activity</h3>
            <p>Updates will appear here as BX Media moves your work forward.</p>
            <p class="empty-hint">Next step: check back after the next status update.</p>
          </div>
        </div>
      `;
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

    activityEl.appendChild(timeline);
  };

  const renderSummaryCards = (cards) => {
    if (!summaryEl) return;
    summaryEl.innerHTML = "";
    cards.forEach(({ label, value, icon, tone, helper }) => {
      const showEmpty = Number(value) === 0;
      const div = document.createElement("div");
      div.className = `summary-card ${tone}`;
      div.innerHTML = `
        <span class="summary-icon"><i class="${icon}"></i></span>
        <div>
          <span>${label}</span>
          <strong>${showEmpty ? "—" : value}</strong>
          ${showEmpty ? `<span class="summary-helper">${helper}</span>` : ""}
        </div>
      `;
      summaryEl.appendChild(div);
    });
  };

  try {
    BXCore.renderSkeleton(summaryEl, "summary", 4);
    BXCore.renderSkeleton(activeProjectsEl, "card", 3);
    BXCore.renderSkeleton(activityEl, "timeline", 4);

    const data = await BXCore.apiGetAll();
    BXCore.updateSidebarStats(data);
    BXCore.renderClientHeader(data.clients || []);

    const clients = data.clients || [];
    const projects = data.projects || [];
    const tasks = data.tasks || [];

    if (sess.role === "admin") {
      if (titleEl) titleEl.textContent = "Dashboard";
      if (subtitleEl)
        subtitleEl.textContent = "High-level view of all clients, projects, and task progress.";

      const summary = BXCore.computeProjectSummary(projects);
      renderSummaryCards([
        {
          label: "Total projects",
          value: projects.length,
          icon: "fas fa-folder-open",
          tone: "neutral",
          helper: "No active projects yet.",
        },
        {
          label: "In progress",
          value: summary.inProgress,
          icon: "fas fa-bolt",
          tone: "in-progress",
          helper: "No work in motion yet.",
        },
        {
          label: "Completed",
          value: summary.completed,
          icon: "fas fa-check",
          tone: "completed",
          helper: "No completed work yet.",
        },
        {
          label: "Not started",
          value: summary.notStarted,
          icon: "fas fa-pause",
          tone: "not-started",
          helper: "No queued work yet.",
        },
      ]);

      if (activeProjectsEl) activeProjectsEl.innerHTML = "";
      const projectList = isClientView
        ? projects.filter((p) => (p.status || "in-progress") !== "completed")
        : projects;
      if (!projectList.length && activeProjectsEl) {
        activeProjectsEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon"><i class="fas fa-layer-group"></i></div>
            <div>
              <h3>No projects yet</h3>
              <p>Projects will appear here once they are created.</p>
              <p class="empty-hint">Next step: add a project to begin tracking.</p>
            </div>
          </div>
        `;
      } else if (activeProjectsEl) {
        projectList.forEach((p) => {
          const pTasks = tasks.filter((t) => t.projectId === p.projectId);
          const progress = BXCore.computeProjectProgress(pTasks);
          const client = clients.find((c) => c.clientId === p.clientId);
          const updatedLabel = BXCore.formatDateTime(p.updatedAt || p.createdAt) || "Not updated yet";

          const progressLabel = progress === 0 ? "—" : `${progress}%`;
          const progressHelper = progress === 0 ? "No tasks yet" : "";
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
                ${(p.status || "in-progress").replace("-", " ")}
              </span>
            </header>
            <div class="project-meta">
              <div style="flex:1">
                <progress max="100" value="${progress}"></progress>
              </div>
              <div class="progress-stack">
                <span class="progress-label">${progressLabel}</span>
                ${progressHelper ? `<span class="progress-helper">${progressHelper}</span>` : ""}
              </div>
              ${
                p.driveLink
                  ? `<a class="ghost" href="${p.driveLink}" target="_blank" rel="noopener">Drive</a>`
                  : ""
              }
            </div>
          `;
          activeProjectsEl.appendChild(card);
        });
      }

      renderTimeline(tasks, projects, clients);
    } else {
      const client =
        clients.find((c) => c.clientId === sess.clientId) ||
        clients.find((c) => c.username === sess.username);

      if (titleEl) titleEl.textContent = "Dashboard";
      if (subtitleEl)
        subtitleEl.textContent = client
          ? `Welcome back, ${client.clientName || sess.username}.`
          : `Welcome back, ${sess.username}.`;

      const clientProjects = projects.filter((p) => p.clientId === client?.clientId);
      const clientTasks = tasks.filter((t) =>
        clientProjects.some((p) => p.projectId === t.projectId)
      );

      const summary = BXCore.computeProjectSummary(clientProjects);
      renderSummaryCards([
        {
          label: "Total projects",
          value: clientProjects.length,
          icon: "fas fa-folder-open",
          tone: "neutral",
          helper: "No active projects yet.",
        },
        {
          label: "In progress",
          value: summary.inProgress,
          icon: "fas fa-bolt",
          tone: "in-progress",
          helper: "No work in motion yet.",
        },
        {
          label: "Completed",
          value: summary.completed,
          icon: "fas fa-check",
          tone: "completed",
          helper: "No completed work yet.",
        },
        {
          label: "Not started",
          value: summary.notStarted,
          icon: "fas fa-pause",
          tone: "not-started",
          helper: "No queued work yet.",
        },
      ]);

      if (activeProjectsEl) activeProjectsEl.innerHTML = "";
      const activeProjects = clientProjects.filter(
        (p) => (p.status || "in-progress") !== "completed"
      );
      if (!activeProjects.length && activeProjectsEl) {
        activeProjectsEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon"><i class="fas fa-layer-group"></i></div>
            <div>
              <h3>No active projects</h3>
              <p>Once work begins, active projects will appear here.</p>
              <p class="empty-hint">Next step: confirm next steps with your BX Media team.</p>
            </div>
          </div>
        `;
      } else if (activeProjectsEl) {
        activeProjects.forEach((p) => {
          const pTasks = clientTasks.filter((t) => t.projectId === p.projectId);
          const progress = BXCore.computeProjectProgress(pTasks);
          const updatedLabel = BXCore.formatDateTime(p.updatedAt || p.createdAt) || "Not updated yet";

          const progressLabel = progress === 0 ? "—" : `${progress}%`;
          const progressHelper = progress === 0 ? "No tasks yet" : "";
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
                ${(p.status || "in-progress").replace("-", " ")}
              </span>
            </header>
            <div class="project-meta">
              <div style="flex:1">
                <progress max="100" value="${progress}"></progress>
              </div>
              <div class="progress-stack">
                <span class="progress-label">${progressLabel}</span>
                ${progressHelper ? `<span class="progress-helper">${progressHelper}</span>` : ""}
              </div>
              ${
                p.driveLink
                  ? `<a class="ghost" href="${p.driveLink}" target="_blank" rel="noopener">Drive</a>`
                  : ""
              }
            </div>
          `;
          activeProjectsEl.appendChild(card);
        });
      }

      renderTimeline(clientTasks, projects, clients);
    }
  } catch (err) {
    console.error(err);
    if (subtitleEl) {
      subtitleEl.textContent = "Failed to load data. Please refresh and try again.";
    }
  }
});
