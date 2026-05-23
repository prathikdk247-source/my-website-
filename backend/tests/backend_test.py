"""AgroConnect backend regression tests (rewritten for AgroShops + Farmer Chat).
Covers: auth (register/login/me, Indian phone validation, admin email reserved),
agroshops (list/filter/admin gate), chat (send/empty/oversize/delete permissions).
Uses BASE_URL from REACT_APP_BACKEND_URL.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@agroconnect.in", "password": "Admin@2026"}
FARMER = {"email": "ravi@agroconnect.in", "password": "Farm@123"}
TINY_PNG = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)


# ---- Fixtures ----
@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(http, creds):
    r = http.post(f"{API}/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="session")
def admin_auth(http):
    d = _login(http, ADMIN)
    return {"token": d["token"], "user": d["user"], "headers": {"Authorization": f"Bearer {d['token']}"}}


@pytest.fixture(scope="session")
def farmer_auth(http):
    d = _login(http, FARMER)
    return {"token": d["token"], "user": d["user"], "headers": {"Authorization": f"Bearer {d['token']}"}}


# ---- Health ----
class TestHealth:
    def test_root(self, http):
        r = http.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---- Auth: phone validation + admin reserve ----
class TestAuth:
    def test_login_admin(self, http):
        r = http.post(f"{API}/auth/login", json=ADMIN)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["role"] == "admin"
        assert d["user"]["email"] == ADMIN["email"]
        assert isinstance(d["token"], str) and len(d["token"]) > 0

    def test_login_farmer(self, http):
        r = http.post(f"{API}/auth/login", json=FARMER)
        assert r.status_code == 200, r.text
        assert r.json()["user"]["role"] == "farmer"

    def test_login_invalid(self, http):
        r = http.post(f"{API}/auth/login", json={"email": FARMER["email"], "password": "wrong"})
        assert r.status_code == 401

    def test_me_unauthorized(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_bearer(self, farmer_auth):
        r = requests.get(f"{API}/auth/me", headers=farmer_auth["headers"])
        assert r.status_code == 200
        assert r.json()["email"] == FARMER["email"]

    def test_register_valid_indian_phone(self, http):
        email = f"test_{uuid.uuid4().hex[:8]}@agroconnect.in"
        r = http.post(f"{API}/auth/register", json={
            "name": "TEST User", "phone": "+91 9876543210",
            "email": email, "password": "Test@1234",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["email"] == email
        assert d["user"]["role"] == "farmer"
        assert d["user"]["phone"] == "+919876543210"  # cleaned of spaces/dashes
        # /auth/me with returned token
        m = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {d['token']}"})
        assert m.status_code == 200 and m.json()["email"] == email

    def test_register_rejects_us_number(self, http):
        # 10-digit starting with 1 → invalid Indian
        r = http.post(f"{API}/auth/register", json={
            "name": "Bad Phone", "phone": "1234567890",
            "email": f"bad_{uuid.uuid4().hex[:6]}@agroconnect.in",
            "password": "Test@1234",
        })
        assert r.status_code == 422, r.text  # pydantic validation error

    def test_register_rejects_11_digit_us(self, http):
        r = http.post(f"{API}/auth/register", json={
            "name": "Bad Phone2", "phone": "+1 415 555 1234",
            "email": f"bad2_{uuid.uuid4().hex[:6]}@agroconnect.in",
            "password": "Test@1234",
        })
        assert r.status_code == 422

    def test_register_reserves_admin_email(self, http):
        # Admin already exists → either 400 duplicate or 400 reserved; both acceptable
        r = http.post(f"{API}/auth/register", json={
            "name": "Imposter", "phone": "9876543210",
            "email": ADMIN["email"], "password": "Test@1234",
        })
        assert r.status_code == 400, r.text

    def test_register_duplicate(self, http):
        r = http.post(f"{API}/auth/register", json={
            "name": "Dup", "phone": "9876543210",
            "email": FARMER["email"], "password": "Test@1234",
        })
        assert r.status_code == 400


# ---- AgroShops ----
class TestAgroShops:
    def test_list_all_seeded(self, http):
        r = http.get(f"{API}/agroshops")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 8  # 8 seeded shops
        # Should not contain mongo _id
        assert all("_id" not in it for it in items)

    @pytest.mark.parametrize("cat", ["seeds", "fertilizers", "pesticides", "equipment"])
    def test_filter_each_category(self, http, cat):
        r = http.get(f"{API}/agroshops", params={"category": cat})
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 2, f"expected ≥2 seeded for {cat}"
        for it in items:
            assert it["category"] == cat

    def test_create_requires_admin_403_for_farmer(self, farmer_auth):
        r = requests.post(f"{API}/agroshops", json={
            "name": "TEST_Should_Fail", "category": "seeds",
            "contact": "+91 9000000099", "location": "Nowhere",
        }, headers=farmer_auth["headers"])
        assert r.status_code == 403

    def test_create_requires_auth_401_anon(self):
        r = requests.post(f"{API}/agroshops", json={
            "name": "TEST_Anon", "category": "seeds",
            "contact": "x", "location": "x",
        })
        assert r.status_code == 401

    def test_admin_create_and_delete(self, admin_auth):
        payload = {
            "name": f"TEST_Shop_{uuid.uuid4().hex[:6]}",
            "category": "fertilizers",
            "contact": "+91 9876500000",
            "location": "Test City, TS",
            "description": "test created by pytest",
        }
        r = requests.post(f"{API}/agroshops", json=payload, headers=admin_auth["headers"])
        assert r.status_code == 200, r.text
        shop = r.json()
        assert shop["name"] == payload["name"]
        assert shop["category"] == "fertilizers"
        sid = shop["id"]

        # GET filter must include it
        g = requests.get(f"{API}/agroshops", params={"category": "fertilizers"})
        assert any(s["id"] == sid for s in g.json())

        # farmer cannot delete
        rdf = requests.delete(f"{API}/agroshops/{sid}",
                              headers={"Authorization": f"Bearer "})  # garbage
        assert rdf.status_code == 401

        # admin deletes
        rd = requests.delete(f"{API}/agroshops/{sid}", headers=admin_auth["headers"])
        assert rd.status_code == 200

        # verify removal
        g2 = requests.get(f"{API}/agroshops", params={"category": "fertilizers"})
        assert not any(s["id"] == sid for s in g2.json())

    def test_delete_forbidden_for_farmer(self, farmer_auth, http):
        # find any seeded id
        items = http.get(f"{API}/agroshops").json()
        sid = items[0]["id"]
        r = requests.delete(f"{API}/agroshops/{sid}", headers=farmer_auth["headers"])
        assert r.status_code == 403


# ---- Chat ----
class TestChat:
    def test_history_requires_auth(self):
        r = requests.get(f"{API}/chat")
        assert r.status_code == 401

    def test_send_text(self, farmer_auth):
        msg = f"TEST_hello_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/chat", json={"text": msg}, headers=farmer_auth["headers"])
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["text"] == msg
        assert d["user_name"] == farmer_auth["user"]["name"]
        # show up in history
        h = requests.get(f"{API}/chat", headers=farmer_auth["headers"])
        assert any(m["id"] == d["id"] for m in h.json())
        # cleanup
        requests.delete(f"{API}/chat/{d['id']}", headers=farmer_auth["headers"])

    def test_send_image(self, farmer_auth):
        r = requests.post(f"{API}/chat", json={"text": "", "image": TINY_PNG}, headers=farmer_auth["headers"])
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["image"] == TINY_PNG
        requests.delete(f"{API}/chat/{d['id']}", headers=farmer_auth["headers"])

    def test_reject_empty(self, farmer_auth):
        r = requests.post(f"{API}/chat", json={"text": "", "image": None}, headers=farmer_auth["headers"])
        assert r.status_code == 400

    def test_reject_oversize_image(self, farmer_auth):
        big = "data:image/png;base64," + ("A" * 1_600_000)
        r = requests.post(f"{API}/chat", json={"text": "", "image": big}, headers=farmer_auth["headers"])
        assert r.status_code == 400

    def test_reject_non_dataurl_image(self, farmer_auth):
        r = requests.post(f"{API}/chat", json={"text": "x", "image": "http://example.com/x.png"},
                          headers=farmer_auth["headers"])
        assert r.status_code == 400

    def test_delete_only_owner_or_admin(self, farmer_auth, admin_auth):
        # farmer sends a message
        r = requests.post(f"{API}/chat", json={"text": f"TEST_perm_{uuid.uuid4().hex[:4]}"},
                          headers=farmer_auth["headers"])
        assert r.status_code == 200
        mid = r.json()["id"]

        # register a third user and try to delete → 403
        other_email = f"other_{uuid.uuid4().hex[:6]}@agroconnect.in"
        reg = requests.post(f"{API}/auth/register", json={
            "name": "TEST Other", "phone": "9876543210",
            "email": other_email, "password": "Test@1234",
        })
        assert reg.status_code == 200
        other_tok = reg.json()["token"]
        rd = requests.delete(f"{API}/chat/{mid}", headers={"Authorization": f"Bearer {other_tok}"})
        assert rd.status_code == 403

        # admin can delete others' messages
        rda = requests.delete(f"{API}/chat/{mid}", headers=admin_auth["headers"])
        assert rda.status_code == 200

    def test_owner_can_delete_own(self, farmer_auth):
        r = requests.post(f"{API}/chat", json={"text": "TEST_own_del"}, headers=farmer_auth["headers"])
        mid = r.json()["id"]
        rd = requests.delete(f"{API}/chat/{mid}", headers=farmer_auth["headers"])
        assert rd.status_code == 200
