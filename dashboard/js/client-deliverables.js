document.addEventListener("DOMContentLoaded", async () => {
  const sess = BXCore.requireAuth();
  if (!sess) return;

  const deliverablesGrid = document.getElementById("deliverablesGrid");
  const modal = document.getElementById("deliverableModal");
  const modalTitle = document.getElementById("deliverableModalTitle");
  const modalProject = document.getElementById("deliverableModalProject");
  const modalClient = document.getElementById("deliverableModalClient");
  const modalStatus = document.getElementById("deliverableModalStatus");
  const modalUpdated = document.getElementById("deliverableModalUpdated");
  const modalCover = document.getElementById("deliverableModalCover");
  const modalDescription = document.getElementById("deliverableModalDescription");
  const modalLinks = document.getElementById("deliverableModalLinks");

  const renderSkeletons = (count = 6) => {
    deliverablesGrid.innerHTML = "";
    for (let i = 0; i < count; i += 1) {
      const card = document.createElement("div");
      card.className = "deliverable-card deliverable-skeleton";
      card.innerHTML = `
        <div class="deliverable-cover skeleton"></div>
        <div class="deliverable-body">
          <div class="skeleton skeleton-line" style="width:70%"></div>
          <div class="skeleton skeleton-line" style="width:50%"></div>
          <div class="skeleton skeleton-line" style="width:40%"></div>
        </div>
      `;
      deliverablesGrid.appendChild(card);
    }
  };

  renderSkeletons();

  let data;
  try {
    data = await BXCore.apiGetAll();
    BXCore.updateSidebarStats(data);
    BXCore.renderClientHeader(data.clients || []);
  } catch (err) {
    console.error(err);
    deliverablesGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fas fa-circle-exclamation"></i></div>
        <div>
          <h3>We could not load deliverables</h3>
          <p>Something went wrong while loading your assets.</p>
          <p class="empty-hint">Next step: refresh the page or try again later.</p>
        </div>
      </div>
    `;
    return;
  }

  let clientId = sess.clientId;
  if (!clientId && sess.username) {
    const match = (data.clients || []).find((c) => c.username === sess.username);
    clientId = match ? match.clientId : null;
  }

  const projects = (data.projects || []).filter((p) => p.clientId === clientId);
  const projectIds = projects.map((p) => p.projectId);
  const deliverables = (data.deliverables || []).filter((d) => {
    if (!projectIds.includes(d.projectId)) return false;
    if (d.clientId && d.clientId !== clientId) return false;
    return true;
  });

  const getProjectName = (projectId) => {
    const project = projects.find((p) => p.projectId === projectId);
    return project?.name || "Project";
  };

  const getClientName = () => {
    const client = (data.clients || []).find((c) => c.clientId === clientId);
    return client?.clientName || client?.username || "Client";
  };

  const openModal = (deliverable) => {
    const statusValue = deliverable.status || "in-progress";
    modalTitle.textContent = deliverable.name || "Deliverable";
    modalProject.textContent = `Project: ${getProjectName(deliverable.projectId)}`;
    modalClient.textContent = `Client: ${getClientName()}`;
    modalStatus.textContent = statusValue.replace("-", " ");
    modalStatus.className = `badge ${statusValue}`;
    modalUpdated.textContent = deliverable.updatedAt
      ? `Updated ${BXCore.formatDateTime(deliverable.updatedAt)}`
      : "Updated recently";
    modalDescription.textContent = deliverable.description || "No description provided yet.";

    const coverUrl = deliverable.coverImage || "";
    if (coverUrl) {
      modalCover.style.backgroundImage = `url("${coverUrl}")`;
      modalCover.classList.remove("is-empty");
    } else {
      modalCover.style.backgroundImage = "";
      modalCover.classList.add("is-empty");
    }

    modalLinks.innerHTML = "";
    const linkItems = [
      { label: "Drive", url: deliverable.driveLink, icon: "fa-google-drive" },
      { label: "Preview", url: deliverable.previewLink, icon: "fa-eye" },
      { label: "Download", url: deliverable.downloadLink, icon: "fa-download" },
    ];
    linkItems.forEach((item) => {
      if (item.url) {
        const link = document.createElement("a");
        link.className = "modal-link";
        link.href = item.url;
        link.target = "_blank";
        link.rel = "noopener";
        link.innerHTML = `<i class="fas ${item.icon}"></i> ${item.label}`;
        modalLinks.appendChild(link);
      } else {
        const empty = document.createElement("div");
        empty.className = "modal-link is-empty";
        empty.innerHTML = `<i class="fas ${item.icon}"></i> ${item.label} not available`;
        modalLinks.appendChild(empty);
      }
    });

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  };

  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  };

  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-modal-close]")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });

  if (!deliverables.length) {
    deliverablesGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fas fa-box-open"></i></div>
        <div>
          <h3>No deliverables yet</h3>
          <p>Your BX Media team will share deliverables here once ready.</p>
          <p class="empty-hint">Next step: check back after the next delivery.</p>
        </div>
      </div>
    `;
    return;
  }

  deliverablesGrid.innerHTML = "";
  deliverables
    .slice()
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    .forEach((d) => {
      const statusValue = d.status || "in-progress";
      const card = document.createElement("article");
      card.className = "deliverable-card";
      card.dataset.deliverableId = d.deliverableId;
      card.innerHTML = `
        <div class="deliverable-cover" style="${
          d.coverImage ? `background-image:url('${d.coverImage}')` : ""
        }">
          <span class="badge ${statusValue}">${statusValue.replace("-", " ")}</span>
        </div>
        <div class="deliverable-body">
          <h3>${d.name || "Untitled deliverable"}</h3>
          <div class="deliverable-meta">
            <span>${getProjectName(d.projectId)}</span>
            <span>${BXCore.formatDate(d.updatedAt || d.createdAt) || "Updated recently"}</span>
          </div>
        </div>
      `;
      deliverablesGrid.appendChild(card);
    });

  deliverablesGrid.addEventListener("click", (e) => {
    const card = e.target.closest(".deliverable-card");
    if (!card) return;
    const deliverableId = card.dataset.deliverableId;
    const deliverable = deliverables.find((d) => d.deliverableId === deliverableId);
    if (!deliverable) return;
    openModal(deliverable);
  });
});
