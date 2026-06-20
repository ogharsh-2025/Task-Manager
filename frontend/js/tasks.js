const state = {
  tasks: [],
  editingTask: null,
};

const els = {
  tableWrap: document.getElementById("tasksTableWrap"),
  taskCount: document.getElementById("taskCount"),
  search: document.getElementById("searchInput"),
  statusFilter: document.getElementById("statusFilter"),
  priorityFilter: document.getElementById("priorityFilter"),
  sortSelect: document.getElementById("sortSelect"),
  modal: document.getElementById("taskModal"),
  form: document.getElementById("taskForm"),
  modalTitle: document.getElementById("modalTitle"),
  openCreateModal: document.getElementById("openCreateModal"),
  closeModal: document.getElementById("closeModal"),
  cancelModal: document.getElementById("cancelModal"),
  taskId: document.getElementById("taskId"),
  title: document.getElementById("title"),
  description: document.getElementById("description"),
  priority: document.getElementById("priority"),
  status: document.getElementById("status"),
  dueDate: document.getElementById("dueDate"),
};

let searchTimeout;

function currentQuery() {
  const [sortBy, sortOrder] = els.sortSelect.value.split(":");
  return {
    search: els.search.value.trim(),
    status: els.statusFilter.value,
    priority: els.priorityFilter.value,
    sort_by: sortBy,
    sort_order: sortOrder,
  };
}

async function loadTasks() {
  els.tableWrap.innerHTML = `<div class="loading-state">Loading tasks...</div>`;
  try {
    const result = await api.listTasks(currentQuery());
    state.tasks = result.items;
    els.taskCount.textContent = `${result.total} ${result.total === 1 ? "task" : "tasks"}`;
    renderTasks(result.items);
  } catch (error) {
    els.tableWrap.innerHTML = `<div class="error-state">${escapeHtml(error.message)}</div>`;
  }
}

function renderTasks(tasks) {
  if (!tasks.length) {
    els.tableWrap.innerHTML = `<div class="empty-state">No tasks match the current view.</div>`;
    return;
  }

  els.tableWrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">Done</th>
          <th>Title</th>
          <th>Description</th>
          <th>Priority</th>
          <th>Status</th>
          <th>Due Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${tasks.map(renderTaskRow).join("")}
      </tbody>
    </table>
  `;
}

function renderTaskRow(task) {
  const isCompleted = task.status === "completed";
  return `
    <tr class="${isCompleted ? 'task-row-completed' : ''}">
      <td style="text-align: center; padding-left: 18px;">
        <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${isCompleted ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; vertical-align: middle;" />
      </td>
      <td class="task-title"><strong>${escapeHtml(task.title)}</strong></td>
      <td class="description-cell">${escapeHtml(task.description || "No description")}</td>
      <td><span class="priority-pill priority-${task.priority}">${task.priority}</span></td>
      <td><span class="status-pill status-${task.status}">${task.status}</span></td>
      <td>${formatDate(task.due_date)}</td>
      <td>
        <div class="task-actions">
          ${
            task.status === "pending"
              ? `<button class="icon-button" title="Mark complete" data-action="complete" data-id="${task.id}">✓</button>`
              : ""
          }
          <button class="icon-button" title="Edit" data-action="edit" data-id="${task.id}">✎</button>
          <button class="icon-button" title="Delete" data-action="delete" data-id="${task.id}">×</button>
        </div>
      </td>
    </tr>
  `;
}

function openModal(task = null) {
  state.editingTask = task;
  els.modalTitle.textContent = task ? "Edit Task" : "Add Task";
  els.taskId.value = task?.id || "";
  els.title.value = task?.title || "";
  els.description.value = task?.description || "";
  els.priority.value = task?.priority || "medium";
  els.status.value = task?.status || "pending";
  els.dueDate.value = task?.due_date || "";
  els.modal.classList.add("open");
  els.modal.setAttribute("aria-hidden", "false");
  els.title.focus();
}

function closeModal() {
  els.modal.classList.remove("open");
  els.modal.setAttribute("aria-hidden", "true");
  els.form.reset();
  state.editingTask = null;
}

function payloadFromForm() {
  const payload = {
    title: els.title.value.trim(),
    description: els.description.value.trim() || null,
    priority: els.priority.value,
    due_date: els.dueDate.value || null,
  };
  if (state.editingTask) {
    payload.status = els.status.value;
  }
  return payload;
}

async function handleSubmit(event) {
  event.preventDefault();
  const payload = payloadFromForm();
  if (!payload.title) {
    showToast("Title is required.");
    return;
  }

  try {
    if (state.editingTask) {
      await api.updateTask(state.editingTask.id, payload);
      showToast("Task updated.");
    } else {
      await api.createTask(payload);
      showToast("Task created.");
    }
    closeModal();
    await loadTasks();
  } catch (error) {
    showToast(error.message);
  }
}

async function handleTableClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  const task = state.tasks.find((item) => item.id === id);

  try {
    if (button.dataset.action === "edit" && task) {
      openModal(task);
    }
    if (button.dataset.action === "complete") {
      await api.completeTask(id);
      showToast("Task completed.");
      await loadTasks();
    }
    if (button.dataset.action === "delete") {
      const confirmed = window.confirm("Delete this task?");
      if (!confirmed) return;
      await api.deleteTask(id);
      showToast("Task deleted.");
      await loadTasks();
    }
  } catch (error) {
    showToast(error.message);
  }
}

function bindEvents() {
  els.openCreateModal.addEventListener("click", () => openModal());
  els.closeModal.addEventListener("click", closeModal);
  els.cancelModal.addEventListener("click", closeModal);
  els.modal.addEventListener("click", (event) => {
    if (event.target === els.modal) closeModal();
  });
  els.form.addEventListener("submit", handleSubmit);
  els.tableWrap.addEventListener("click", handleTableClick);
  
  els.tableWrap.addEventListener("change", async (event) => {
    if (event.target.classList.contains("task-checkbox")) {
      const id = Number(event.target.dataset.id);
      const completed = event.target.checked;
      try {
        if (completed) {
          await api.completeTask(id);
          showToast("Task completed.");
        } else {
          await api.updateTask(id, { status: "pending" });
          showToast("Task marked pending.");
        }
        await loadTasks();
      } catch (error) {
        showToast(error.message);
        event.target.checked = !completed;
      }
    }
  });

  [els.statusFilter, els.priorityFilter, els.sortSelect].forEach((element) => {
    element.addEventListener("change", loadTasks);
  });

  els.search.addEventListener("input", () => {
    window.clearTimeout(searchTimeout);
    searchTimeout = window.setTimeout(loadTasks, 250);
  });
}

bindEvents();
loadTasks();
