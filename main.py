import math
from typing import List, Optional
from enum import Enum
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_all_results, create_engine, Column, Integer, String, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# -------------------------------------------------------------------------
# DATABASE SETUP
# -------------------------------------------------------------------------
DATABASE_URL = "sqlite:///./fitquest.db"

# Connect to SQLite. For SQLite, we set check_same_thread=False for FastAPI concurrency.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency to get db session in path operations
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -------------------------------------------------------------------------
# PYDANTIC SCHEMAS (DATA VALIDATION)
# -------------------------------------------------------------------------
class DifficultyEnum(str, Enum):
    easy = "Easy"
    medium = "Medium"
    hard = "Hard"

class TaskStatusEnum(str, Enum):
    pending = "pending"
    completed = "completed"

class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=100, example="50x Heavy Pushups")
    difficulty: DifficultyEnum = Field(..., example=DifficultyEnum.medium)

class TaskCreate(TaskBase):
    pass

class TaskResponse(TaskBase):
    id: int
    status: TaskStatusEnum

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: int
    username: str
    total_xp: int
    level: int

    class Config:
        from_attributes = True

# -------------------------------------------------------------------------
# SQLALCHEMY DATABASE MODELS
# -------------------------------------------------------------------------
class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    total_xp = Column(Integer, default=0, nullable=False)
    level = Column(Integer, default=1, nullable=False)

class TaskDB(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)  # Easy, Medium, Hard
    status = Column(String, default="pending", nullable=False)  # pending, completed

# Create tables
Base.metadata.create_all(bind=engine)

# -------------------------------------------------------------------------
# GAMIFICATION LOGIC (PURE PYTHON MATH)
# -------------------------------------------------------------------------
DIFFICULTY_XP_MAP = {
    DifficultyEnum.easy.value: 10,
    DifficultyEnum.medium.value: 20,
    DifficultyEnum.hard.value: 50
}

def calculate_level(total_xp: int) -> int:
    """
    Leveling formula: Level = (total_xp // 100) + 1.
    """
    return (total_xp // 100) + 1

# -------------------------------------------------------------------------
# FASTAPI APPLICATION INSTANCE
# -------------------------------------------------------------------------
app = FastAPI(
    title="FitQuest REST API",
    description="Gamified workout to-do list backend powered by FastAPI and SQLAlchemy.",
    version="1.0.0"
)

# Enable CORS for all origins, methods, and headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------------
# SEED DUMMY USER & DEFAULT QUESTS ON STARTUP
# -------------------------------------------------------------------------
@app.on_event("startup")
def seed_database():
    db = SessionLocal()
    try:
        # Create a dummy user if none exists
        default_user = db.query(UserDB).filter(UserDB.username == "AthleteOne").first()
        if not default_user:
            default_user = UserDB(username="AthleteOne", total_xp=0, level=1)
            db.add(default_user)
            db.commit()
            print("Successfully seeded dummy user: AthleteOne")

        # Create default tasks if tasks is empty
        task_count = db.query(TaskDB).count()
        if task_count == 0:
            default_tasks = [
                TaskDB(title="50x Diamond Pushups", difficulty=DifficultyEnum.medium.value, status="pending"),
                TaskDB(title="5km Morning Sprint", difficulty=DifficultyEnum.hard.value, status="pending"),
                TaskDB(title="10-minute Plank Hold", difficulty=DifficultyEnum.easy.value, status="pending")
            ]
            db.add_all(default_tasks)
            db.commit()
            print("Successfully seeded default FitQuest tasks!")
    finally:
        db.close()

# -------------------------------------------------------------------------
# REST API ENDPOINTS
# -------------------------------------------------------------------------
@app.get("/api/user", response_model=UserResponse, summary="Get current user stats")
def get_user_stats(db: Session = Depends(get_db)):
    """
    Retrieves the first user in the database. 
    If none exists, seeds one immediately and returns it.
    """
    user = db.query(UserDB).first()
    if not user:
        user = UserDB(username="AthleteOne", total_xp=0, level=1)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

@app.get("/api/tasks", response_model=List[TaskResponse], summary="Get all active tasks")
def get_tasks(db: Session = Depends(get_db)):
    """
    Retrieves all tasks in the database sorted by status (pending first) and id.
    """
    return db.query(TaskDB).order_by(TaskDB.status.desc(), TaskDB.id.asc()).all()

@app.post("/api/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED, summary="Create a new workout task")
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    """
    Creates a new quest/task in the system.
    """
    db_task = TaskDB(
        title=task_in.title,
        difficulty=task_in.difficulty.value,
        status="pending"
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@app.post("/api/tasks/{task_id}/complete", response_model=UserResponse, summary="Complete a task and earn XP")
def complete_task(task_id: int, db: Session = Depends(get_db)):
    """
    Marks a task as completed.
    - Prevents double scoring.
    - Allocates XP (Easy = 10XP, Medium = 20XP, Hard = 50XP).
    - Recalculates level: (total_xp // 100) + 1.
    - Returns updated user stats.
    """
    task = db.query(TaskDB).filter(TaskDB.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found."
        )

    if task.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task has already been completed."
        )

    user = db.query(UserDB).first()
    if not user:
        user = UserDB(username="AthleteOne", total_xp=0, level=1)
        db.add(user)
        db.commit()
        db.refresh(user)

    # 1. Update task status
    task.status = "completed"

    # 2. Add XP based on difficulty
    xp_to_add = DIFFICULTY_XP_MAP.get(task.difficulty, 10)
    user.total_xp += xp_to_add

    # 3. Recalculate level
    user.level = calculate_level(user.total_xp)

    # Commit all changes atomically
    db.commit()
    db.refresh(user)

    return user

if __name__ == "__main__":
    import uvicorn
    # Start server
    uvicorn.run("main.py:app", host="0.0.0.0", port=3000, reload=True)
