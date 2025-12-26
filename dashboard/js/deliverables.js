document.addEventListener("DOMContentLoaded", async () => {
  const sess = BXCore.requireAuth({ role: "admin" });
  if (!sess) return;

  const deliverablesGrid = document.getElementById("deliverablesGrid");
  const clientSelect = document.getElementById("deliverablesClientSelect");
  const projectSelect = document.getElementById("deliverablesProjectSelect");
  const statusFilter = document.getElementById("deliverablesStatusFilter");
  const addForm = document.getElementById("addDeliverableForm");
  const addClientSelect = document.getElementById("addDeliverableClientSelect");
  const addProjectSelect = document.getElementById("addDeliverableProjectSelect");
  const addCoverUrlInput = document.getElementById("addDeliverableCoverUrl");
  const addStatusEl = document.getElementById("addDeliverableStatus");
  const addVisibleInput = document.getElementById("addDeliverableVisible");
  const addDeliveryLinkInput = document.getElementById("addDeliverableLink");
  const actionStatusEl = document.getElementById("deliverablesActionStatus");
  const toggleAddDeliverableBtn = document.getElementById("toggleAddDeliverable");
  const addDeliverablePanel = document.getElementById("addDeliverablePanel");
  const openAddDeliverableInline = document.getElementById("openAddDeliverableInline");
  const cancelAddDeliverableBtn = document.getElementById("cancelAddDeliverable");

  const modal = document.getElementById("deliverableModal");
  const modalTitle = document.getElementById("deliverableModalTitle");
  const modalProject = document.getElementById("deliverableModalProject");
  const modalClient = document.getElementById("deliverableModalClient");
  const modalStatus = document.getElementById("deliverableModalStatus");
  const modalUpdated = document.getElementById("deliverableModalUpdated");
  const modalCover = document.getElementById("deliverableModalCover");
  const modalDescription = document.getElementById("deliverableModalDescription");
  const modalLinks = document.getElementById("deliverableModalLinks");
  const modalAdmin = document.getElementById("deliverableModalAdmin");
  const editForm = document.getElementById("deliverableEditForm");
  const editClientSelect = document.getElementById("editDeliverableClientSelect");
  const editProjectSelect = document.getElementById("editDeliverableProjectSelect");
  const editName = document.getElementById("editDeliverableName");
  const editStatus = document.getElementById("editDeliverableStatus");
  const editCover = document.getElementById("editDeliverableCover");
  const editDescription = document.getElementById("editDeliverableDescription");
  const editDeliveryLink = document.getElementById("editDeliverableLink");
  const editVisibleInput = document.getElementById("editDeliverableVisible");
  const editStatusEl = document.getElementById("deliverableEditStatus");

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

  const ALLOWED_DELIVERABLE_STATUSES = ["in-progress", "ready", "delivered", "approved", "archived"];

  const showEditStatus = (message, type = "success") => {
    if (!editStatusEl) return;
    editStatusEl.classList.remove("alert-success", "alert-error", "alert-info");
    editStatusEl.classList.add(`alert-${type}`);
    editStatusEl.textContent = message;
    editStatusEl.style.display = "block";
  };

  const resolveCoverImage = async (urlInput, fallbackValue = "") => {
    const url = urlInput?.value?.trim() || "";
    return url || fallbackValue || "";
  };

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
  } catch (err) {
    console.error(err);
    deliverablesGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fas fa-circle-exclamation"></i></div>
        <div>
          <h3>We could not load deliverables</h3>
          <p>Something went wrong while loading deliverables.</p>
          <p class="empty-hint">Next step: refresh the page and try again.</p>
        </div>
      </div>
    `;
    showActionStatus("We could not load deliverables. Please refresh and try again.", "error");
    return;
  }

  let clients = data.clients || [];
  let projects = data.projects || [];
  let deliverables = data.deliverables || [];
  let currentDeliverable = null;

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.clientId === clientId);
    return client?.clientName || client?.username || "Unknown client";
  };

  const getProject = (projectId) => projects.find((p) => p.projectId === projectId);

  const getProjectName = (projectId) => {
    const project = getProject(projectId);
    return project?.name || "Unknown project";
  };

  const getProjectsForClient = (clientId) => {
    if (!clientId || clientId === "all") return projects.slice();
    return projects.filter((p) => p.clientId === clientId);
  };

  const buildSelectOptions = (selectEl, options, placeholder) => {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    if (placeholder) {
      const opt = document.createElement("option");
      opt.value = "all";
      opt.textContent = placeholder;
      selectEl.appendChild(opt);
    }
    options.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.value;
      opt.textContent = item.label;
      selectEl.appendChild(opt);
    });
  };

  const populateClientSelects = () => {
    const options = clients.map((c) => ({
      value: c.clientId,
      label: c.clientName || c.username || c.clientId,
    }));
    buildSelectOptions(clientSelect, options, "All clients");
    buildSelectOptions(addClientSelect, options);
    buildSelectOptions(editClientSelect, options);
  };

  const populateProjectSelect = (selectEl, clientId, placeholder, selectedValue) => {
    const visibleProjects = getProjectsForClient(clientId);
    const options = visibleProjects.map((p) => ({
      value: p.projectId,
      label: p.name || p.projectId,
    }));
    buildSelectOptions(selectEl, options, placeholder);
    if (selectedValue) {
      selectEl.value = selectedValue;
    }
  };

  const ensureProjectClientMatch = (projectId, clientId) => {
    const project = getProject(projectId);
    if (!project) return false;
    if (!clientId) return true;
    return project.clientId === clientId;
  };

  const normalizeStatus = (status) => {
    const val = String(status || "").trim().toLowerCase();
    return ALLOWED_DELIVERABLE_STATUSES.includes(val) ? val : "in-progress";
  };

  const openModal = (deliverable) => {
    if (!deliverable) return;
    currentDeliverable = deliverable;
    const project = getProject(deliverable.projectId);
    const clientId = deliverable.clientId || project?.clientId || "";
    const statusValue = normalizeStatus(deliverable.status);
    modalTitle.textContent = deliverable.name || "Deliverable";
    modalProject.textContent = `Project: ${project?.name || "Unknown project"}`;
    modalClient.textContent = `Client: ${getClientName(clientId)}`;
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
    const deliveryUrl = deliverable.deliveryLink || deliverable.downloadLink || deliverable.previewLink || deliverable.driveLink;
    const linkEl = document.createElement(deliveryUrl ? "a" : "div");
    linkEl.className = `modal-link${deliveryUrl ? "" : " is-empty"}`;
    if (deliveryUrl) {
      linkEl.href = deliveryUrl;
      linkEl.target = "_blank";
      linkEl.rel = "noopener";
      linkEl.innerHTML = `<i class="fas fa-link"></i> Open deliverable`;
    } else {
      linkEl.innerHTML = `<i class="fas fa-link"></i> Deliverable link not available`;
    }
    modalLinks.appendChild(linkEl);

    if (modalAdmin) {
      modalAdmin.style.display = "block";
    }

    if (editForm) {
      editName.value = deliverable.name || "";
      editStatus.value = statusValue;
      editCover.value = deliverable.coverImage || "";
      editDescription.value = deliverable.description || "";
      editDeliveryLink.value =
        deliverable.deliveryLink || deliverable.downloadLink || deliverable.previewLink || deliverable.driveLink || "";
      if (editVisibleInput) {
        editVisibleInput.checked = deliverable.visibleToClient === true || String(deliverable.visibleToClient) === "true";
      }
      editClientSelect.value = clientId || "";
      populateProjectSelect(editProjectSelect, clientId, null, deliverable.projectId);
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  };

  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    currentDeliverable = null;
    if (editStatusEl) editStatusEl.style.display = "none";
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

  if (toggleAddDeliverableBtn && addDeliverablePanel) {
    toggleAddDeliverableBtn.addEventListener("click", () => {
      const isCollapsed = addDeliverablePanel.classList.toggle("is-collapsed");
      toggleAddDeliverableBtn.textContent = isCollapsed ? "Show" : "Hide";
      addDeliverablePanel.setAttribute("aria-hidden", isCollapsed ? "true" : "false");
    });
  }

  if (openAddDeliverableInline && addDeliverablePanel) {
    openAddDeliverableInline.addEventListener("click", () => {
      addDeliverablePanel.classList.remove("is-collapsed");
      addDeliverablePanel.setAttribute("aria-hidden", "false");
      toggleAddDeliverableBtn.textContent = "Hide";
      addDeliverablePanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (cancelAddDeliverableBtn && addDeliverablePanel) {
    cancelAddDeliverableBtn.addEventListener("click", () => {
      addDeliverablePanel.classList.add("is-collapsed");
      addDeliverablePanel.setAttribute("aria-hidden", "true");
      toggleAddDeliverableBtn.textContent = "Show";
    });
  }

  const renderDeliverables = () => {
    deliverablesGrid.innerHTML = "";

    const selectedClient = clientSelect.value;
    const selectedProject = projectSelect.value;
    const selectedStatus = statusFilter.value;

    let filtered = deliverables.slice();
    if (selectedClient !== "all") {
      filtered = filtered.filter((d) => {
        const project = getProject(d.projectId);
        const clientId = d.clientId || project?.clientId;
        return clientId === selectedClient;
      });
    }
    if (selectedProject !== "all") {
      filtered = filtered.filter((d) => d.projectId === selectedProject);
    }
    if (selectedStatus !== "all") {
      filtered = filtered.filter((d) => (d.status || "not-started") === selectedStatus);
    }

    if (!filtered.length) {
      deliverablesGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fas fa-box-open"></i></div>
          <div>
            <h3>No deliverables yet</h3>
            <p>Use the filters to refine your view or add the first asset.</p>
          </div>
        </div>
      `;
      return;
    }

    filtered
      .slice()
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .forEach((d) => {
        const project = getProject(d.projectId);
        const clientId = d.clientId || project?.clientId;
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
              <span>${getClientName(clientId)}</span>
            </div>
            <div class="deliverable-actions">
              <button class="btn-secondary" type="button" data-action="edit">Edit</button>
              <button class="btn-danger" type="button" data-action="delete">Archive</button>
            </div>
          </div>
        `;
        deliverablesGrid.appendChild(card);
      });
  };

  deliverablesGrid.addEventListener("click", async (e) => {
    const card = e.target.closest(".deliverable-card");
    if (!card) return;
    const deliverableId = card.dataset.deliverableId;
    const deliverable = deliverables.find((d) => d.deliverableId === deliverableId);
    if (!deliverable) return;

    const actionBtn = e.target.closest("[data-action]");
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      if (action === "edit") {
        openModal(deliverable);
        return;
      }
      if (action === "delete") {
        if (!confirm("Archive this deliverable? It will stay in records.")) return;
        BXCore.setButtonLoading(actionBtn, true, "Archiving...");
        try {
          await BXCore.apiPost({
            action: "updateDeliverable",
            deliverableId,
            status: "archived",
            updatedAt: new Date().toISOString(),
          });
          data = await BXCore.apiGetAll(true);
          BXCore.updateSidebarStats(data);
          clients = data.clients || [];
          projects = data.projects || [];
          deliverables = data.deliverables || [];
          populateClientSelects();
          populateProjectSelect(projectSelect, clientSelect.value, "All projects");
          populateProjectSelect(addProjectSelect, addClientSelect.value, null);
          renderDeliverables();
          showActionStatus("Deliverable removed. The list is up to date.", "success");
        } catch (err) {
          console.error(err);
          showActionStatus("Couldn't delete the deliverable. Please try again.", "error");
        } finally {
          BXCore.setButtonLoading(actionBtn, false);
        }
        return;
      }
    }

    openModal(deliverable);
  });

  clientSelect.addEventListener("change", () => {
    populateProjectSelect(projectSelect, clientSelect.value, "All projects");
    renderDeliverables();
  });

  projectSelect.addEventListener("change", renderDeliverables);
  statusFilter.addEventListener("change", renderDeliverables);

  addClientSelect.addEventListener("change", () => {
    populateProjectSelect(addProjectSelect, addClientSelect.value, null);
  });

  editClientSelect.addEventListener("change", () => {
    populateProjectSelect(editProjectSelect, editClientSelect.value, null);
  });

  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (addStatusEl) addStatusEl.style.display = "none";
    const submitBtn = e.target.querySelector("button[type=\"submit\"]");
    const fd = new FormData(addForm);
    const name = String(fd.get("name") || "").trim();
    const clientId = String(fd.get("clientId") || "").trim();
    const projectId = String(fd.get("projectId") || "").trim();
    if (!name) {
      showActionStatus("Deliverable name is required.", "error");
      return;
    }
    if (!clientId || !projectId) {
      showActionStatus("Please select both a client and a project.", "error");
      return;
    }
    if (!ensureProjectClientMatch(projectId, clientId)) {
      showActionStatus("Selected project does not belong to that client.", "error");
      return;
    }

    BXCore.setButtonLoading(submitBtn, true, "Saving...");
    const deliverableId = "deliverable_" + Date.now();
    try {
      const coverImage = await resolveCoverImage(addCoverUrlInput);
      await BXCore.apiPost({
        action: "addDeliverable",
        deliverableId,
        clientId,
        clientName: getClientName(clientId),
        projectId,
        projectName: getProjectName(projectId),
        name,
        status: normalizeStatus(fd.get("status") || "in-progress"),
        coverImage,
        description: fd.get("description"),
        deliveryLink: fd.get("deliveryLink"),
        downloadLink: fd.get("deliveryLink"),
        visibleToClient: addVisibleInput?.checked ? true : false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      addForm.reset();
      if (addCoverUrlInput) addCoverUrlInput.value = "";
      if (addVisibleInput) addVisibleInput.checked = false;
      if (addStatusEl) {
        addStatusEl.textContent = "Deliverable added successfully.";
        addStatusEl.style.display = "block";
        setTimeout(() => (addStatusEl.style.display = "none"), 2000);
      }
      showActionStatus("Deliverable saved. The list is refreshed.", "success");
      data = await BXCore.apiGetAll(true);
      BXCore.updateSidebarStats(data);
      clients = data.clients || [];
      projects = data.projects || [];
      deliverables = data.deliverables || [];
      populateClientSelects();
      populateProjectSelect(projectSelect, clientSelect.value, "All projects");
      populateProjectSelect(addProjectSelect, addClientSelect.value, null);
      renderDeliverables();
    } catch (err) {
      console.error(err);
      showActionStatus("Couldn't save the deliverable. Please try again.", "error");
    } finally {
      BXCore.setButtonLoading(submitBtn, false);
    }
  });

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentDeliverable) return;
    if (editStatusEl) editStatusEl.style.display = "none";
    const submitBtn = editForm.querySelector("button[type=\"submit\"]");

    const name = editName.value.trim();
    const clientId = editClientSelect.value;
    const projectId = editProjectSelect.value;
    if (!name) {
      showEditStatus("Deliverable name is required.", "error");
      return;
    }
    if (!ensureProjectClientMatch(projectId, clientId)) {
      showEditStatus("Selected project does not belong to that client.", "error");
      return;
    }

    BXCore.setButtonLoading(submitBtn, true, "Saving...");
    try {
      const coverImage = await resolveCoverImage(editCover, editCover.value);
      await BXCore.apiPost({
        action: "updateDeliverable",
        deliverableId: currentDeliverable.deliverableId,
        clientId,
        projectId,
        clientName: getClientName(clientId),
        projectName: getProjectName(projectId),
        name,
        status: normalizeStatus(editStatus.value),
        coverImage,
        description: editDescription.value,
        deliveryLink: editDeliveryLink.value,
        downloadLink: editDeliveryLink.value,
        visibleToClient: editVisibleInput?.checked ? true : false,
        updatedAt: new Date().toISOString(),
      });
      data = await BXCore.apiGetAll(true);
      BXCore.updateSidebarStats(data);
      clients = data.clients || [];
      projects = data.projects || [];
      deliverables = data.deliverables || [];
      populateClientSelects();
      populateProjectSelect(projectSelect, clientSelect.value, "All projects");
      populateProjectSelect(addProjectSelect, addClientSelect.value, null);
      renderDeliverables();
      showEditStatus("Deliverable updated successfully.", "success");
      closeModal();
      showActionStatus("Deliverable updated successfully.", "success");
    } catch (err) {
      console.error(err);
      showEditStatus("Couldn't update the deliverable. Please try again.", "error");
    } finally {
      BXCore.setButtonLoading(submitBtn, false);
    }
  });

  populateClientSelects();
  populateProjectSelect(projectSelect, clientSelect.value, "All projects");
  populateProjectSelect(addProjectSelect, addClientSelect.value, null);
  renderDeliverables();
});
