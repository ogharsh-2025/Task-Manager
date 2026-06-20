from fastapi import HTTPException, status

from app.models.task import TaskPriority, TaskStatus
from app.repositories.task_repository import TaskRepository
from app.schemas.task import DashboardStats, TaskCreate, TaskList, TaskRead, TaskUpdate


class TaskService:
    allowed_sort_fields = {"id", "title", "priority", "status", "due_date", "created_at", "updated_at"}

    def __init__(self, repository: TaskRepository) -> None:
        self.repository = repository

    def create_task(self, payload: TaskCreate) -> TaskRead:
        return TaskRead.model_validate(self.repository.create(payload))

    def list_tasks(
        self,
        *,
        search: str | None = None,
        status_filter: TaskStatus | None = None,
        priority: TaskPriority | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        limit: int = 100,
        offset: int = 0,
    ) -> TaskList:
        if sort_by not in self.allowed_sort_fields:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported sort field")
        items, total = self.repository.list(
            search=search,
            status=status_filter,
            priority=priority,
            sort_by=sort_by,
            sort_order=sort_order,
            limit=limit,
            offset=offset,
        )
        return TaskList(items=[TaskRead.model_validate(item) for item in items], total=total)

    def get_task(self, task_id: int) -> TaskRead:
        return TaskRead.model_validate(self._get_existing(task_id))

    def update_task(self, task_id: int, payload: TaskUpdate) -> TaskRead:
        task = self._get_existing(task_id)
        return TaskRead.model_validate(self.repository.update(task, payload))

    def delete_task(self, task_id: int) -> None:
        self.repository.delete(self._get_existing(task_id))

    def complete_task(self, task_id: int) -> TaskRead:
        return TaskRead.model_validate(self.repository.complete(self._get_existing(task_id)))

    def dashboard_stats(self) -> DashboardStats:
        return DashboardStats(**self.repository.stats())

    def _get_existing(self, task_id: int):
        task = self.repository.get(task_id)
        if task is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        return task
