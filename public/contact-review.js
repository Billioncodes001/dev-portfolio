(() => {
  "use strict";
  const login = document.getElementById("login");
  const input = document.getElementById("token");
  const status = document.getElementById("status");
  const messages = document.getElementById("messages");
  const previous = document.getElementById("previous");
  const next = document.getElementById("next");
  const lock = document.getElementById("lock");
  let token = "",
    offset = 0,
    generation = 0,
    controller;
  function clear() {
    generation++;
    controller?.abort();
    token = "";
    input.value = "";
    messages.replaceChildren();
    login.hidden = false;
    previous.disabled = next.disabled = lock.disabled = true;
    status.textContent = "Locked.";
  }
  async function load() {
    controller?.abort();
    controller = new AbortController();
    const current = ++generation;
    messages.replaceChildren();
    previous.disabled = next.disabled = true;
    status.textContent = "Loading...";
    try {
      const response = await fetch(
        "/api/admin/messages?limit=25&offset=" + offset,
        {
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
          credentials: "omit",
          redirect: "error",
          signal: controller.signal,
        },
      );
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Token rejected."
            : "Inbox unavailable. Check Worker configuration or use the D1 CLI.",
        );
      const data = await response.json();
      if (current !== generation) return;
      for (const message of data.messages) {
        const article = document.createElement("article");
        const title = document.createElement("h2");
        const details = document.createElement("p");
        const body = document.createElement("p");
        title.textContent = message.name;
        details.textContent = [
          message.email,
          message.service,
          message.created_at,
        ].join(" | ");
        body.textContent = message.message;
        body.className = "message";
        article.append(title, details, body);
        messages.append(article);
      }
      login.hidden = true;
      previous.disabled = offset === 0;
      next.disabled = data.messages.length < 25;
      status.textContent = data.messages.length
        ? "Showing messages " +
          (offset + 1) +
          " to " +
          (offset + data.messages.length) +
          "."
        : "No messages on this page.";
    } catch (error) {
      if (current !== generation) return;
      clear();
      status.textContent = error.message;
    }
  }
  login.addEventListener("submit", (event) => {
    event.preventDefault();
    token = input.value;
    input.value = "";
    offset = 0;
    lock.disabled = false;
    load();
  });
  previous.addEventListener("click", () => {
    offset = Math.max(0, offset - 25);
    load();
  });
  next.addEventListener("click", () => {
    offset += 25;
    load();
  });
  lock.addEventListener("click", () => {
    clear();
    input.focus();
  });
  window.addEventListener("pagehide", clear);
})();
