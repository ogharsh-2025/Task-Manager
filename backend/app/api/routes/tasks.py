from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.task import TaskPriority, TaskStatus
from app.repositories.task_repository import TaskRepository
from app.schemas.task import DashboardStats, TaskCreate, TaskList, TaskRead, TaskUpdate
from app.services.task_service import TaskService

router = APIRouter()


def get_task_service(db: Session = Depends(get_db)) -> TaskService:
    return TaskService(TaskRepository(db))


@router.post("/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, service: TaskService = Depends(get_task_service)) -> TaskRead:
    return service.create_task(payload)


@router.get("/tasks", response_model=TaskList)
def list_tasks(
    search: str | None = None,
    status_filter: TaskStatus | None = Query(default=None, alias="status"),
    priority: TaskPriority | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    service: TaskService = Depends(get_task_service),
) -> TaskList:
    return service.list_tasks(
        search=search,
        status_filter=status_filter,
        priority=priority,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )


@router.get("/tasks/search", response_model=TaskList)
def search_tasks(
    q: str = Query(min_length=1),
    service: TaskService = Depends(get_task_service),
) -> TaskList:
    return service.list_tasks(search=q)


@router.get("/tasks/filter", response_model=TaskList)
def filter_tasks(
    status_filter: TaskStatus | None = Query(default=None, alias="status"),
    priority: TaskPriority | None = None,
    service: TaskService = Depends(get_task_service),
) -> TaskList:
    return service.list_tasks(status_filter=status_filter, priority=priority)


@router.get("/tasks/{task_id}", response_model=TaskRead)
def get_task(task_id: int, service: TaskService = Depends(get_task_service)) -> TaskRead:
    return service.get_task(task_id)


@router.put("/tasks/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    service: TaskService = Depends(get_task_service),
) -> TaskRead:
    return service.update_task(task_id, payload)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, service: TaskService = Depends(get_task_service)) -> Response:
    service.delete_task(task_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/tasks/{task_id}/complete", response_model=TaskRead)
def complete_task(task_id: int, service: TaskService = Depends(get_task_service)) -> TaskRead:
    return service.complete_task(task_id)


@router.get("/dashboard/stats", response_model=DashboardStats)
def dashboard_stats(service: TaskService = Depends(get_task_service)) -> DashboardStats:
    return service.dashboard_stats()
