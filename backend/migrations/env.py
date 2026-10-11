from logging.config import fileConfig

from alembic import context

from app import database, models

config = context.config
# When the app runs the migrations, it keeps its own logging configuration
if config.config_file_name is not None and config.attributes.get("configure_logger", True):
    fileConfig(config.config_file_name)

target_metadata = models.Base.metadata


def run_migrations_offline():
    context.configure(url=database.SQLALCHEMY_DATABASE_URL, target_metadata=target_metadata,
                      literal_binds=True, render_as_batch=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    with database.engine.connect() as connection:
        # render_as_batch: SQLite cannot alter a column, so Alembic rebuilds the table instead
        context.configure(connection=connection, target_metadata=target_metadata, render_as_batch=True)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
