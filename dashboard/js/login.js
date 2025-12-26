document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");
  const statusBox = document.getElementById("loginStatus");

  if (!form) return;
  const submitBtn = form.querySelector("button[type=\"submit\"]");

  if (errorBox) errorBox.style.display = "none";
  if (statusBox) statusBox.style.display = "none";

  const inputs = Array.from(form.querySelectorAll("input, select, textarea"));

  const setStatus = (message, type = "info") => {
    if (!statusBox) return;
    statusBox.classList.remove("alert-info", "alert-success", "alert-error");
    statusBox.classList.add(`alert-${type}`);
    statusBox.textContent = message || "";
    statusBox.style.display = message ? "block" : "none";
  };

  const setLoading = (isLoading, message) => {
    if (submitBtn) BXCore.setButtonLoading(submitBtn, isLoading, message || "Signing in...");
    inputs.forEach((input) => {
      input.disabled = isLoading;
    });
    form.setAttribute("aria-busy", isLoading ? "true" : "false");
    if (isLoading) {
      BXCore.showPageLoader(message || "Signing you in...");
    } else {
      BXCore.hidePageLoader();
    }
    if (message) setStatus(message, "info");
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorBox) errorBox.style.display = "none";
    setStatus("", "info");

    const fd = new FormData(form);
    const username = String(fd.get("username") || "").trim();
    const password = String(fd.get("password") || "");
    setLoading(true, "Signing in...");

    try {
      const resp = await BXCore.apiPost({
        action: "login",
        username,
        password,
      });

      if (!resp || resp.ok === false) {
        const message = resp?.error || "Invalid credentials";
        if (errorBox) {
          errorBox.textContent = message;
          errorBox.style.display = "block";
        }
        setLoading(false);
        setStatus("", "info");
        return;
      }

      if (resp.role === "admin" && resp.admin) {
        BXCore.saveSession({
          username: resp.admin.username,
          role: "admin",
          clientId: null,
          clientName: resp.admin.name || resp.admin.username,
        });
        setStatus("Signed in. Redirecting to your dashboard...", "success");
        BXCore.showPageLoader("Redirecting...");
        setTimeout(() => {
          window.location.href = "dashboard-overview.html";
        }, 350);
        return;
      }

      if (resp.role === "client" && resp.client) {
        BXCore.saveSession({
          username: resp.client.username || username,
          role: "client",
          clientId: resp.client.clientId,
          clientName: resp.client.clientName,
        });
        setStatus("Signed in. Redirecting to your dashboard...", "success");
        BXCore.showPageLoader("Redirecting...");
        setTimeout(() => {
          window.location.href = "client-dashboard-overview.html";
        }, 350);
        return;
      }

      if (errorBox) {
        errorBox.textContent = "Invalid credentials";
        errorBox.style.display = "block";
      }
      setLoading(false);
      setStatus("", "info");
    } catch (err) {
      console.error(err);
      if (errorBox) {
        errorBox.textContent = "Login failed. Please try again.";
        errorBox.style.display = "block";
      }
      setLoading(false);
      setStatus("", "info");
    }
  });
});
