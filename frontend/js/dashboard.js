const statsGrid = document.getElementById("statsGrid");
const recentTasks = document.getElementById("recentTasks");
const workloadSummary = document.getElementById("workloadSummary");

const statConfig = [
  ["Total Tasks", "total_tasks"],
  ["Pending Tasks", "pending_tasks"],
  ["Completed Tasks", "completed_tasks"],
  ["High Priority Tasks", "high_priority_tasks"],
];

let productivityChartInstance = null;

function renderChart(labels, completedCounts) {
  const canvasEl = document.getElementById('productivityChart');
  if (!canvasEl) return;
  const ctx = canvasEl.getContext('2d');
  
  if (productivityChartInstance) {
    productivityChartInstance.destroy();
  }
  
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(45, 140, 122, 0.3)');
  gradient.addColorStop(1, 'rgba(45, 140, 122, 0.0)');
  
  productivityChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Tasks Completed',
        data: completedCounts,
        borderColor: '#2d8c7a',
        borderWidth: 3,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#2d8c7a',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              return `${context.parsed.y} task(s) completed`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#647084',
            font: {
              size: 11
            }
          }
        },
        y: {
          grid: {
            color: '#eef2f5'
          },
          ticks: {
            stepSize: 1,
            precision: 0,
            color: '#647084',
            font: {
              size: 11
            }
          },
          min: 0
        }
      }
    }
  });
}

async function loadDashboard() {
  try {
    statsGrid.innerHTML = statConfig
      .map(([label]) => `<article class="stat-card"><span>${label}</span><strong>...</strong></article>`)
      .join("");

    const [stats, taskList] = await Promise.all([
      api.stats(),
      api.listTasks({ limit: 500, sort_by: "created_at", sort_order: "desc" }),
    ]);

    statsGrid.innerHTML = statConfig
      .map(
        ([label, key]) => `
          <article class="stat-card">
            <span>${label}</span>
            <strong>${stats[key]}</strong>
          </article>
        `,
      )
      .join("");

    renderRecentTasks(taskList.items.slice(0, 6));
    renderWorkload(stats);

    // Calculate weekly completed tasks trend
    const labels = [];
    const completedCounts = [];
    const dateMap = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      labels.push(label);
      dateMap[key] = 0;
    }

    taskList.items.forEach(task => {
      if (task.status === 'completed' && task.updated_at) {
        const d = new Date(task.updated_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (key in dateMap) {
          dateMap[key]++;
        }
      }
    });

    labels.forEach((_, index) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - index));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      completedCounts.push(dateMap[key] || 0);
    });

    renderChart(labels, completedCounts);

  } catch (error) {
    statsGrid.innerHTML = "";
    recentTasks.innerHTML = `<div class="error-state">${escapeHtml(error.message)}</div>`;
    workloadSummary.innerHTML = `<div class="error-state">Unable to load dashboard.</div>`;
  }
}

function renderRecentTasks(tasks) {
  if (!tasks.length) {
    recentTasks.innerHTML = `<div class="empty-state">No tasks have been created yet.</div>`;
    return;
  }

  recentTasks.innerHTML = `
    <ul class="activity-list">
      ${tasks
        .map(
          (task) => {
            const isCompleted = task.status === "completed";
            return `
              <li style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${isCompleted ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; vertical-align: middle;" />
                  <div class="${isCompleted ? 'completed-task-text' : ''}">
                    <strong style="${isCompleted ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${escapeHtml(task.title)}</strong>
                    <div class="muted">${formatDate(task.due_date)}</div>
                  </div>
                </div>
                <span class="status-pill status-${task.status}">${task.status}</span>
              </li>
            `;
          }
        )
        .join("")}
    </ul>
  `;
}

function renderWorkload(stats) {
  const pendingRatio = stats.total_tasks ? Math.round((stats.pending_tasks / stats.total_tasks) * 100) : 0;
  const completionRatio = stats.total_tasks ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) : 0;

  workloadSummary.innerHTML = `
    <div class="summary-row" style="margin-bottom: 8px;">
      <span class="muted" style="font-size: 14px; font-weight: 700;">Productivity Score</span>
      <strong style="font-size: 22px; color: var(--success);">${completionRatio}%</strong>
    </div>
    <div class="summary-row"><span class="muted">Completion ratio</span><strong>${completionRatio}%</strong></div>
    <div class="summary-row"><span class="muted">Pending ratio</span><strong>${pendingRatio}%</strong></div>
    <div class="summary-row"><span class="muted">High priority queue</span><strong>${stats.high_priority_tasks}</strong></div>
  `;
}

// Bind checkbox changes
recentTasks.addEventListener("change", async (event) => {
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
      await loadDashboard();
    } catch (error) {
      showToast(error.message);
      event.target.checked = !completed;
    }
  }
});

loadDashboard();
