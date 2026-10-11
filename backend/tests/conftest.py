import os
import tempfile

# Must be set before the app is imported: the tests never touch backend/finance.db
os.environ["FINANCE_DB_PATH"] = os.path.join(tempfile.mkdtemp(), "test.db")

import pytest
from fastapi.testclient import TestClient

from app import database, main, models

assert database.DB_PATH == os.environ["FINANCE_DB_PATH"]

LOCAL_ORIGIN = {"Origin": "http://localhost:5173"}


@pytest.fixture(autouse=True)
def fresh_db():
    models.Base.metadata.drop_all(bind=database.engine)
    models.Base.metadata.create_all(bind=database.engine)


@pytest.fixture
def client():
    return TestClient(main.app, headers=LOCAL_ORIGIN)


@pytest.fixture
def db():
    session = database.SessionLocal()
    yield session
    session.close()
