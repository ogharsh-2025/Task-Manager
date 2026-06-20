const api = (() => {
  const baseUrl = "/api";

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || "Request failed");
    }

    return data;
  }

  function queryString(params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, value);
      }
    });
    const serialized = query.toString();
    return serialized ? `?${serialized}` : "";
  }

  return {
    listTasks(params = {}) {
      return request(`/tasks${queryString(params)}`);
    },
    getTask(id) {
      return request(`/tasks/${id}`);
    },
    createTask(payload) {
      return request("/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    updateTask(id, payload) {
      return request(`/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    deleteTask(id) {
      return request(`/tasks/${id}`, { method: "DELETE" });
    },
    completeTask(id) {
      return request(`/tasks/${id}/complete`, { method: "PATCH" });
    },
    stats() {
      return request("/dashboard/stats");
    },
  };
})();

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function formatDate(value) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
