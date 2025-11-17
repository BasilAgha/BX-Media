(function () {
  const STORAGE_KEY = 'bxMediaClients';
  const ADMINS_KEY = 'bxMediaAdmins';
  const CLIENT_SESSION_KEY = 'bxMediaActiveClient';
  const ADMIN_SESSION_KEY = 'bxMediaAdminActive';

  // Start empty; admins add clients via the console
  const DEFAULT_CLIENTS = [];
  const DEFAULT_ADMINS = [
    {
      id: 'admin-default',
      username: 'bxmediaadmin',
      passwordHash: '552ff6441610b4e92a525701a09f887919aa04d8873128ea51ed769f541ff65b',
    },
  ];

  const STATUS_LABELS = {
    'not-started': 'Not started',
    'in-progress': 'In progress',
    completed: 'Completed',
    blocked: 'Blocked',
  };

  const STATUS_ORDER = ['not-started', 'in-progress', 'blocked', 'completed'];

  // Crypto helper for password hashing
  async function sha256(text) {
    if (!window.crypto?.subtle) return text; // fallback for unsupported environments
    const msgUint8 = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
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

  function migrateClientsSchema(clients) {
    let changed = false;
    clients.forEach((client) => {
      const fallbackUsername = (client.username || client.email || '')
        .toString()
        .trim();
      if (!client.username && fallbackUsername) {
        client.username = fallbackUsername;
        changed = true;
      }
      // Carry forward legacy plain password for admin visibility
      if (client.password && !client.passwordPlain) {
        client.passwordPlain = client.password;
        changed = true;
      }
      if (Array.isArray(client.tasks) && !Array.isArray(client.projects)) {
        client.projects = [
          {
            id: `project-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: 'General',
            description: 'Migrated from legacy tasks',
            status: 'in-progress',
            progress: 0,
            driveLink: '',
            comments: [],
            tasks: client.tasks.slice(),
          },
        ];
        delete client.tasks;
        changed = true;
      }
      if (!Array.isArray(client.projects)) client.projects = [];
    });
    if (changed) saveClients(clients);
    return clients;
  }

  function loadClients() {
    const data = ensureDefaultData();
    const migrated = migrateClientsSchema(data);
    const cleaned = cleanupDemoClients(migrated);
    return JSON.parse(JSON.stringify(cleaned));
  }

  function saveClients(clients) {
    if (!window.localStorage) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  }

  // Remove any legacy demo data that may still exist in localStorage
  function cleanupDemoClients(clients) {
    try {
      const before = clients.length;
      const blacklistIdentifiers = new Set([
        'zeetex@partner.com',
        'projects@titaniumauto.com',
        'zeetex',
        'titaniumauto',
      ]);
      const filtered = clients.filter((c) => {
        const identifier = (c.username || c.email || '')
          .toString()
          .trim()
          .toLowerCase();
        const name = (c.name || '').trim().toLowerCase();
        if (identifier && blacklistIdentifiers.has(identifier)) return false;
        if (name.includes('zeetex') || name.includes('titanium auto')) return false;
        // Old demo entries stored plain passwords
        if (typeof c.password === 'string' && c.password.length) return false;
        return true;
      });
      if (filtered.length !== before) saveClients(filtered);
      return filtered;
    } catch (_) {
      return clients;
    }
  }

  function ensureDefaultAdmins() {
    if (!window.localStorage) {
      return DEFAULT_ADMINS.slice();
    }

    const stored = localStorage.getItem(ADMINS_KEY);
    if (!stored) {
      localStorage.setItem(ADMINS_KEY, JSON.stringify(DEFAULT_ADMINS));
      return DEFAULT_ADMINS.slice();
    }

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      console.error('Unable to parse stored admin data. Resetting to default admin.', error);
    }

    localStorage.setItem(ADMINS_KEY, JSON.stringify(DEFAULT_ADMINS));
    return DEFAULT_ADMINS.slice();
  }

  function loadAdmins() {
    const admins = ensureDefaultAdmins();
    return JSON.parse(JSON.stringify(admins));
  }

  function saveAdmins(admins) {
    if (!window.localStorage) return;
    const list = Array.isArray(admins) ? admins.slice(0, 1) : [];
    localStorage.setItem(ADMINS_KEY, JSON.stringify(list));
  }

  function getClientById(id) {
    const clients = loadClients();
    return clients.find((client) => client.id === id) || null;
  }

  async function getClientByCredentials(username, password) {
    const clients = loadClients();
    const normalizedUsername = (username || '').trim().toLowerCase();
    const hash = await sha256(password || '');
    const found = clients.find((client) => (client.username || '').trim().toLowerCase() === normalizedUsername);
    if (!found) return null;
    if (found.passwordHash) return found.passwordHash === hash ? found : null;
    return found.password && found.password === password ? found : null;
  }

  async function isAdminCredentials(username, password) {
    const admins = loadAdmins();
    const normalizedUsername = (username || '').trim().toLowerCase();
    const hash = await sha256(password || '');
    return admins.some((a) => (a.username || '').trim().toLowerCase() === normalizedUsername && a.passwordHash === hash);
  }

  function getActiveProject(client, projectId) {
    if (!client) return null;
    if (!Array.isArray(client.projects) || client.projects.length === 0) return null;
    if (!projectId) return client.projects[0];
    return client.projects.find((p) => p.id === projectId) || client.projects[0];
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

  function projectStatusBadge(status) {
    return `<span class="badge ${status}">${STATUS_LABELS[status] || status}</span>`;
  }

  function computeProjectProgress(project) {
    if (!project || !Array.isArray(project.tasks) || project.tasks.length === 0) return 0;
    const vals = project.tasks.map((t) => Math.max(0, Math.min(100, Number(t.progress || 0))));
    const sum = vals.reduce((a, b) => a + b, 0);
    return Math.round(sum / vals.length);
  }

  function setProjectProgressFromTasks(clientId, projectId) {
    const clients = loadClients();
    const c = clients.find((x) => x.id === clientId);
    if (!c || !Array.isArray(c.projects)) return null;
    const p = c.projects.find((pp) => pp.id === projectId);
    if (!p) return null;
    p.progress = computeProjectProgress(p);
    saveClients(clients);
    return p.progress;
  }

  function renderClientProjects(container, projects) {
    if (!container) return;
    container.innerHTML = '';
    if (!Array.isArray(projects) || projects.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'task-empty';
      empty.textContent = 'No projects yet. Your team will add updates soon.';
      container.appendChild(empty);
      return;
    }

    projects.forEach((project) => {
      const card = document.createElement('article');
      card.className = 'project-card';
      const comments = Array.isArray(project.comments) ? project.comments.length : 0;

      const computedProgress = computeProjectProgress(project);
      card.innerHTML = `
        <header>
          <div>
            <h3>${project.name}</h3>
            <p class="helper-text">${project.description || ''}</p>
          </div>
          ${projectStatusBadge(project.status || 'in-progress')}
        </header>
        <div class="project-meta">
          <div class="progress-wrapper">
            <progress max="100" value="${computedProgress}"></progress>
            <span>${computedProgress}%</span>
          </div>
          ${
            project.driveLink
              ? `<a href="${project.driveLink}" target="_blank" rel="noopener noreferrer" class="secondary-btn pill-btn">Drive</a>`
              : ''
          }
        </div>
        <div>
          <h4 class="timeline-title">Timeline</h4>
          <div class="timeline">
            ${
              (project.tasks || [])
                .slice()
                .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0))
                .map(
                  (t) => `
                  <div class="timeline-item">
                    <strong>${t.title}</strong>
                    <small>${formatDate(t.dueDate)} • ${STATUS_LABELS[t.status] || t.status} • ${t.progress || 0}%</small>
                  </div>`,
                )
                .join('') || '<div class="helper-text">No tasks scheduled.</div>'
            }
          </div>
        </div>
        <div class="helper-text">${comments} comment${comments === 1 ? '' : 's'}</div>
      `;
      container.appendChild(card);
    });
  }

  function renderClientDirectory(container) {
    if (!container) return;
    const clients = loadClients();
    if (!clients.length) {
      container.innerHTML = '<div class="task-empty">No clients added yet.</div>';
      return;
    }
    const table = document.createElement('table');
    table.className = 'task-list';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Client</th>
          <th>Username</th>
          <th>Password</th>
        </tr>
      </thead>
    `;
    const tbody = document.createElement('tbody');
    clients.forEach((c) => {
      const row = document.createElement('tr');
      const pwd = c.passwordPlain ? c.passwordPlain : '<span class="helper-text">Unavailable</span>';
      row.innerHTML = `
        <td><strong>${c.name || ''}</strong></td>
        <td>${c.username || ''}</td>
        <td>${pwd}</td>
      `;
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
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
    const usernameInput = document.getElementById('clientUsername');
    if (loginForm) {
      loginForm.setAttribute('novalidate', 'novalidate');
    }
    if (usernameInput) {
      usernameInput.setAttribute('type', 'text');
      usernameInput.setAttribute('inputmode', 'text');
      usernameInput.setAttribute('autocomplete', 'username');
      usernameInput.setAttribute('placeholder', usernameInput.getAttribute('placeholder') || 'your.username');
    }
    const summaryContainer = document.getElementById('clientSummary');
    const tasksContainer = document.getElementById('clientTasks');
    const projectsContainer = document.getElementById('clientProjects');
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
      const allTasks = (latestClient.projects || []).flatMap((p) => p.tasks || []);
      subtitle.textContent = allTasks.length
        ? 'Here is the latest on your active projects.'
        : 'We will add your first project update soon.';

      renderSummary(summaryContainer, computeSummary(allTasks));
      if (projectsContainer) renderClientProjects(projectsContainer, latestClient.projects || []);
      if (tasksContainer) {
        tasksContainer.innerHTML = '';
        if ((!latestClient.projects || latestClient.projects.length === 0) && Array.isArray(latestClient.tasks)) {
          renderClientTasks(tasksContainer, latestClient.tasks || []);
        }
      }
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
      loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(loginForm);
        const username = (formData.get('username') || '').toString();
        const password = (formData.get('password') || '').toString();
        const role = formData.get('role') || 'client';

        if (role === 'admin') {
  if (await isAdminCredentials(username, password)) {
    handleAdminLogin();
    showAlert(loginError, false);

    // Hide client login, show admin interface on the same page
    const loginView = document.getElementById('clientLoginView');
    const clientDashboard = document.getElementById('clientDashboard');
    if (loginView) loginView.style.display = 'none';
    if (clientDashboard) clientDashboard.style.display = 'none';

    if (window.BXDashboard && window.BXDashboard.initAdminPage) {
      window.BXDashboard.initAdminPage();
    }
  } else {
    showAlert(loginError, true);
  }
  return;
}


        if (role === 'client') {
          const client = await getClientByCredentials(username, password);
          if (client) {
            showAlert(loginError, false);
            showClientDashboard(client);
          } else {
            showAlert(loginError, true);
          }
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
    saveClients(clients);
    return task;
  }

  // Project-scoped task helpers
  function addTaskToProject(clientId, projectId, task) {
    const clients = loadClients();
    const target = clients.find((client) => client.id === clientId);
    if (!target || !Array.isArray(target.projects)) return null;
    const project = target.projects.find((p) => p.id === projectId);
    if (!project) return null;

    const newTask = { id: `task-${Date.now()}`, updatedAt: new Date().toISOString(), ...task };
    project.tasks = Array.isArray(project.tasks) ? project.tasks : [];
    project.tasks.unshift(newTask);
    project.progress = computeProjectProgress(project);
    saveClients(clients);
    return newTask;
  }

  function updateTaskOnProject(clientId, projectId, taskId, updates) {
    const clients = loadClients();
    const target = clients.find((client) => client.id === clientId);
    if (!target || !Array.isArray(target.projects)) return null;
    const project = target.projects.find((p) => p.id === projectId);
    if (!project || !Array.isArray(project.tasks)) return null;
    const task = project.tasks.find((t) => t.id === taskId);
    if (!task) return null;
    Object.assign(task, updates, { updatedAt: new Date().toISOString() });
    project.progress = computeProjectProgress(project);
    saveClients(clients);
    return task;
  }

  // Delete helpers
  function deleteClient(clientId) {
    const clients = loadClients();
    const next = clients.filter((c) => c.id !== clientId);
    saveClients(next);
    return true;
  }

  function deleteProjectFromClient(clientId, projectId) {
    const clients = loadClients();
    const target = clients.find((c) => c.id === clientId);
    if (!target || !Array.isArray(target.projects)) return false;
    target.projects = target.projects.filter((p) => p.id !== projectId);
    saveClients(clients);
    return true;
  }

  function deleteTaskFromProject(clientId, projectId, taskId) {
    const clients = loadClients();
    const target = clients.find((c) => c.id === clientId);
    if (!target || !Array.isArray(target.projects)) return false;
    const project = target.projects.find((p) => p.id === projectId);
    if (!project || !Array.isArray(project.tasks)) return false;
    project.tasks = project.tasks.filter((t) => t.id !== taskId);
    project.progress = computeProjectProgress(project);
    saveClients(clients);
    return true;
  }

  function renderAdminTaskList(container, client, project) {
    if (!container) return;
    container.innerHTML = '';

    if (!client) {
      const empty = document.createElement('div');
      empty.className = 'task-empty';
      empty.textContent = 'Select a client to view and manage their tasks.';
      container.appendChild(empty);
      return;
    }

    const tasks = Array.isArray(project?.tasks) ? project.tasks.slice() : [];
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
          <div class="form-grid compact-grid">
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
              <label>Target date</label>
              <input type="date" value="${task.dueDate ? task.dueDate : ''}" class="admin-due-date" />
            </div>
          </div>
          <div class="inline-actions">
            <button type="button" class="danger-btn admin-delete" data-task-id="${task.id}">Delete</button>
            <button type="button" class="secondary-btn admin-save" data-task-id="${task.id}">Save changes</button>
          </div>
        `;

        container.appendChild(card);
      });
  }

  function initAdminPage() {
    const clients = loadClients();
    const loginView = document.getElementById('adminLoginView');
    const dashboardView = document.getElementById('adminDashboard');
    const loginForm = document.getElementById('adminLoginForm');
    const loginError = document.getElementById('adminLoginError');
    const setupView = document.getElementById('adminSetupView');
    const setupForm = document.getElementById('adminSetupForm');
    const setupError = document.getElementById('adminSetupError');
    const clientSelect = document.getElementById('clientSelect');
    const projectSelect = document.getElementById('projectSelect');
    const projectMeta = document.getElementById('projectMeta');
    const projectDriveLink = document.getElementById('projectDriveLink');
    const projectStatus = document.getElementById('projectStatus');
    const projectProgress = document.getElementById('projectProgress');
    const projectProgressValue = document.getElementById('projectProgressValue');
    const saveProjectMetaBtn = document.getElementById('saveProjectMeta');
    const newClientForm = document.getElementById('newClientForm');
    const newProjectForm = document.getElementById('newProjectForm');
    const tabExisting = document.getElementById('tabExisting');
    const tabNew = document.getElementById('tabNew');
    const existingClientPanel = document.getElementById('existingClientPanel');
    const newClientPanel = document.getElementById('newClientPanel');
    const resetDataBtn = document.getElementById('resetDataBtn');
    const deleteAdminBtn = document.getElementById('deleteAdminBtn');
    const taskForm = document.getElementById('newTaskForm');
    const successAlert = document.getElementById('taskSuccess');
    const taskList = document.getElementById('adminTaskList');
    const commentsList = document.getElementById('adminCommentsList');
    const newCommentForm = document.getElementById('newCommentForm');
    const logoutButtons = [document.getElementById('adminLogout'), document.getElementById('adminLogoutTop')].filter(
      Boolean,
    );

    function populateProjectsSelect(selectEl, client) {
      if (!selectEl) return;
      selectEl.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select a project';
      placeholder.disabled = true;
      placeholder.selected = true;
      selectEl.appendChild(placeholder);
      (client?.projects || []).forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        selectEl.appendChild(opt);
      });
    }

    function renderComments(listEl, project) {
      if (!listEl) return;
      listEl.innerHTML = '';
      const comments = Array.isArray(project?.comments) ? project.comments : [];
      if (!comments.length) {
        const empty = document.createElement('div');
        empty.className = 'task-empty';
        empty.textContent = 'No comments yet.';
        listEl.appendChild(empty);
        return;
      }
      comments.forEach((c) => {
        const item = document.createElement('div');
        item.className = 'comment-item';
        item.innerHTML = `<div>${c.text || ''}</div><small>${formatDateTime(c.at)}</small>`;
        listEl.appendChild(item);
      });
    }

    populateClientSelect(clientSelect, clients);

    function setTab(mode) {
      const showExisting = mode === 'existing';
      if (existingClientPanel) existingClientPanel.style.display = showExisting ? '' : 'none';
      if (newClientPanel) newClientPanel.style.display = showExisting ? 'none' : '';
      if (tabExisting) tabExisting.classList.toggle('active', showExisting);
      if (tabNew) tabNew.classList.toggle('active', !showExisting);
    }

    setTab('existing');
    if (tabExisting) tabExisting.addEventListener('click', () => setTab('existing'));
    if (tabNew) tabNew.addEventListener('click', () => setTab('new'));

    logoutButtons.forEach((button) => {
      button.addEventListener('click', () => {
        handleAdminLogout();
        setVisibility(dashboardView, false);
        setVisibility(loginView, true);
        logoutButtons.forEach((btn) => (btn.style.display = 'none'));
        showAlert(successAlert, false);
        if (loginForm) loginForm.reset();
      });
    });

    function showDashboard() {
      setVisibility(loginView, false);
      setVisibility(dashboardView, true);
      logoutButtons.forEach((btn) => (btn.style.display = 'inline-flex'));
      if (clientSelect && !clientSelect.value) clientSelect.selectedIndex = 0;
      const selectedClient = getClientById(clientSelect?.value);
      populateProjectsSelect(projectSelect, selectedClient);
      if (projectMeta) projectMeta.style.display = projectSelect?.value ? '' : 'none';
      const dir = document.getElementById('clientDirectory');
      if (dir) renderClientDirectory(dir);
    }

    // First-time admin setup or redirect if not logged in
const admins = loadAdmins();
if (!admins.length) {
  // First-time: show admin setup on this same page
  setVisibility(loginView, false);
  setVisibility(dashboardView, false);
  setVisibility(setupView, true);
} else if (sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true') {
  // Logged-in admin: show dashboard
  showDashboard();
} else {
  // Not logged in as admin: do nothing here.
  // Login is handled from the clientLoginView on the same page.
  return;
}


    if (setupForm) {
      setupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(setupForm);
        const username = (fd.get('username') || '').toString().trim();
        const password = (fd.get('password') || '').toString();
        const password2 = (fd.get('password2') || '').toString();
        if (!username || !password || password !== password2) {
          showAlert(setupError, true);
          return;
        }
        saveAdmins([{ username, passwordHash: await sha256(password) }]);
        showAlert(setupError, false);
        setVisibility(setupView, false);
        setVisibility(loginView, true);
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(loginForm);
        const username = (formData.get('username') || '').toString();
        const password = (formData.get('password') || '').toString();

        if (await isAdminCredentials(username, password)) {
          showAlert(loginError, false);
          handleAdminLogin();
          showDashboard();
          return;
        }

        const client = await getClientByCredentials(username, password);
        if (client) {
          window.location.href = 'client-dashboard.html';
        } else {
          showAlert(loginError, true);
        }
      });
    }

    if (clientSelect) {
      clientSelect.addEventListener('change', (event) => {
        const selectedClient = getClientById(event.target.value);
        if (projectSelect) {
          projectSelect.value = '';
          if (projectMeta) projectMeta.style.display = 'none';
          populateProjectsSelect(projectSelect, selectedClient);
        }
        renderAdminTaskList(taskList, selectedClient, null);
        showAlert(successAlert, false);
        if (commentsList) commentsList.innerHTML = '';
      });
    }

    if (projectSelect) {
      projectSelect.addEventListener('change', () => {
        const selectedClient = getClientById(clientSelect?.value);
        const project = getActiveProject(selectedClient, projectSelect.value);
        renderAdminTaskList(taskList, selectedClient, project);
        if (projectMeta) {
          projectMeta.style.display = project ? '' : 'none';
          if (project) {
            projectDriveLink.value = project.driveLink || '';
            projectStatus.value = project.status || 'in-progress';
            const computed = computeProjectProgress(project);
            if (projectProgress) {
              projectProgress.value = computed;
              projectProgress.setAttribute('disabled', 'true');
            }
            if (projectProgressValue) projectProgressValue.textContent = `${computed}%`;
          }
        }
        renderComments(commentsList, project);
        showAlert(successAlert, false);
      });
    }

    if (taskForm) {
      taskForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!clientSelect?.value || !projectSelect?.value) return;
        const formData = new FormData(taskForm);
        const task = {
          title: formData.get('title'),
          description: formData.get('description'),
          status: formData.get('status'),
          progress: Math.min(100, Math.max(0, Number(formData.get('progress') || 0))),
          dueDate: formData.get('dueDate') || '',
        };

        addTaskToProject(clientSelect.value, projectSelect.value, task);
        const updatedClient = getClientById(clientSelect.value);
        const project = getActiveProject(updatedClient, projectSelect.value);
        renderAdminTaskList(taskList, updatedClient, project);
        taskForm.reset();
        taskForm.querySelector('#taskStatus').value = 'in-progress';
        taskForm.querySelector('#taskProgress').value = 25;
        showAlert(successAlert, true);
      });
    }

    if (newClientForm) {
      newClientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(newClientForm);
        const name = (fd.get('name') || '').toString().trim();
        const username = (fd.get('username') || '').toString().trim();
        const password = (fd.get('password') || '').toString();
        if (!name || !username || !password) return;
        const client = {
          id: `client-${Date.now()}`,
          name,
          username,
          passwordHash: await sha256(password),
          passwordPlain: password,
          projects: [],
        };
        const added = (function(){ return client; })();
        // persist
        const list = loadClients(); list.push(added); saveClients(list);
        populateClientSelect(clientSelect, loadClients());
        const dir = document.getElementById('clientDirectory');
        if (dir) renderClientDirectory(dir);
        newClientForm.reset();
        setTab('existing');
      });
    }

    if (newProjectForm) {
      newProjectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!clientSelect?.value) return;
        const fd = new FormData(newProjectForm);
        const project = {
          name: fd.get('name'),
          description: fd.get('description') || '',
          status: fd.get('status') || 'in-progress',
          progress: 0,
          driveLink: fd.get('driveLink') || '',
        };
        const p = (function(){ return project; })();
        // persist
        const list = loadClients();
        const c = list.find((x) => x.id === clientSelect.value);
        if (c) {
          c.projects = Array.isArray(c.projects) ? c.projects : [];
          c.projects.unshift({ id: `project-${Date.now()}`, comments: [], tasks: [], ...p });
          saveClients(list);
        }
        const updated = getClientById(clientSelect.value);
        if (projectSelect) {
          projectSelect.innerHTML = '';
          const ph = document.createElement('option');
          ph.value = '';
          ph.textContent = 'Select a project';
          ph.disabled = true;
          projectSelect.appendChild(ph);
          (updated.projects || []).forEach((proj) => {
            const opt = document.createElement('option');
            opt.value = proj.id;
            opt.textContent = proj.name;
            projectSelect.appendChild(opt);
          });
          projectSelect.value = updated.projects[0]?.id || '';
          projectSelect.dispatchEvent(new Event('change'));
        }
        newProjectForm.reset();
      });
    }

    if (saveProjectMetaBtn) {
      saveProjectMetaBtn.addEventListener('click', () => {
        if (!clientSelect?.value || !projectSelect?.value) return;
        const clients = loadClients();
        const target = clients.find((c) => c.id === clientSelect.value);
        const project = target?.projects?.find((p) => p.id === projectSelect.value);
        if (project) {
          project.driveLink = projectDriveLink.value || '';
          project.status = projectStatus.value || 'in-progress';
          project.progress = computeProjectProgress(project);
          saveClients(clients);
        }
        const updatedClient = getClientById(clientSelect.value);
        const proj = getActiveProject(updatedClient, projectSelect.value);
        if (commentsList) {
          // refresh comments list remains the same
          commentsList.innerHTML = '';
          if (Array.isArray(proj?.comments)) {
            proj.comments.forEach((c) => {
              const item = document.createElement('div');
              item.className = 'comment-item';
              item.innerHTML = `<div>${c.text || ''}</div><small>${formatDateTime(c.at)}</small>`;
              commentsList.appendChild(item);
            });
          }
        }
        showAlert(successAlert, true);
      });
    }

    if (projectProgress) {
      projectProgress.setAttribute('disabled', 'true');
    }

    if (newCommentForm) {
      newCommentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = (document.getElementById('commentText')?.value || '').trim();
        if (!text || !clientSelect?.value || !projectSelect?.value) return;
        const clients = loadClients();
        const target = clients.find((c) => c.id === clientSelect.value);
        const proj = target?.projects?.find((p) => p.id === projectSelect.value);
        if (!Array.isArray(proj.comments)) proj.comments = [];
        proj.comments.unshift({ id: `comment-${Date.now()}`, text, at: new Date().toISOString() });
        saveClients(clients);
        // refresh
        if (commentsList) {
          const item = document.createElement('div');
          item.className = 'comment-item';
          item.innerHTML = `<div>${text}</div><small>${formatDateTime(new Date().toISOString())}</small>`;
          commentsList.prepend(item);
        }
        const txt = document.getElementById('commentText');
        if (txt) txt.value = '';
      });
    }

    // Delete client and project
    const deleteClientBtn = document.getElementById('deleteClientBtn');
    const deleteProjectBtn = document.getElementById('deleteProjectBtn');

    if (deleteClientBtn) {
      deleteClientBtn.addEventListener('click', () => {
        if (!clientSelect?.value) return;
        const client = getClientById(clientSelect.value);
        if (!client) return;
        if (!confirm(`Delete client "${client.name}" and all projects?`)) return;
        deleteClient(client.id);
        populateClientSelect(clientSelect, loadClients());
        if (projectSelect) projectSelect.innerHTML = '';
        if (projectMeta) projectMeta.style.display = 'none';
        if (taskList) taskList.innerHTML = '<div class="task-empty">Select a client to view and manage their tasks.</div>';
        if (commentsList) commentsList.innerHTML = '<div class="task-empty">No comments yet.</div>';
      });
    }

    if (deleteProjectBtn) {
      deleteProjectBtn.addEventListener('click', () => {
        if (!clientSelect?.value || !projectSelect?.value) return;
        const selectedClient = getClientById(clientSelect.value);
        const project = getActiveProject(selectedClient, projectSelect.value);
        if (!project) return;
        if (!confirm(`Delete project "${project.name}" and all its tasks?`)) return;
        deleteProjectFromClient(clientSelect.value, projectSelect.value);
        // repopulate projects
        const refreshed = getClientById(clientSelect.value);
        if (projectSelect) {
          projectSelect.innerHTML = '';
          const ph = document.createElement('option');
          ph.value = '';
          ph.textContent = 'Select a project';
          ph.disabled = true;
          projectSelect.appendChild(ph);
          (refreshed?.projects || []).forEach((proj) => {
            const opt = document.createElement('option');
            opt.value = proj.id;
            opt.textContent = proj.name;
            projectSelect.appendChild(opt);
          });
        }
        if (projectMeta) projectMeta.style.display = 'none';
        if (taskList) taskList.innerHTML = '<div class="task-empty">No updates yet.</div>';
        if (commentsList) commentsList.innerHTML = '<div class="task-empty">No comments yet.</div>';
        const dir = document.getElementById('clientDirectory');
        if (dir) renderClientDirectory(dir);
      });
    }

if (deleteAdminBtn) {
  deleteAdminBtn.addEventListener('click', () => {
    if (!confirm('Delete the current admin and return to setup?')) return;
    saveAdmins([]);
    handleAdminLogout();
    // Show setup view again on the same page
    setVisibility(dashboardView, false);
    setVisibility(setupView, true);
  });
}

    if (resetDataBtn) {
      resetDataBtn.addEventListener('click', () => {
        if (!confirm('This will remove ALL clients and projects. Continue?')) return;
        localStorage.removeItem(STORAGE_KEY);
        populateClientSelect(clientSelect, loadClients());
        if (projectSelect) projectSelect.innerHTML = '';
        if (projectMeta) projectMeta.style.display = 'none';
        if (taskList) taskList.innerHTML = '<div class="task-empty">No updates yet.</div>';
        if (commentsList) commentsList.innerHTML = '<div class="task-empty">No comments yet.</div>';
        showAlert(successAlert, false);
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
        const saveBtn = event.target.closest('.admin-save');
        const delBtn = event.target.closest('.admin-delete');
        if (!clientSelect?.value || !projectSelect?.value) return;
        const card = event.target.closest('.admin-task-card');
        if (!card) return;
        const taskId = card.dataset.taskId;

        if (delBtn) {
          if (!confirm('Delete this task?')) return;
          deleteTaskFromProject(clientSelect.value, projectSelect.value, taskId);
        } else if (saveBtn) {
          const status = card.querySelector('.admin-status')?.value || 'in-progress';
          const progress = Number(card.querySelector('.admin-progress')?.value || 0);
          const dueDate = card.querySelector('.admin-due-date')?.value || '';
          updateTaskOnProject(clientSelect.value, projectSelect.value, taskId, {
            status,
            progress: Math.min(100, Math.max(0, progress)),
            dueDate,
          });
        } else {
          return;
        }

        const updatedClient = getClientById(clientSelect.value);
        const project = getActiveProject(updatedClient, projectSelect.value);
        renderAdminTaskList(taskList, updatedClient, project);
        showAlert(successAlert, true);
      });
    }
  }

    // Overview stats update
  function updateOverviewStats() {
    const clients = loadClients();
    let totalProjects = 0;
    let totalTasks = 0;
    let completedTasks = 0;

    clients.forEach(client => {
      if (Array.isArray(client.projects)) {
        totalProjects += client.projects.length;
        client.projects.forEach(project => {
          if (Array.isArray(project.tasks)) {
            totalTasks += project.tasks.length;
            completedTasks += project.tasks.filter(t => t.status === 'completed').length;
          }
        });
      }
    });

    const statClients = document.getElementById('statClients');
    const statProjects = document.getElementById('statProjects');
    const statTasks = document.getElementById('statTasks');
    const statCompleted = document.getElementById('statCompleted');

    if (statClients) statClients.textContent = clients.length;
    if (statProjects) statProjects.textContent = totalProjects;
    if (statTasks) statTasks.textContent = totalTasks;
    if (statCompleted) statCompleted.textContent = completedTasks;
  }

  // Expose all public functions
  window.BXDashboard = {
    initClientPage,
    initAdminPage,
    updateOverviewStats,
  };
})();
 
// Initialize overview stats when page loads
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.BXDashboard && window.BXDashboard.updateOverviewStats) {
      window.BXDashboard.updateOverviewStats();
    }
  }, 500);
});
