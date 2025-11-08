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
      tasks: [
        {
          id: 'task-001',
          title: 'Performance campaign roll-out',
          description: 'Launch paid campaigns across UAE & Saudi with localized messaging and remarketing.',
          status: 'in-progress',
          progress: 55,
          dueDate: '2024-08-12',
          updatedAt: '2024-07-02T09:00:00Z',
        },
        {
          id: 'task-002',
          title: 'Creative production refresh',
          description: 'Deliver fresh lifestyle visuals for the Q3 automotive storyboards.',
          status: 'completed',
          progress: 100,
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
      tasks: [
        {
          id: 'task-003',
          title: 'Showroom reveal teaser',
          description: 'Storyboard, shoot, and edit teaser clips for the upcoming dealership reveal.',
          status: 'in-progress',
          progress: 40,
          dueDate: '2024-07-22',
          updatedAt: '2024-06-29T18:45:00Z',
        },
        {
          id: 'task-004',
          title: 'Owner testimonial series',
          description: 'Capture client testimonials to highlight the Titanium Auto experience.',
          status: 'not-started',
          progress: 0,
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
          dueDate: formData.get('dueDate') || '',
        };

        addTaskToClient(clientSelect.value, task);
        const updatedClient = getClientById(clientSelect.value);
        renderAdminTaskList(taskList, updatedClient);
        taskForm.reset();
        taskForm.querySelector('#taskStatus').value = 'in-progress';
        taskForm.querySelector('#taskProgress').value = 25;
        showAlert(successAlert, true);
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
        const dueDate = card.querySelector('.admin-due-date')?.value || '';

        updateTaskOnClient(clientSelect.value, taskId, {
          status,
          progress: Math.min(100, Math.max(0, progress)),
          dueDate,
        });

        const updatedClient = getClientById(clientSelect.value);
        renderAdminTaskList(taskList, updatedClient);
        showAlert(successAlert, true);
      });
    }
  }

  window.BXDashboard = {
    initClientPage,
    initAdminPage,
  };
})();
