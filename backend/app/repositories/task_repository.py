from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.models.task import Task, TaskPriority, TaskStatus
from app.schemas.task import TaskCreate, TaskUpdate


class TaskRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, payload: TaskCreate) -> Task:
        task = Task(**payload.model_dump())
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def get(self, task_id: int) -> Task | None:
        return self.db.get(Task, task_id)

    def list(
        self,
        *,
        search: str | None = None,
        status: TaskStatus | None = None,
        priority: TaskPriority | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[Task], int]:
        statement = self._filtered_query(search=search, status=status, priority=priority)
        count_statement = select(func.count()).select_from(statement.subquery())
        total = self.db.scalar(count_statement) or 0

        sort_column = getattr(Task, sort_by, Task.created_at)
        if sort_order.lower() == "asc":
            statement = statement.order_by(sort_column.asc())
        else:
            statement = statement.order_by(sort_column.desc())

        items = self.db.scalars(statement.limit(limit).offset(offset)).all()
        return list(items), total

    def update(self, task: Task, payload: TaskUpdate) -> Task:
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(task, field, value)
        self.db.commit()
        self.db.refresh(task)
        return task

    def delete(self, task: Task) -> None:
        self.db.delete(task)
        self.db.commit()

    def complete(self, task: Task) -> Task:
        task.status = TaskStatus.completed
        self.db.commit()
        self.db.refresh(task)
        return task

    def stats(self) -> dict[str, int]:
        total = self.db.scalar(select(func.count(Task.id))) or 0
        pending = self.db.scalar(select(func.count(Task.id)).where(Task.status == TaskStatus.pending)) or 0
        completed = self.db.scalar(select(func.count(Task.id)).where(Task.status == TaskStatus.completed)) or 0
        high_priority = self.db.scalar(select(func.count(Task.id)).where(Task.priority == TaskPriority.high)) or 0
        return {
            "total_tasks": total,
            "pending_tasks": pending,
            "completed_tasks": completed,
            "high_priority_tasks": high_priority,
        }

    def _filtered_query(
        self,
        *,
        search: str | None,
        status: TaskStatus | None,
        priority: TaskPriority | None,
    ) -> Select[tuple[Task]]:
        statement = select(Task)
        if search:
            pattern = f"%{search.strip()}%"
            statement = statement.where(or_(Task.title.ilike(pattern), Task.description.ilike(pattern)))
        if status:
            statement = statement.where(Task.status == status)
        if priority:
            statement = statement.where(Task.priority == priority)
        return statement
