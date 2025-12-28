// BX Media Dashboard Core Logic
// Shared helpers: API, auth, utilities, sidebar wiring

(function() {
  const SESSION_KEY = "bxm_dashboard_session_v1";
  let cachedData = null;
  let firstLoadPending = true;
  let supabaseClient = null;

  function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    if (window.BXSupabase?.client) {
      supabaseClient = window.BXSupabase.client;
      return supabaseClient;
    }
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("Supabase client library not loaded");
    }
    supabaseClient = window.supabase.createClient(
      "https://lhtqlftxctxjguxhzvxq.supabase.co",
      "sb_publishable_3jTA4mBXkPdSESdaDarYdA_GGx-hh8h"
    );
    return supabaseClient;
  }

  function ensurePageLoader() {
    if (document.getElementById("pageLoader")) return;
    const mount = () => {
      if (document.getElementById("pageLoader")) return;
      const loader = document.createElement("div");
      loader.id = "pageLoader";
      loader.className = "page-loader";
      loader.innerHTML = `
        <div class="loader-skeleton" aria-hidden="true">
          <div class="skeleton skeleton-line" style="width:48%"></div>
          <div class="loader-bar"></div>
        </div>
        <div class="message" role="status" aria-live="polite">Loading...</div>
      `;
      document.body.appendChild(loader);
    };
    if (document.body) {
      mount();
    } else {
      document.addEventListener("DOMContentLoaded", mount);
    }
  }

  function showPageLoader(message) {
    ensurePageLoader();
    const loader = document.getElementById("pageLoader");
    if (!loader) return;
    const msg = loader.querySelector(".message");
    if (msg) msg.textContent = message || "Loading...";
    loader.classList.add("is-visible");
  }

  function hidePageLoader() {
    const loader = document.getElementById("pageLoader");
    if (!loader) return;
    loader.classList.remove("is-visible");
  }

  function setButtonLoading(btn, isLoading, loadingText) {
    if (!btn) return;
    const labelEl = btn.querySelector(".btn-text");
    if (!btn.dataset.defaultLabel) {
      if (labelEl) {
        btn.dataset.defaultLabel = labelEl.textContent.trim();
      } else {
        btn.dataset.defaultLabel = btn.textContent.trim();
      }
    }
    if (isLoading) {
      const nextLabel = loadingText || "Loading...";
      if (labelEl) {
        labelEl.textContent = nextLabel;
      } else {
        btn.textContent = nextLabel;
      }
    } else {
      const restore = btn.dataset.defaultLabel || "Submit";
      if (labelEl) {
        labelEl.textContent = restore;
      } else {
        btn.textContent = restore;
      }
    }
    btn.disabled = !!isLoading;
    btn.classList.toggle("is-loading", !!isLoading);
    btn.setAttribute("aria-busy", isLoading ? "true" : "false");
  }

  function renderSkeleton(container, type, count = 3) {
    if (!container) return;
    container.innerHTML = "";
    const classes = ["skeleton", `skeleton-${type}`];
    for (let i = 0; i < count; i += 1) {
      const item = document.createElement("div");
      item.className = classes.join(" ");
      container.appendChild(item);
    }
  }

  function unwrapBody(obj) {
    if (obj && typeof obj === "object" && "body" in obj && obj.body) return obj.body;
    return obj;
  }

  function logSessionStatus() {
    const sess = getLocalSession();
    if (sess) {
      console.log("SESSION FOUND", {
        username: sess.username,
        role: sess.role,
        client_id: sess.client_id,
      });
    } else {
      console.log("NO SESSION: redirecting to login");
      const path = (window.location.pathname.split("/").pop() || "").toLowerCase();
      if (path !== "login.html") {
        window.location.href = "login.html";
      }
    }
  }

  function warnRlsStatus() {
    console.warn(
      "RLS WARNING: Unable to verify from the client. Ensure Row Level Security is disabled on all tables."
    );
  }

  function withClientIdAliases(rows) {
    return (rows || []).map((row) => {
      if (!row || typeof row !== "object") return row;
      const next = { ...row };
      if (next.client_id !== undefined && next.clientId === undefined) next.clientId = next.client_id;
      if (next.client_name !== undefined && next.clientName === undefined) next.clientName = next.client_name;
      if (next.user_name !== undefined && next.username === undefined) next.username = next.user_name;
      if (next.created_at !== undefined && next.createdAt === undefined) next.createdAt = next.created_at;
      if (next.updated_at !== undefined && next.updatedAt === undefined) next.updatedAt = next.updated_at;
      if (next.project_id !== undefined && next.projectId === undefined) next.projectId = next.project_id;
      if (next.task_id !== undefined && next.taskId === undefined) next.taskId = next.task_id;
      if (next.deliverable_id !== undefined && next.deliverableId === undefined) next.deliverableId = next.deliverable_id;
      if (next.comment_id !== undefined && next.commentId === undefined) next.commentId = next.comment_id;
      return next;
    });
  }

  function getClientColumnMap(sample = {}) {
    return {
      clientId: sample.client_id !== undefined ? "client_id" : "clientId",
      clientName: sample.client_name !== undefined ? "client_name" : "clientName",
      username: sample.user_name !== undefined ? "user_name" : "username",
      createdAt: sample.created_at !== undefined ? "created_at" : "createdAt",
      updatedAt: sample.updated_at !== undefined ? "updated_at" : "updatedAt",
    };
  }

  async function apiGetAll(force = false, includeInactiveClients = false) {
    if (!force && cachedData) return cachedData;
    if (firstLoadPending) showPageLoader("Loading dashboard...");
    try {
      const supabase = getSupabaseClient();
      const sess = getLocalSession();
      if (!sess) {
        console.log("NO SESSION: redirecting to login");
        window.location.href = "login.html";
        throw new Error("Not authenticated");
      }

      warnRlsStatus();

      const isAdmin = sess.role === "admin";
      if (isAdmin) {
        console.log("ADMIN MODE");
      } else {
        console.log("CLIENT MODE", { client_id: sess.client_id });
      }

      const clientId = sess.client_id;
      let accountsRes;
      let clientsRes;
      let projectsRes;
      let tasksRes;
      let commentsRes;
      let deliverablesRes;

      if (isAdmin) {
        const requests = [
          supabase.from("accounts").select("*"),
          supabase.from("clients").select("*"),
          supabase.from("projects").select("*"),
          supabase.from("tasks").select("*"),
          supabase.from("comments").select("*"),
          supabase.from("deliverables").select("*"),
        ];
        const results = await Promise.all(requests);
        [accountsRes, clientsRes, projectsRes, tasksRes, commentsRes, deliverablesRes] = results;
        const firstError = results.find((res) => res.error)?.error;
        if (firstError) throw firstError;
      } else {
        accountsRes = await supabase.from("accounts").select("*").eq("username", sess.username);
        if (accountsRes.error) throw accountsRes.error;

        clientsRes = await supabase.from("clients").select("*").eq("client_id", clientId);
        if (clientsRes.error) throw clientsRes.error;

        projectsRes = await supabase.from("projects").select("*").eq("client_id", clientId);
        if (projectsRes.error) throw projectsRes.error;

        const projectIds = (projectsRes.data || []).map((row) => row.project_id || row.projectId).filter(Boolean);

        if (projectIds.length) {
          tasksRes = await supabase.from("tasks").select("*").in("project_id", projectIds);
          if (tasksRes.error) throw tasksRes.error;

          commentsRes = await supabase.from("comments").select("*").in("project_id", projectIds);
          if (commentsRes.error) throw commentsRes.error;

          deliverablesRes = await supabase.from("deliverables").select("*").in("project_id", projectIds);
          if (deliverablesRes.error) throw deliverablesRes.error;
        } else {
          tasksRes = { data: [] };
          commentsRes = { data: [] };
          deliverablesRes = { data: [] };
        }
      }

      const normalizedClients = validateClientsSchema(withClientIdAliases(clientsRes.data || []));
      cachedData = {
        ok: true,
        accounts: withClientIdAliases(accountsRes.data || []),
        clients: normalizedClients,
        projects: withClientIdAliases(projectsRes.data || []),
        tasks: withClientIdAliases(tasksRes.data || []),
        comments: withClientIdAliases(commentsRes.data || []),
        deliverables: withClientIdAliases(deliverablesRes.data || []),
      };

      return cachedData;
    } finally {
      if (firstLoadPending) {
        firstLoadPending = false;
        hidePageLoader();
      }
    }
  }

  async function apiPost(payload) {
    if (!payload || typeof payload !== "object") {
      return { ok: false, error: "Invalid payload" };
    }

    const supabase = getSupabaseClient();

    if (payload.action === "login") {
      cachedData = null;
      const username = String(payload.username || "").trim();
      const password = String(payload.password || "");
      console.log("LOGIN QUERY", { username });
      const response = await supabase
        .from("accounts")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .eq("status", "active")
        .maybeSingle();
      console.log("LOGIN RESPONSE", { data: response.data, error: response.error });

      if (response.error) {
        console.log("LOGIN ERROR", response.error);
        return { ok: false, error: response.error.message || "Login failed" };
      }
      if (!response.data) {
        console.log("LOGIN FAILED: no matching account");
        return { ok: false, error: "Invalid credentials" };
      }

      console.log("LOGIN SUCCESS", {
        username: response.data.username,
        role: response.data.role,
        client_id: response.data.client_id,
      });

      return {
        ok: true,
        user: {
          username: response.data.username,
          role: response.data.role,
          client_id: response.data.client_id,
        },
      };
    }

    const action = payload.action || "";

    const pickFields = (source, fields) => {
      const out = {};
      fields.forEach((key) => {
        if (source[key] !== undefined) out[key] = source[key];
      });
      return out;
    };

    const pickDefined = (source) => {
      const out = {};
      Object.keys(source || {}).forEach((key) => {
        if (source[key] !== undefined) out[key] = source[key];
      });
      return out;
    };

    let response;
    if (action === "addClient") {
      const clientSample = (cachedData?.clients || []).find((row) => row) || {};
      const columnMap = getClientColumnMap(clientSample);
      const data = pickDefined({
        [columnMap.clientId]: payload.clientId,
        [columnMap.clientName]: payload.clientName,
        [columnMap.username]: payload.username,
        password: payload.password,
        status: payload.status,
        [columnMap.createdAt]: payload.createdAt,
        [columnMap.updatedAt]: payload.updatedAt,
      });
      response = await supabase.from("clients").insert([data]);
    } else if (action === "updateClient") {
      const clientSample = (cachedData?.clients || []).find((row) => row) || {};
      const columnMap = getClientColumnMap(clientSample);
      const data = pickDefined({
        [columnMap.clientName]: payload.clientName,
        [columnMap.username]: payload.username,
        password: payload.password,
        status: payload.status,
        [columnMap.updatedAt]: payload.updatedAt,
      });
      response = await supabase.from("clients").update(data).eq(columnMap.clientId, payload.clientId);
    } else if (action === "deleteClient") {
      const clientSample = (cachedData?.clients || []).find((row) => row) || {};
      const columnMap = getClientColumnMap(clientSample);
      response = await supabase.from("clients").delete().eq(columnMap.clientId, payload.clientId);
    } else if (action === "addProject") {
      const data = pickFields(payload, [
        "projectId",
        "clientId",
        "name",
        "description",
        "status",
        "driveLink",
        "createdAt",
        "updatedAt",
      ]);
      response = await supabase.from("projects").insert([data]);
    } else if (action === "updateProject") {
      const data = pickFields(payload, [
        "clientId",
        "name",
        "description",
        "status",
        "driveLink",
        "updatedAt",
      ]);
      response = await supabase.from("projects").update(data).eq("projectId", payload.projectId);
    } else if (action === "deleteProject") {
      response = await supabase.from("projects").delete().eq("projectId", payload.projectId);
    } else if (action === "addTask") {
      const data = pickFields(payload, [
        "taskId",
        "projectId",
        "title",
        "description",
        "status",
        "progress",
        "dueDate",
        "createdAt",
        "updatedAt",
      ]);
      response = await supabase.from("tasks").insert([data]);
    } else if (action === "updateTask") {
      const data = pickFields(payload, [
        "projectId",
        "title",
        "description",
        "status",
        "progress",
        "dueDate",
        "updatedAt",
      ]);
      response = await supabase.from("tasks").update(data).eq("taskId", payload.taskId);
    } else if (action === "deleteTask") {
      response = await supabase.from("tasks").delete().eq("taskId", payload.taskId);
    } else if (action === "addDeliverable") {
      const data = pickFields(payload, [
        "deliverableId",
        "clientId",
        "projectId",
        "name",
        "status",
        "coverImage",
        "description",
        "deliveryLink",
        "downloadLink",
        "previewLink",
        "driveLink",
        "visibleToClient",
        "createdAt",
        "updatedAt",
      ]);
      response = await supabase.from("deliverables").insert([data]);
    } else if (action === "updateDeliverable") {
      const data = pickFields(payload, [
        "clientId",
        "projectId",
        "name",
        "status",
        "coverImage",
        "description",
        "deliveryLink",
        "downloadLink",
        "previewLink",
        "driveLink",
        "visibleToClient",
        "updatedAt",
      ]);
      response = await supabase.from("deliverables").update(data).eq("deliverableId", payload.deliverableId);
    } else if (action === "deleteDeliverable") {
      response = await supabase.from("deliverables").delete().eq("deliverableId", payload.deliverableId);
    } else if (action === "addUpdate") {
      const data = pickFields(payload, [
        "commentId",
        "taskId",
        "projectId",
        "body",
        "createdAt",
        "updatedAt",
      ]);
      response = await supabase.from("comments").insert([data]);
    } else if (action === "updateUpdate") {
      const data = pickFields(payload, ["body", "updatedAt"]);
      response = await supabase.from("comments").update(data).eq("commentId", payload.commentId);
    } else if (action === "deleteUpdate") {
      response = await supabase.from("comments").delete().eq("commentId", payload.commentId);
    } else {
      return { ok: false, error: "Unknown action" };
    }

    if (response?.error) {
      return { ok: false, error: response.error.message };
    }

    cachedData = null;
    return { ok: true, data: response?.data || null };
  }

  async function fetchAccountForUser(user) {
    if (!user) return null;
    const supabase = getSupabaseClient();
    const candidates = [
      { column: "user_id", value: user.id },
      { column: "id", value: user.id },
      { column: "email", value: user.email },
    ];

    for (const candidate of candidates) {
      if (!candidate.value) continue;
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq(candidate.column, candidate.value)
        .maybeSingle();
      if (error) {
        continue;
      }
      if (data) return data;
    }
    return null;
  }

  async function sha256(text) {
    if (!window.crypto?.subtle) return text;
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function computeSummary(tasks) {
    const summary = {
      total: tasks.length,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      blocked: 0,
    };
    (tasks || []).forEach((t) => {
      const s = t.status || "not-started";
      if (s === "completed") summary.completed++;
      else if (s === "in-progress") summary.inProgress++;
      else if (s === "blocked") summary.blocked++;
      else summary.notStarted++;
    });
    return summary;
  }

  function computeProjectProgress(tasks) {
    if (!tasks || !tasks.length) return 0;
    const values = tasks.map((t) => Math.max(0, Math.min(100, Number(t.progress || 0))));
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round(sum / values.length);
  }

  function computeProjectSummary(projects) {
    const summary = {
      total: projects.length,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      blocked: 0,
    };
    (projects || []).forEach((p) => {
      const s = p.status || "not-started";
      if (s === "completed") summary.completed++;
      else if (s === "in-progress") summary.inProgress++;
      else if (s === "blocked") summary.blocked++;
      else summary.notStarted++;
    });
    return summary;
  }

  function formatDate(val) {
    if (!val) return "";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatDateTime(val) {
    if (!val) return "";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function saveSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function getLocalSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  const ALLOWED_CLIENT_STATUSES = ["active", "inactive", "archived", "blocked"];

  function validateClientsSchema(clients = []) {
    return (clients || []).map((c) => {
      const next = { ...c };
      const required = ["clientId", "clientName", "username", "password", "status", "createdAt", "updatedAt"];
      required.forEach((key) => {
        if (next[key] === undefined || next[key] === null) {
          next[key] = key === "status" ? "active" : "";
        }
      });
      if (!ALLOWED_CLIENT_STATUSES.includes(next.status)) {
        next.status = "active";
      }
      return next;
    });
  }

  function requireAuth(options = {}, redirectIfMissing = true) {
    const sess = getLocalSession();
    if (!sess && redirectIfMissing) {
      showPageLoader("Redirecting to sign in...");
      window.location.href = "login.html";
      return null;
    }
    if (!sess) return null;

    if (options.role && sess.role !== options.role) {
      // If wrong role, send to overview
      showPageLoader("Redirecting...");
      window.location.href = sess.role === "client" ? "client-dashboard-overview.html" : "dashboard-overview.html";
      return null;
    }
    return sess;
  }

  function disableButton(btn, reason) {
    if (!btn) return;
    btn.disabled = true;
    btn.classList.add("is-disabled");
    btn.setAttribute("aria-disabled", "true");
    if (reason && !btn.title) btn.title = reason;
  }

  function updateSidebarStats(data) {
    if (!data) return;
    const projects = data.projects || [];
    const tasks = data.tasks || [];

    const summary = computeProjectSummary(projects);

    const setText = (id, v) => {
      const el = document.getElementById(id);
      if (!el) return;
      const val = Number(v);
      el.textContent = Number.isFinite(val) && val === 0 ? "--" : v;
    };

    setText("statTotalProjects", projects.length);
    setText("statTotalTasks", tasks.length);
    setText("statInProgress", summary.inProgress);
    setText("statCompleted", summary.completed);
    setText("statNotStarted", summary.notStarted);
  }

  function renderClientHeader(clients = []) {
    const sess = getLocalSession();
    if (!sess) return;
    const nameEl = document.getElementById("headerClientName");
    const statusEl = document.getElementById("headerClientStatus");
    if (!nameEl && !statusEl) return;

    let name = sess.username || "Client";
    let status = "Active";

    if (clients && clients.length) {
      const match =
        clients.find((c) => c.clientId === sess.clientId) ||
        clients.find((c) => c.username === sess.username);
      if (match) {
        name = match.clientName || match.username || name;
        status = match.status || status;
      }
    }

    if (nameEl) nameEl.textContent = name;
    if (statusEl) statusEl.textContent = status;
  }

  function initSidebarChrome() {
    const sess = getLocalSession();

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        showPageLoader("Signing out...");
        clearSession();
        window.location.href = "login.html";
      });
    }

    // Hide admin-only links for clients
    if (sess && sess.role !== "admin") {
      const adminLinks = ["navClientsLink"];
      adminLinks.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
      });
    }

    // Active link
    const path = (window.location.pathname.split("/").pop() || "").toLowerCase();
    if (path.startsWith("client-") && sess && sess.role !== "client") {
      showPageLoader("Redirecting...");
      window.location.href = "dashboard-overview.html";
      return;
    }
    const map = {
      "dashboard-overview.html": "navOverview",
      "dashboard-clients.html": "navClientsLink",
      "dashboard-projects.html": "navProjectsLink",
      "dashboard-tasks.html": "navTasksLink",
      "dashboard-deliverables.html": "navDeliverablesLink",
      "client-dashboard-overview.html": "navOverview",
      "client-dashboard-projects.html": "navProjectsLink",
      "client-dashboard-tasks.html": "navTasksLink",
      "client-dashboard-deliverables.html": "navDeliverablesLink",
    };
    const activeId = map[path];
    if (activeId) {
      const el = document.getElementById(activeId);
      if (el) el.classList.add("active");
    }

    const nav = document.querySelector(".nav");
    if (nav) {
      nav.addEventListener("click", (e) => {
        const link = e.target.closest("a");
        if (!link) return;
        if (link.target === "_blank") return;
        showPageLoader("Loading...");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    ensurePageLoader();
    logSessionStatus();
    initSidebarChrome();
  });

  window.BXCore = {
    apiGetAll,
    apiPost,
    fetchAccountForUser,
    getSupabaseClient,
    logSessionStatus,
    sha256,
    computeSummary,
    computeProjectProgress,
    computeProjectSummary,
    formatDate,
    formatDateTime,
    saveSession,
    getLocalSession,
    clearSession,
    requireAuth,
    updateSidebarStats,
    renderClientHeader,
    showPageLoader,
    hidePageLoader,
    setButtonLoading,
    renderSkeleton,
    validateClientsSchema,
    ALLOWED_CLIENT_STATUSES,
    disableButton,
  };
})();

