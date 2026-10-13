import glob
import os
import sqlite3
from datetime import datetime

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# FINANCE_DB_PATH lets the tests use a throwaway database instead of the real one
DB_PATH = os.environ.get("FINANCE_DB_PATH", os.path.join(BASE_DIR, "finance.db"))
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# Migration matching the schema of the databases created before migrations existed
BASELINE_REVISION = "0001"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def alembic_config():
    config = Config(os.path.join(BASE_DIR, "alembic.ini"))
    config.attributes["configure_logger"] = False
    return config

# Copies of the database kept next to it, the latest ones (backup_database)
KEPT_BACKUPS = 3

def backup_database(label):
    """Copy the database next to it before it is changed, e.g. finance.db.bak-20261011-143000-avant-migration-0002,
    and keep only the KEPT_BACKUPS latest of these copies."""
    path = f"{DB_PATH}.bak-{datetime.now():%Y%m%d-%H%M%S}-{label}"
    source, target = sqlite3.connect(DB_PATH), sqlite3.connect(path)
    try:
        source.backup(target)
    finally:
        source.close()
        target.close()
    print(f"Sauvegarde de la base avant migration : {path}")
    # Only the latest copies stay next to the database: the nightly backup keeps the history
    for old in sorted(glob.glob(f"{glob.escape(DB_PATH)}.bak-*"))[:-KEPT_BACKUPS]:
        os.remove(old)
        print(f"Ancienne sauvegarde supprimée : {old}")

def init_db():
    """Bring the database schema up to date with the migrations, after backing up an existing database."""
    config = alembic_config()
    head = ScriptDirectory.from_config(config).get_current_head()
    with engine.connect() as connection:
        current = MigrationContext.configure(connection).get_current_revision()
        existing = inspect(connection).has_table("snapshots")
    if current == head:
        return
    if existing:
        backup_database(f"avant-migration-{head}")
        if current is None:
            # Created before migrations existed: its schema is the one of the first migration
            command.stamp(config, BASELINE_REVISION)
    command.upgrade(config, "head")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
