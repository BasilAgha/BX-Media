(function () {
  const STORAGE_KEY = 'bxMediaClients';
  const CLIENT_SESSION_KEY = 'bxMediaActiveClient';
  const ADMIN_SESSION_KEY = 'bxMediaAdminActive';
  const ADMIN_CREDENTIALS = {
    email: 'admin@bxmedia.com',
    password: 'createimpact',
  };

  const DEFAULT_CLIENTS = [
    {
      id: 'client-001',
      name: 'Zeetex Tyres',
      email: 'zeetex@partner.com',
      password: 'zeetex2024',
      projectInfo: {
        startDate: '2024-05-06',
        endDate: '2024-08-23',
        contractUrl: 'https://drive.google.com/zeetex-2024-contract',
        deliverables: [
          {
            id: 'del-001',
            title: 'Creative asset folder',
            url: 'https://drive.google.com/zeetex-q3-assets',
          },
          {
            id: 'del-002',
            title: 'Performance dashboard',
            url: 'https://datastudio.google.com/performance-zeetex',
          },
        ],
      },
      tasks: [
        {
          id: 'task-001',
          title: 'Performance campaign roll-out',
          description: 'Launch paid campaigns across UAE & Saudi with localized messaging and remarketing.',
          status: 'in-progress',
          progress: 55,
          startDate: '2024-05-13',
          dueDate: '2024-08-12',
          updatedAt: '2024-07-02T09:00:00Z',
        },
        {
          id: 'task-002',
          title: 'Creative production refresh',
          description: 'Deliver fresh lifestyle visuals for the Q3 automotive storyboards.',
          status: 'completed',
          progress: 100,
          startDate: '2024-04-22',
          dueDate: '2024-06-14',
          updatedAt: '2024-06-14T14:30:00Z',
        },
      ],
    },
    {
      id: 'client-002',
      name: 'Titanium Auto',
      email: 'projects@titaniumauto.com',
      password: 'titanium2024',
      projectInfo: {
        startDate: '2024-04-01',
        endDate: '2024-07-30',
        contractUrl: 'https://drive.google.com/titanium-master-services',
        deliverables: [
          {
            id: 'del-003',
            title: 'Launch teaser edits',
            url: 'https://drive.google.com/titanium-teaser-v1',
          },
        ],
      },
      tasks: [
        {
          id: 'task-003',
          title: 'Showroom reveal teaser',
          description: 'Storyboard, shoot, and edit teaser clips for the upcoming dealership reveal.',
          status: 'in-progress',
          progress: 40,
          startDate: '2024-05-10',
          dueDate: '2024-07-22',
          updatedAt: '2024-06-29T18:45:00Z',
        },
        {
          id: 'task-004',
          title: 'Owner testimonial series',
          description: 'Capture client testimonials to highlight the Titanium Auto experience.',
          status: 'not-started',
          progress: 0,
          startDate: '2024-07-08',
          dueDate: '2024-08-05',
          updatedAt: '2024-06-20T12:10:00Z',
        },
      ],
    },
  ];

  const STATUS_LABELS = {
    'not-started': 'Not started',
    'in-progress': 'In progress',
    completed: 'Completed',
    blocked: 'Blocked',
  };

  const STATUS_ORDER = ['not-started', 'in-progress', 'blocked', 'completed'];

  function normalizeProjectInfo(info) {
    const base = {
      startDate: '',
      endDate: '',
      contractUrl: '',
      deliverables: [],
    };

    if (!info || typeof info !== 'object') {
      return { ...base };
    }

    return {
      ...base,
      ...info,
      deliverables: Array.isArray(info.deliverables)
        ? info.deliverables
            .filter((item) => item && (item.title || item.url))
            .map((item, index) => ({
              id: item.id || `deliverable-${index}`,
              title: item.title || 'Untitled deliverable',
              url: item.url || '',
            }))
        : [],
    };
  }

  function getProjectInfo(client) {
    return normalizeProjectInfo(client?.projectInfo);
  }

  function ensureDefaultData() {
    if (!window.localStorage) {
      console.warn('LocalStorage is required for the BX Media dashboard.');
      return DEFAULT_CLIENTS.slice();
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CLIENTS));
      return DEFAULT_CLIENTS.slice();
    }

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      console.error('Unable to parse stored client data. Resetting to defaults.', error);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CLIENTS));
    return DEFAULT_CLIENTS.slice();
  }

  function loadClients() {
    const data = ensureDefaultData();
    return JSON.parse(JSON.stringify(data));
  }

  function saveClients(clients) {
    if (!window.localStorage) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  }

  function getClientById(id) {
    const clients = loadClients();
    return clients.find((client) => client.id === id) || null;
  }

  function getClientByCredentials(email, password) {
    const clients = loadClients();
    const normalizedEmail = (email || '').trim().toLowerCase();
    return (
      clients.find(
        (client) => client.email.trim().toLowerCase() === normalizedEmail && client.password === password,
      ) || null
    );
  }

  function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatDateTime(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function computeSummary(tasks) {
    const summary = {
      total: tasks.length,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      blocked: 0,
    };

    tasks.forEach((task) => {
      if (task.status === 'completed') summary.completed += 1;
      else if (task.status === 'in-progress') summary.inProgress += 1;
      else if (task.status === 'blocked') summary.blocked += 1;
      else summary.notStarted += 1;
    });

    return summary;
  }

  function renderSummary(container, summary) {
    if (!container) return;
    container.innerHTML = '';
    const cards = [
      { label: 'Total tasks', value: summary.total },
      { label: 'In progress', value: summary.inProgress },
      { label: 'Completed', value: summary.completed },
      { label: 'Not started', value: summary.notStarted },
      { label: 'Blocked', value: summary.blocked },
    ];

    cards
      .filter((card, index) => !(card.label === 'Blocked' && summary.blocked === 0 && index > 0))
      .forEach((card) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'summary-card';
        wrapper.innerHTML = `<span>${card.label}</span><strong>${card.value}</strong>`;
        container.appendChild(wrapper);
      });
  }

  function createTaskTable(tasks) {
    if (!tasks.length) {
      const empty = document.createElement('div');
      empty.className = 'task-empty';
      empty.textContent = 'No tasks found yet. Check back soon for updates.';
      return empty;
    }

    const table = document.createElement('table');
    table.className = 'task-list';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Task</th>
          <th>Description</th>
          <th>Progress</th>
          <th>Status</th>
          <th>Start date</th>
          <th>Target date</th>
          <th>Last updated</th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement('tbody');

    tasks
      .slice()
      .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
      .forEach((task) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><strong>${task.title}</strong></td>
          <td>${task.description ? task.description : '<span class="helper-text">No description provided</span>'}</td>
          <td>
            <div class="progress-wrapper">
              <progress max="100" value="${task.progress}"></progress>
              <span>${task.progress}%</span>
            </div>
          </td>
          <td><span class="badge ${task.status}">${STATUS_LABELS[task.status] || task.status}</span></td>
          <td>${formatDate(task.startDate)}</td>
          <td>${formatDate(task.dueDate)}</td>
          <td>${formatDateTime(task.updatedAt)}</td>
        `;
        tbody.appendChild(row);
      });

    table.appendChild(tbody);
    return table;
  }

  function renderClientTasks(container, tasks) {
    if (!container) return;
    container.innerHTML = '';
    container.appendChild(createTaskTable(tasks));
  }

  function renderClientProjectOverview(container, projectInfo) {
    if (!container) return;
    const info = normalizeProjectInfo(projectInfo);

    const contractHtml = info.contractUrl
      ? `<a href="${info.contractUrl}" target="_blank" rel="noopener noreferrer">View signed agreement</a>`
      : '<span class="helper-text">Contract link will appear here once shared.</span>';

    const deliverableHtml = info.deliverables.length
      ? `<ul class="overview-deliverables">${info.deliverables
          .map((item) => {
            const label = item.title || 'Deliverable';
            if (item.url) {
              return `<li><a href="${item.url}" target="_blank" rel="noopener noreferrer">${label}</a></li>`;
            }
            return `<li><span>${label}</span></li>`;
          })
          .join('')}</ul>`
      : '<span class="helper-text">Final deliverables will be listed here.</span>';

    container.innerHTML = `
      <div class="overview-grid">
        <div class="overview-card">
          <h2>Project timeline</h2>
          <div class="timeline-card">
            <div class="timeline-item">
              <span>Project start</span>
              <strong>${formatDate(info.startDate)}</strong>
            </div>
            <div class="timeline-item">
              <span>Projected completion</span>
              <strong>${formatDate(info.endDate)}</strong>
            </div>
          </div>
        </div>
        <div class="overview-card">
          <h2>Key resources</h2>
          <div class="resource-block">
            <h3>Contract</h3>
            ${contractHtml}
          </div>
          <div class="resource-block">
            <h3>Final deliverables</h3>
            ${deliverableHtml}
          </div>
        </div>
      </div>
    `;
  }

  function setVisibility(element, visible) {
    if (!element) return;
    element.style.display = visible ? '' : 'none';
  }

  function showAlert(element, show) {
    if (!element) return;
    if (show) {
      element.classList.add('show');
    } else {
      element.classList.remove('show');
    }
  }

  function handleClientLogin(client) {
    sessionStorage.setItem(CLIENT_SESSION_KEY, client.id);
  }

  function handleClientLogout() {
    sessionStorage.removeItem(CLIENT_SESSION_KEY);
  }

  function handleAdminLogin() {
    sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
  }

  function handleAdminLogout() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }

  function initClientPage() {
    const loginView = document.getElementById('clientLoginView');
    const dashboardView = document.getElementById('clientDashboard');
    const loginForm = document.getElementById('clientLoginForm');
    const loginError = document.getElementById('clientLoginError');
    const summaryContainer = document.getElementById('clientSummary');
    const tasksContainer = document.getElementById('clientTasks');
    const projectOverview = document.getElementById('clientProjectOverview');
    const greeting = document.getElementById('clientGreeting');
    const subtitle = document.getElementById('clientSubtitle');
    const logoutButtons = [
      document.getElementById('clientLogout'),
      document.getElementById('clientLogoutTop'),
    ].filter(Boolean);

    logoutButtons.forEach((button) => {
      button.addEventListener('click', () => {
        handleClientLogout();
        setVisibility(dashboardView, false);
        setVisibility(loginView, true);
        logoutButtons.forEach((btn) => (btn.style.display = 'none'));
        if (loginForm) loginForm.reset();
      });
    });

    function showClientDashboard(client) {
      if (!client) return;
      const latestClient = getClientById(client.id) || client;
      setVisibility(loginView, false);
      setVisibility(dashboardView, true);
      logoutButtons.forEach((btn) => (btn.style.display = 'inline-flex'));

      greeting.textContent = `Welcome back, ${latestClient.name.split(' ')[0]}!`;
      subtitle.textContent =
        latestClient.tasks && latestClient.tasks.length
          ? 'Here is the latest on your active projects.'
          : 'We will add your first project update soon.';

      renderSummary(summaryContainer, computeSummary(latestClient.tasks || []));
      renderClientTasks(tasksContainer, latestClient.tasks || []);
      renderClientProjectOverview(projectOverview, latestClient.projectInfo);
      handleClientLogin(latestClient);
    }

    const activeClientId = sessionStorage.getItem(CLIENT_SESSION_KEY);
    if (activeClientId) {
      const activeClient = getClientById(activeClientId);
      if (activeClient) {
        showClientDashboard(activeClient);
      } else {
        handleClientLogout();
      }
    }

    if (loginForm) {
      loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(loginForm);
        const email = formData.get('email');
        const password = formData.get('password');
        const client = getClientByCredentials(email, password);

        if (client) {
          showAlert(loginError, false);
          showClientDashboard(client);
        } else {
          showAlert(loginError, true);
        }
      });
    }
  }

  function populateClientSelect(selectElement, clients) {
    if (!selectElement) return;
    selectElement.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select a client';
    placeholder.disabled = true;
    placeholder.selected = true;
    selectElement.appendChild(placeholder);

    clients.forEach((client) => {
      const option = document.createElement('option');
      option.value = client.id;
      option.textContent = client.name;
      selectElement.appendChild(option);
    });
  }

  function addTaskToClient(clientId, task) {
    const clients = loadClients();
    const target = clients.find((client) => client.id === clientId);
    if (!target) return null;

    const newTask = {
      ...task,
      id: `task-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };

    if (!newTask.startDate && newTask.dueDate) {
      newTask.startDate = newTask.dueDate;
    }

    target.tasks = Array.isArray(target.tasks) ? target.tasks : [];
    target.tasks.unshift(newTask);
    saveClients(clients);
    return newTask;
  }

  function updateTaskOnClient(clientId, taskId, updates) {
    const clients = loadClients();
    const target = clients.find((client) => client.id === clientId);
    if (!target || !Array.isArray(target.tasks)) return null;

    const task = target.tasks.find((item) => item.id === taskId);
    if (!task) return null;

    Object.assign(task, updates, { updatedAt: new Date().toISOString() });
    if (!task.startDate && task.dueDate) {
      task.startDate = task.dueDate;
    }
    saveClients(clients);
    return task;
  }

  function updateClientProjectInfo(clientId, updates) {
    const clients = loadClients();
    const target = clients.find((client) => client.id === clientId);
    if (!target) return null;

    const current = getProjectInfo(target);
    const next = {
      ...current,
      ...updates,
    };

    next.deliverables = Array.isArray(next.deliverables)
      ? next.deliverables.map((item, index) => ({
          id: item.id || `deliverable-${index}`,
          title: item.title,
          url: item.url,
        }))
      : [];

    target.projectInfo = next;
    saveClients(clients);
    return next;
  }

  function addDeliverableToClient(clientId, deliverable) {
    const clients = loadClients();
    const target = clients.find((client) => client.id === clientId);
    if (!target) return null;

    const info = getProjectInfo(target);
    const newDeliverable = {
      ...deliverable,
      id: deliverable.id || `del-${Date.now()}`,
    };

    info.deliverables = Array.isArray(info.deliverables) ? info.deliverables.slice() : [];
    info.deliverables.unshift(newDeliverable);
    target.projectInfo = info;
    saveClients(clients);
    return newDeliverable;
  }

  function removeDeliverableFromClient(clientId, deliverableId) {
    const clients = loadClients();
    const target = clients.find((client) => client.id === clientId);
    if (!target) return null;

    const info = getProjectInfo(target);
    info.deliverables = info.deliverables.filter((item) => item.id !== deliverableId);
    target.projectInfo = info;
    saveClients(clients);
    return info.deliverables.slice();
  }

  function renderAdminTaskList(container, client) {
    if (!container) return;
    container.innerHTML = '';

    if (!client) {
      const empty = document.createElement('div');
      empty.className = 'task-empty';
      empty.textContent = 'Select a client to view and manage their tasks.';
      container.appendChild(empty);
      return;
    }

    const tasks = Array.isArray(client.tasks) ? client.tasks.slice() : [];
    if (!tasks.length) {
      const empty = document.createElement('div');
      empty.className = 'task-empty';
      empty.textContent = 'No updates yet. Create the first task to get started.';
      container.appendChild(empty);
      return;
    }

    tasks
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .forEach((task) => {
        const card = document.createElement('article');
        card.className = 'admin-task-card';
        card.dataset.taskId = task.id;

        card.innerHTML = `
          <header>
            <div>
              <h3>${task.title}</h3>
              <p class="helper-text">Last updated ${formatDateTime(task.updatedAt)}</p>
            </div>
            <span class="badge ${task.status}">${STATUS_LABELS[task.status] || task.status}</span>
          </header>
          <p>${task.description || '<span class="helper-text">No description provided yet.</span>'}</p>
          <div class="form-grid" style="margin-top: 0.5rem">
            <div class="form-row">
              <label>Status</label>
              <select class="admin-status">
                ${Object.entries(STATUS_LABELS)
                  .map(
                    ([value, label]) =>
                      `<option value="${value}" ${task.status === value ? 'selected' : ''}>${label}</option>`,
                  )
                  .join('')}
              </select>
            </div>
            <div class="form-row">
              <label>Progress</label>
              <div class="inline-control">
                <input type="range" min="0" max="100" value="${task.progress}" class="admin-progress" />
                <span class="admin-progress-value">${task.progress}%</span>
              </div>
            </div>
            <div class="form-row">
              <label>Start date</label>
              <input type="date" value="${task.startDate ? task.startDate : ''}" class="admin-start-date" />
            </div>
            <div class="form-row">
              <label>Target date</label>
              <input type="date" value="${task.dueDate ? task.dueDate : ''}" class="admin-due-date" />
            </div>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 0.75rem">
            <button type="button" class="secondary-btn admin-save" data-task-id="${task.id}">Save changes</button>
          </div>
        `;

        container.appendChild(card);
      });
  }

  function renderDeliverableList(listElement, deliverables) {
    if (!listElement) return;
    listElement.innerHTML = '';

    if (!deliverables || !deliverables.length) {
      const empty = document.createElement('li');
      empty.className = 'deliverable-empty';
      empty.textContent = 'No deliverables shared yet.';
      listElement.appendChild(empty);
      return;
    }

    deliverables.forEach((item) => {
      const listItem = document.createElement('li');
      listItem.className = 'deliverable-item';
      listItem.dataset.deliverableId = item.id;
      listItem.innerHTML = `
        <a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.title}</a>
        <button type="button" class="link-btn deliverable-remove" data-deliverable-id="${item.id}">Remove</button>
      `;
      listElement.appendChild(listItem);
    });
  }

  function renderProjectMeta(panelElement, client) {
    if (!panelElement) return;
    const form = panelElement.querySelector('#projectMetaForm');
    const deliverableList = panelElement.querySelector('#deliverableList');
    const deliverableForm = panelElement.querySelector('#deliverableForm');

    if (!client) {
      panelElement.style.display = 'none';
      if (form) {
        form.reset();
        form.dataset.clientId = '';
      }
      if (deliverableForm) {
        deliverableForm.reset();
        deliverableForm.dataset.clientId = '';
      }
      if (deliverableList) deliverableList.innerHTML = '';
      return;
    }

    panelElement.style.display = '';
    const info = getProjectInfo(client);

    if (form) {
      form.dataset.clientId = client.id;
      const startInput = form.querySelector('#projectStartDate');
      const endInput = form.querySelector('#projectEndDate');
      const contractInput = form.querySelector('#projectContractUrl');

      if (startInput) startInput.value = info.startDate || '';
      if (endInput) endInput.value = info.endDate || '';
      if (contractInput) contractInput.value = info.contractUrl || '';
    }

    if (deliverableForm) {
      deliverableForm.dataset.clientId = client.id;
      deliverableForm.reset();
    }

    renderDeliverableList(deliverableList, info.deliverables);
  }

  function initAdminPage() {
    const clients = loadClients();
    const loginView = document.getElementById('adminLoginView');
    const dashboardView = document.getElementById('adminDashboard');
    const loginForm = document.getElementById('adminLoginForm');
    const loginError = document.getElementById('adminLoginError');
    const clientSelect = document.getElementById('clientSelect');
    const taskForm = document.getElementById('newTaskForm');
    const successAlert = document.getElementById('taskSuccess');
    const taskList = document.getElementById('adminTaskList');
    const projectMetaPanel = document.getElementById('projectMetaPanel');
    const projectMetaForm = document.getElementById('projectMetaForm');
    const projectMetaSuccess = document.getElementById('projectMetaSuccess');
    const deliverableForm = document.getElementById('deliverableForm');
    const deliverableList = document.getElementById('deliverableList');
    const logoutButtons = [document.getElementById('adminLogout'), document.getElementById('adminLogoutTop')].filter(
      Boolean,
    );

    populateClientSelect(clientSelect, clients);

    logoutButtons.forEach((button) => {
      button.addEventListener('click', () => {
        handleAdminLogout();
        setVisibility(dashboardView, false);
        setVisibility(loginView, true);
        logoutButtons.forEach((btn) => (btn.style.display = 'none'));
        showAlert(successAlert, false);
        showAlert(projectMetaSuccess, false);
        renderProjectMeta(projectMetaPanel, null);
        if (loginForm) loginForm.reset();
      });
    });

    function showDashboard() {
      setVisibility(loginView, false);
      setVisibility(dashboardView, true);
      logoutButtons.forEach((btn) => (btn.style.display = 'inline-flex'));
      if (clientSelect && !clientSelect.value) {
        clientSelect.selectedIndex = 0;
      }
      const activeClient = clientSelect && clientSelect.value ? getClientById(clientSelect.value) : null;
      renderProjectMeta(projectMetaPanel, activeClient);
      showAlert(projectMetaSuccess, false);
      showAlert(successAlert, false);
    }

    if (sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true') {
      showDashboard();
    }

    if (loginForm) {
      loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(loginForm);
        const email = formData.get('email');
        const password = formData.get('password');
        const valid =
          email && password && email.trim().toLowerCase() === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password;

        if (valid) {
          showAlert(loginError, false);
          handleAdminLogin();
          showDashboard();
        } else {
          showAlert(loginError, true);
        }
      });
    }

    if (clientSelect) {
      clientSelect.addEventListener('change', (event) => {
        const selectedClient = getClientById(event.target.value);
        renderAdminTaskList(taskList, selectedClient);
        showAlert(successAlert, false);
        showAlert(projectMetaSuccess, false);
        renderProjectMeta(projectMetaPanel, selectedClient);
      });
    }

    if (taskForm) {
      taskForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!clientSelect || !clientSelect.value) return;
        const formData = new FormData(taskForm);
        const task = {
          title: formData.get('title'),
          description: formData.get('description'),
          status: formData.get('status'),
          progress: Math.min(100, Math.max(0, Number(formData.get('progress') || 0))),
          startDate: formData.get('startDate') || '',
          dueDate: formData.get('dueDate') || '',
        };

        addTaskToClient(clientSelect.value, task);
        const updatedClient = getClientById(clientSelect.value);
        renderAdminTaskList(taskList, updatedClient);
        taskForm.reset();
        taskForm.querySelector('#taskStatus').value = 'in-progress';
        taskForm.querySelector('#taskProgress').value = 25;
        showAlert(successAlert, true);
        renderProjectMeta(projectMetaPanel, updatedClient);
      });
    }

    if (projectMetaForm) {
      projectMetaForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const clientId = projectMetaForm.dataset.clientId;
        if (!clientId) return;

        const formData = new FormData(projectMetaForm);
        updateClientProjectInfo(clientId, {
          startDate: formData.get('startDate') || '',
          endDate: formData.get('endDate') || '',
          contractUrl: formData.get('contractUrl') || '',
        });

        const updatedClient = getClientById(clientId);
        renderProjectMeta(projectMetaPanel, updatedClient);
        renderAdminTaskList(taskList, updatedClient);
        showAlert(projectMetaSuccess, true);
      });
    }

    if (deliverableForm && deliverableList) {
      deliverableForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const clientId = deliverableForm.dataset.clientId;
        if (!clientId) return;

        const formData = new FormData(deliverableForm);
        const title = (formData.get('title') || '').toString().trim();
        const url = (formData.get('url') || '').toString().trim();
        if (!title || !url) return;

        addDeliverableToClient(clientId, { title, url });
        const updatedClient = getClientById(clientId);
        renderProjectMeta(projectMetaPanel, updatedClient);
        deliverableForm.reset();
        showAlert(projectMetaSuccess, true);
      });

      deliverableList.addEventListener('click', (event) => {
        const button = event.target.closest('.deliverable-remove');
        if (!button) return;
        const fallbackClientId = projectMetaForm ? projectMetaForm.dataset.clientId : '';
        const clientId = deliverableForm.dataset.clientId || fallbackClientId;
        if (!clientId) return;
        const deliverableId = button.dataset.deliverableId;
        if (!deliverableId) return;

        removeDeliverableFromClient(clientId, deliverableId);
        const updatedClient = getClientById(clientId);
        renderProjectMeta(projectMetaPanel, updatedClient);
        showAlert(projectMetaSuccess, true);
      });
    }

    if (taskList) {
      taskList.addEventListener('input', (event) => {
        if (event.target.classList.contains('admin-progress')) {
          const wrapper = event.target.closest('.inline-control');
          const valueLabel = wrapper?.querySelector('.admin-progress-value');
          if (valueLabel) {
            valueLabel.textContent = `${event.target.value}%`;
          }
        }
      });

      taskList.addEventListener('click', (event) => {
        const button = event.target.closest('.admin-save');
        if (!button || !clientSelect || !clientSelect.value) return;
        const card = button.closest('.admin-task-card');
        if (!card) return;
        const taskId = card.dataset.taskId;
        const status = card.querySelector('.admin-status')?.value || 'in-progress';
        const progress = Number(card.querySelector('.admin-progress')?.value || 0);
        const startDate = card.querySelector('.admin-start-date')?.value || '';
        const dueDate = card.querySelector('.admin-due-date')?.value || '';

        updateTaskOnClient(clientSelect.value, taskId, {
          status,
          progress: Math.min(100, Math.max(0, progress)),
          startDate,
          dueDate,
        });

        const updatedClient = getClientById(clientSelect.value);
        renderAdminTaskList(taskList, updatedClient);
        renderProjectMeta(projectMetaPanel, updatedClient);
        showAlert(successAlert, true);
      });
    }
  }

  window.BXDashboard = {
    initClientPage,
    initAdminPage,
  };
})();
