from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, text

import app.api.deps
import app.core.db
import app.models  # noqa: F401
from app.api.deps import get_db
from app.core.config import settings
from app.core.db import init_db
from app.core.redis import redis_client
from app.main import app as fastapi_app
from tests.utils.user import authentication_token_from_email
from tests.utils.utils import get_superuser_token_headers


@pytest.fixture(scope="session", autouse=True)
def db() -> Generator[Session]:
    base_url, _, _ = str(settings.DATABASE_URL).rpartition("/")
    admin_url = f"{base_url}/postgres"
    test_url = f"{base_url}/app_test"

    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        conn.execute(text("DROP DATABASE IF EXISTS app_test WITH (FORCE)"))
        conn.execute(text("CREATE DATABASE app_test"))

    test_engine = create_engine(test_url, pool_pre_ping=True)
    orig_db_engine = app.core.db.engine
    orig_deps_engine = app.api.deps.engine
    app.core.db.engine = test_engine
    app.api.deps.engine = test_engine

    SQLModel.metadata.create_all(test_engine)

    # Point redis to test DB (db 1)
    orig_redis_db = redis_client.connection_pool.connection_kwargs.get("db", 0)
    redis_client.connection_pool.connection_kwargs["db"] = 1
    redis_client.connection_pool.disconnect()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    def override_get_db() -> Generator[Session]:
        with Session(test_engine) as session:
            yield session

    fastapi_app.dependency_overrides[get_db] = override_get_db

    with Session(test_engine) as session:
        init_db(session)
        yield session

    fastapi_app.dependency_overrides.clear()
    test_engine.dispose()
    app.core.db.engine = orig_db_engine
    app.api.deps.engine = orig_deps_engine

    try:
        redis_client.flushdb()
    except Exception:
        pass
    redis_client.connection_pool.connection_kwargs["db"] = orig_redis_db
    redis_client.connection_pool.disconnect()

    with admin_engine.connect() as conn:
        conn.execute(text("DROP DATABASE IF EXISTS app_test WITH (FORCE)"))
    admin_engine.dispose()


@pytest.fixture(scope="module")
def client() -> Generator[TestClient]:
    with TestClient(fastapi_app) as c:
        yield c


@pytest.fixture(scope="module")
def superuser_token_headers(client: TestClient) -> dict[str, str]:
    return get_superuser_token_headers(client)


@pytest.fixture(scope="module")
def normal_user_token_headers(client: TestClient, db: Session) -> dict[str, str]:
    return authentication_token_from_email(
        client=client, email=settings.EMAIL_TEST_USER, db=db
    )
