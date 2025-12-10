
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");

  if (!form) return;

  if (errorBox) errorBox.style.display = "none";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorBox) errorBox.style.display = "none";

    const fd = new FormData(form);
    const username = String(fd.get("username") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "");

    try {
      const data = await BXCore.apiGetAll(true);
      const accounts = data.accounts || [];

      const account = accounts.find((a) =>
        String(a.username || "").trim().toLowerCase() === username
      );

      if (!account) {
        if (errorBox) errorBox.style.display = "block";
        return;
      }

      let ok = false;
      if (account.passwordHash) {
        const hash = await BXCore.sha256(password);
        ok = hash === String(account.passwordHash);
      } else if (account.password) {
        ok = String(account.password) === password;
      }

      if (!ok) {
        if (errorBox) errorBox.style.display = "block";
        return;
      }

      const clients = data.clients || [];
      const client =
        clients.find((c) => c.username === account.username) ||
        clients.find((c) => c.clientId === account.clientId);

      const session = {
        username: account.username,
        role: (account.role || "client").toLowerCase(),
        clientId: client?.clientId || account.clientId || null,
        clientName: client?.clientName || null,
      };

      BXCore.saveSession(session);
      window.location.href = "dashboard-overview.html";
    } catch (err) {
      console.error(err);
      if (errorBox) {
        errorBox.textContent = "Login failed. Please try again.";
        errorBox.style.display = "block";
      }
    }
  });
});
