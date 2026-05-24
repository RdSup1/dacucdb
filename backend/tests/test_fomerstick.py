"""Backend tests for Fomerstick API - auth, equipment, loans, smart queue fairness."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://premium-gear-hub-5.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@fomerstick.com"
ADMIN_PASSWORD = "admin123"


# ---- Fixtures ----
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "admin"
    return data["access_token"]


def _register(session, suffix=""):
    email = f"test_{uuid.uuid4().hex[:8]}{suffix}@test.com"
    r = session.post(f"{API}/auth/register", json={"email": email, "password": "test1234", "name": f"User {suffix or 'X'}"})
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def user_a(session):
    return _register(session, "a")


@pytest.fixture(scope="module")
def user_b(session):
    return _register(session, "b")


def auth_h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---- Auth ----
class TestAuth:
    def test_register_returns_token(self, session):
        d = _register(session, "reg")
        assert "access_token" in d and len(d["access_token"]) > 20
        assert d["user"]["role"] == "user"

    def test_login_admin_ok(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_with_token(self, session, admin_token):
        r = session.get(f"{API}/auth/me", headers=auth_h(admin_token))
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_without_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---- Equipment ----
class TestEquipment:
    def test_list_public_has_seed(self, session):
        r = session.get(f"{API}/equipment")
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 6, f"expected >=6 seeded, got {len(items)}"
        # Validate shape
        item = items[0]
        for k in ["id", "name", "category", "available_units", "total_units", "image_url"]:
            assert k in item

    def test_create_equipment_admin(self, session, admin_token):
        payload = {
            "name": "TEST_Gear " + uuid.uuid4().hex[:6],
            "category": "Misc",
            "description": "Test desc",
            "image_url": "https://example.com/x.jpg",
            "total_units": 1,
            "specs": "test",
        }
        r = session.post(f"{API}/equipment", json=payload, headers=auth_h(admin_token))
        assert r.status_code == 200, r.text
        eq = r.json()
        assert eq["available_units"] == 1
        # cleanup
        session.delete(f"{API}/equipment/{eq['id']}", headers=auth_h(admin_token))

    def test_create_equipment_forbidden_for_user(self, session, user_a):
        payload = {"name": "X", "category": "Y", "description": "Z", "image_url": "u", "total_units": 1}
        r = session.post(f"{API}/equipment", json=payload, headers=auth_h(user_a["access_token"]))
        assert r.status_code == 403


# ---- Loans ----
class TestLoans:
    @pytest.fixture(scope="class")
    def fresh_equipment(self, session, admin_token):
        payload = {
            "name": "TEST_Loan_EQ_" + uuid.uuid4().hex[:6],
            "category": "TEST",
            "description": "for loan tests",
            "image_url": "https://example.com/eq.jpg",
            "total_units": 1,
            "specs": "",
        }
        r = session.post(f"{API}/equipment", json=payload, headers=auth_h(admin_token))
        assert r.status_code == 200
        eq = r.json()
        yield eq
        # cleanup
        session.delete(f"{API}/equipment/{eq['id']}", headers=auth_h(admin_token))

    def test_request_active_when_available(self, session, user_a, fresh_equipment):
        r = session.post(
            f"{API}/loans/request",
            json={"equipment_id": fresh_equipment["id"], "requested_days": 3},
            headers=auth_h(user_a["access_token"]),
        )
        assert r.status_code == 200, r.text
        loan = r.json()
        assert loan["status"] == "active"
        assert loan["due_date"] is not None
        pytest.shared_loan_a = loan["id"]

    def test_request_duplicate_blocked(self, session, user_a, fresh_equipment):
        r = session.post(
            f"{API}/loans/request",
            json={"equipment_id": fresh_equipment["id"], "requested_days": 3},
            headers=auth_h(user_a["access_token"]),
        )
        assert r.status_code == 400

    def test_request_queued_when_full(self, session, user_b, fresh_equipment):
        r = session.post(
            f"{API}/loans/request",
            json={"equipment_id": fresh_equipment["id"], "requested_days": 3},
            headers=auth_h(user_b["access_token"]),
        )
        assert r.status_code == 200, r.text
        loan = r.json()
        assert loan["status"] == "queued"
        assert loan["queue_position"] == 1
        pytest.shared_loan_b = loan["id"]

    def test_mine_lists(self, session, user_a):
        r = session.get(f"{API}/loans/mine", headers=auth_h(user_a["access_token"]))
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_return_activates_next(self, session, user_a, user_b, fresh_equipment):
        # user_a returns -> user_b's queued should become active
        r = session.post(f"{API}/loans/{pytest.shared_loan_a}/return", headers=auth_h(user_a["access_token"]))
        assert r.status_code == 200, r.text
        # Check user_b
        r2 = session.get(f"{API}/loans/mine", headers=auth_h(user_b["access_token"]))
        assert r2.status_code == 200
        b_loans = [l for l in r2.json() if l["id"] == pytest.shared_loan_b]
        assert len(b_loans) == 1
        assert b_loans[0]["status"] == "active", f"expected active after queue activation, got {b_loans[0]['status']}"

    def test_cancel_queued(self, session, user_a, fresh_equipment, admin_token):
        # user_a re-requests; user_b currently active -> a will be queued
        r = session.post(
            f"{API}/loans/request",
            json={"equipment_id": fresh_equipment["id"], "requested_days": 2},
            headers=auth_h(user_a["access_token"]),
        )
        assert r.status_code == 200
        loan = r.json()
        assert loan["status"] == "queued"
        # cancel
        rc = session.post(f"{API}/loans/{loan['id']}/cancel", headers=auth_h(user_a["access_token"]))
        assert rc.status_code == 200
        assert rc.json()["status"] == "cancelled"

    def test_all_loans_admin(self, session, admin_token, user_a):
        r = session.get(f"{API}/loans/all", headers=auth_h(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        # forbidden for user
        r2 = session.get(f"{API}/loans/all", headers=auth_h(user_a["access_token"]))
        assert r2.status_code == 403


# ---- Upload (Supabase Storage) ----
class TestUploads:
    def test_upload_image_authenticated(self, session, admin_token):
        import io
        # 1x1 PNG bytes
        png = bytes.fromhex(
            "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C489"
            "0000000A49444154789C636000000000050001A5F645400000000049454E44AE426082"
        )
        files = {"file": ("test.png", io.BytesIO(png), "image/png")}
        r = requests.post(
            f"{API}/uploads/image",
            files=files,
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"folder": "test"},
            timeout=30,
        )
        assert r.status_code == 200, f"upload failed: {r.status_code} {r.text}"
        d = r.json()
        assert "public_url" in d and d["public_url"].startswith("http")
        assert d.get("bucket") == "imagens"

    def test_upload_requires_auth(self, session):
        import io
        files = {"file": ("test.png", io.BytesIO(b"x"), "image/png")}
        r = requests.post(f"{API}/uploads/image", files=files, timeout=15)
        assert r.status_code == 401


# ---- Stats ----
class TestStats:
    def test_stats(self, session):
        r = session.get(f"{API}/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ["total_equipment", "active_loans", "queued_requests", "total_users"]:
            assert k in d
            assert isinstance(d[k], int)


# ---- Smart Queue Fairness ----
class TestFairness:
    """When equipment is full and two users compete, return should activate the user
    with fewer recent loans (lower fairness score). Build a scenario where user_b
    has a higher loan count than user_c, both queue for same equipment; on return,
    user_c (lower score) should be activated first."""

    def test_fairness_priority(self, session, admin_token):
        # Create a 1-unit equipment
        payload = {
            "name": "TEST_FAIR_" + uuid.uuid4().hex[:6],
            "category": "T", "description": "fair", "image_url": "u",
            "total_units": 1, "specs": "",
        }
        r = session.post(f"{API}/equipment", json=payload, headers=auth_h(admin_token))
        eq = r.json()
        eq_id = eq["id"]

        # Heavy user (will have higher fairness score)
        heavy = _register(session, "heavy")
        # Light user (lower fairness score, fewer loans)
        light = _register(session, "light")
        # Holder occupies the single unit
        holder = _register(session, "hold")

        try:
            # Inflate heavy user history by creating multiple loans on other equipment
            r_eq = session.get(f"{API}/equipment")
            other_eqs = [e for e in r_eq.json() if e["id"] != eq_id and e["available_units"] > 0]
            inflated = 0
            for oe in other_eqs[:3]:
                rh = session.post(
                    f"{API}/loans/request",
                    json={"equipment_id": oe["id"], "requested_days": 1},
                    headers=auth_h(heavy["access_token"]),
                )
                if rh.status_code == 200 and rh.json()["status"] == "active":
                    inflated += 1

            assert inflated >= 1, "couldn't inflate heavy user's history"

            # holder takes the test equipment (active)
            rh = session.post(
                f"{API}/loans/request",
                json={"equipment_id": eq_id, "requested_days": 1},
                headers=auth_h(holder["access_token"]),
            )
            assert rh.status_code == 200 and rh.json()["status"] == "active"
            holder_loan_id = rh.json()["id"]

            # heavy queues FIRST
            r1 = session.post(
                f"{API}/loans/request",
                json={"equipment_id": eq_id, "requested_days": 1},
                headers=auth_h(heavy["access_token"]),
            )
            assert r1.status_code == 200 and r1.json()["status"] == "queued"
            heavy_loan_id = r1.json()["id"]

            # light queues SECOND
            r2 = session.post(
                f"{API}/loans/request",
                json={"equipment_id": eq_id, "requested_days": 1},
                headers=auth_h(light["access_token"]),
            )
            assert r2.status_code == 200 and r2.json()["status"] == "queued"
            light_loan_id = r2.json()["id"]

            # holder returns -> fairness activates lighter user (despite heavy being first)
            rr = session.post(f"{API}/loans/{holder_loan_id}/return", headers=auth_h(holder["access_token"]))
            assert rr.status_code == 200

            # Check states
            r_light = session.get(f"{API}/loans/mine", headers=auth_h(light["access_token"]))
            light_loan = [l for l in r_light.json() if l["id"] == light_loan_id][0]
            r_heavy = session.get(f"{API}/loans/mine", headers=auth_h(heavy["access_token"]))
            heavy_loan = [l for l in r_heavy.json() if l["id"] == heavy_loan_id][0]

            assert light_loan["status"] == "active", (
                f"Smart queue fairness FAILED: light user not activated. "
                f"light={light_loan['status']}, heavy={heavy_loan['status']}"
            )
            assert heavy_loan["status"] == "queued"
        finally:
            session.delete(f"{API}/equipment/{eq_id}", headers=auth_h(admin_token))
