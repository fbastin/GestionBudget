import os
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from .models import Base, Snapshot

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "finance.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
    # create_all does not add new indexes to existing tables
    for index in Snapshot.__table__.indexes:
        try:
            index.create(bind=engine, checkfirst=True)
        except IntegrityError:
            print(f"WARNING: index {index.name} not created because duplicate snapshots exist")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
