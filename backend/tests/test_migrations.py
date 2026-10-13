import sqlite3

import pytest
from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, text

from app import database, models

HEAD = ScriptDirectory.from_config(database.alembic_config()).get_current_head()


@pytest.fixture
def other_database(tmp_path, monkeypatch):
    """Point init_db at a separate database file."""
    path = tmp_path / "finance.db"
    engine = create_engine(f"sqlite:///{path}")
    monkeypatch.setattr(database, "DB_PATH", str(path))
    monkeypatch.setattr(database, "engine", engine)
    yield path, engine
    engine.dispose()


def schema_differences(engine):
    with engine.connect() as connection:
        return compare_metadata(MigrationContext.configure(connection), models.Base.metadata)


def revision(engine):
    with engine.connect() as connection:
        return MigrationContext.configure(connection).get_current_revision()


def create_legacy_database(engine, snapshots):
    """Database created before migrations existed: no version table, no unique snapshot indexes, no origin of
    the balances, no deposits."""
    models.Base.metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(text("DROP INDEX ux_snapshots_asset_date"))
        connection.execute(text("DROP INDEX ux_snapshots_liability_date"))
        connection.execute(text("ALTER TABLE snapshots DROP COLUMN derived"))
        connection.execute(text("DROP TABLE deposits"))
        connection.execute(text("INSERT INTO liabilities (id, name, type) VALUES (1, 'Visa', 'Carte')"))
        for snapshot_id, day, amount in snapshots:
            connection.execute(text("INSERT INTO snapshots (id, date, liability_id, amount) VALUES (:i, :d, 1, :a)"),
                               {"i": snapshot_id, "d": day, "a": amount})


def snapshot_ids(engine):
    with engine.connect() as connection:
        return connection.execute(text("SELECT id FROM snapshots ORDER BY id")).scalars().all()


def test_a_new_database_gets_the_schema_of_the_models(other_database):
    path, engine = other_database
    database.init_db()
    assert schema_differences(engine) == []
    assert revision(engine) == HEAD
    assert list(path.parent.glob("*.bak-*")) == []


def test_an_existing_database_is_backed_up_then_migrated(other_database):
    path, engine = other_database
    create_legacy_database(engine, [(1, "2026-01-01", 1000), (2, "2026-01-01", 1000), (3, "2026-02-01", 3349.1899999999996)])
    database.init_db()
    assert schema_differences(engine) == []
    assert revision(engine) == HEAD
    assert snapshot_ids(engine) == [1, 3]  # identical duplicate removed
    # Read without the Money type: the stored value itself is rounded
    assert sqlite3.connect(path).execute("SELECT amount FROM snapshots WHERE id = 3").fetchone()[0] == 3349.19
    backups = list(path.parent.glob("finance.db.bak-*"))
    assert len(backups) == 1
    assert sqlite3.connect(backups[0]).execute("SELECT count(*) FROM snapshots").fetchone()[0] == 3


def test_an_up_to_date_database_is_left_alone(other_database):
    path, engine = other_database
    database.init_db()
    database.init_db()
    assert list(path.parent.glob("*.bak-*")) == []


def test_duplicates_with_different_amounts_stop_the_migration(other_database):
    path, engine = other_database
    create_legacy_database(engine, [(1, "2026-01-01", 1000), (2, "2026-01-01", 900)])
    with pytest.raises(RuntimeError, match="ids 1,2"):
        database.init_db()
    assert snapshot_ids(engine) == [1, 2]


def test_existing_balances_on_a_transaction_date_are_marked_computed(other_database):
    path, engine = other_database
    create_legacy_database(engine, [(1, "2026-01-01", 1000), (2, "2026-02-01", 1200)])
    with engine.begin() as connection:
        for statement in (
            "INSERT INTO credits (id, name, type, liability_id) VALUES (1, 'Visa', 'Carte', 1)",
            "INSERT INTO expenses (date, description, amount, credit_id) VALUES ('2026-02-01', 'x', 200, 1)",
            "INSERT INTO banks (id, name, balance) VALUES (1, 'Banque', 0)",
            "INSERT INTO assets (id, name, type, bank_id) VALUES (1, 'Compte', 'Banque', 1)",
            "INSERT INTO snapshots (id, date, asset_id, amount) VALUES (3, '2026-01-01', 1, 5000), (4, '2026-03-01', 1, 4700)",
            # Paid from the bank without naming the account: it goes to the bank's account
            "INSERT INTO payments (date, description, amount, interest, bank_id) VALUES ('2026-03-01', 'p', 300, 0, 1)",
        ):
            connection.execute(text(statement))
    database.init_db()
    with engine.connect() as connection:
        derived = dict(connection.execute(text("SELECT id, derived FROM snapshots")).all())
    assert derived == {1: 0, 2: 1, 3: 0, 4: 1}


def test_only_the_latest_backups_are_kept(other_database):
    path, engine = other_database
    create_legacy_database(engine, [(1, "2026-01-01", 1000)])
    older = [path.parent / f"finance.db.bak-2026010{i}-120000-avant-migration-000{i}" for i in range(1, 5)]
    for backup in older:
        backup.write_bytes(b"")
    database.init_db()
    kept = sorted(p.name for p in path.parent.glob("finance.db.bak-*"))
    # The two latest older copies, then the one made by this migration
    assert len(kept) == database.KEPT_BACKUPS == 3
    assert kept[:2] == [older[2].name, older[3].name]
    assert path.exists()

