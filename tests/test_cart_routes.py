import sys
from pathlib import Path

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1] / "backend"))

from routes.cart import get_current_user, get_db, router  # noqa: E402


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = docs or []

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return {k: v for k, v in doc.items()}
        return None

    async def update_one(self, query, update, upsert=False):
        existing = await self.find_one(query)
        if existing:
            for doc in self.docs:
                if all(doc.get(k) == v for k, v in query.items()):
                    doc.update(update.get("$set", {}))
                    return
        if upsert:
            payload = {**query, **update.get("$set", {})}
            self.docs.append(payload)

    async def delete_one(self, query):
        self.docs = [doc for doc in self.docs if not all(doc.get(k) == v for k, v in query.items())]


class FakeDB:
    def __init__(self):
        self.carts = FakeCollection()
        self.variants = FakeCollection(
            docs=[
                {"id": "variant-1", "is_active": True, "in_stock": True},
                {"id": "variant-2", "is_active": True, "in_stock": True},
            ]
        )


@pytest.fixture
def fake_db():
    return FakeDB()


@pytest.fixture
def app(fake_db):
    app = FastAPI()
    app.include_router(router)

    async def override_db():
        return fake_db

    app.dependency_overrides[get_db] = override_db
    return app


def test_cart_isolated_per_authenticated_user(app, fake_db):
    async def user_1():
        return {"id": "user-1", "email": "user1@example.com"}

    async def user_2():
        return {"id": "user-2", "email": "user2@example.com"}

    app.dependency_overrides[get_current_user] = user_1

    client = TestClient(app)
    response = client.post(
        "/cart/add",
        json={"variant_id": "variant-1", "product_id": "product-1", "quantity": 2},
    )
    assert response.status_code == 200

    response = client.get("/cart/")
    assert response.status_code == 200
    assert response.json()["items"][0]["quantity"] == 2

    app.dependency_overrides[get_current_user] = user_2
    response = client.get("/cart/")
    assert response.status_code == 200
    assert response.json() == {"items": [], "coupon_code": None}

    assert len(fake_db.carts.docs) == 1
    assert fake_db.carts.docs[0]["user_id"] == "user-1"


def test_cart_requires_authenticated_user(app):
    async def unauthenticated_user():
        raise HTTPException(
            status_code=401,
            detail={
                "message": "Authentication required to access cart.",
                "code": "AUTH_REQUIRED",
            },
        )

    app.dependency_overrides[get_current_user] = unauthenticated_user

    client = TestClient(app)
    response = client.get("/cart/")

    assert response.status_code == 401
    assert response.json()["detail"] == {
        "message": "Authentication required to access cart.",
        "code": "AUTH_REQUIRED",
    }


def test_update_quantity_returns_detailed_error_for_missing_variant(app, fake_db):
    async def user_1():
        return {"id": "user-1", "email": "user1@example.com"}

    app.dependency_overrides[get_current_user] = user_1
    fake_db.carts.docs.append(
        {
            "user_id": "user-1",
            "items": [{"variant_id": "variant-1", "product_id": "product-1", "quantity": 1}],
        }
    )

    client = TestClient(app)
    response = client.put(
        "/cart/update",
        json={"variant_id": "variant-2", "product_id": "product-1", "quantity": 4},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == {
        "message": "Variant not found in the authenticated user's cart.",
        "code": "CART_ITEM_NOT_FOUND",
        "variant_id": "variant-2",
        "user_id": "user-1",
    }
