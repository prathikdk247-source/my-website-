"""AgroConnect backend regression tests covering auth, listings, posts, comments,
messages and users endpoints. Uses BASE_URL from env (REACT_APP_BACKEND_URL).
"""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://farmer-hub-29.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

FARMER = {"email": "ravi@agroconnect.in", "password": "Farm@123"}
BUYER = {"email": "buyer@agroconnect.in", "password": "Buy@1234"}


# ---- Fixtures ----
@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(http, creds):
    r = http.post(f"{API}/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    return data["token"], data["user"]


@pytest.fixture(scope="session")
def farmer_auth(http):
    token, user = _login(http, FARMER)
    return {"token": token, "user": user, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture(scope="session")
def buyer_auth(http):
    token, user = _login(http, BUYER)
    return {"token": token, "user": user, "headers": {"Authorization": f"Bearer {token}"}}


# ---- Health ----
class TestHealth:
    def test_root(self, http):
        r = http.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---- Auth ----
class TestAuth:
    def test_login_farmer(self, http):
        r = http.post(f"{API}/auth/login", json=FARMER)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 0
        assert data["user"]["email"] == FARMER["email"]
        assert data["user"]["role"] == "farmer"

    def test_login_buyer(self, http):
        r = http.post(f"{API}/auth/login", json=BUYER)
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["role"] == "buyer"

    def test_login_invalid(self, http):
        r = http.post(f"{API}/auth/login", json={"email": FARMER["email"], "password": "wrong"})
        assert r.status_code == 401

    def test_register_and_me(self, http):
        email = f"test_{uuid.uuid4().hex[:8]}@agroconnect.in"
        payload = {"name": "TEST User", "phone": "+91 9999999999", "email": email,
                   "password": "Test@1234", "role": "farmer", "location": "TestCity"}
        r = http.post(f"{API}/auth/register", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["email"] == email
        token = data["token"]

        # /auth/me with Bearer
        r2 = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 200
        assert r2.json()["email"] == email

    def test_register_duplicate(self, http):
        r = http.post(f"{API}/auth/register", json={
            "name": "Dup", "phone": "+91", "email": FARMER["email"],
            "password": "Test@1234", "role": "farmer",
        })
        assert r.status_code == 400

    def test_me_unauthorized(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_update_profile(self, farmer_auth):
        new_bio = f"updated bio {uuid.uuid4().hex[:6]}"
        r = requests.put(f"{API}/auth/me", json={"bio": new_bio}, headers=farmer_auth["headers"])
        assert r.status_code == 200
        assert r.json()["bio"] == new_bio
        # verify persistence via GET
        r2 = requests.get(f"{API}/auth/me", headers=farmer_auth["headers"])
        assert r2.json()["bio"] == new_bio


# ---- Listings ----
class TestListings:
    def test_list_all(self, http):
        r = http.get(f"{API}/listings")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 6  # seeded

    def test_filter_category(self, http):
        for cat in ["seeds", "fertilizers", "pesticides", "equipment"]:
            r = http.get(f"{API}/listings", params={"category": cat})
            assert r.status_code == 200
            for it in r.json():
                assert it["category"] == cat

    def test_search_query(self, http):
        r = http.get(f"{API}/listings", params={"q": "Tomato"})
        assert r.status_code == 200
        items = r.json()
        assert any("Tomato" in it["title"] for it in items)

    def test_create_listing_requires_auth(self):
        # use a fresh client (no cookies) to ensure unauthenticated
        r = requests.post(f"{API}/listings", json={"title": "x", "category": "seeds",
                                               "price": 1, "unit": "kg", "quantity": 1,
                                               "location": "x"})
        assert r.status_code == 401

    def test_listing_crud_owner_only(self, farmer_auth, buyer_auth):
        payload = {"title": "TEST_Wheat Seeds", "category": "seeds", "price": 200,
                   "unit": "kg", "quantity": 10, "location": "TestVille",
                   "description": "test"}
        r = requests.post(f"{API}/listings", json=payload, headers=farmer_auth["headers"])
        assert r.status_code == 200, r.text
        lid = r.json()["id"]
        assert r.json()["seller_id"] == farmer_auth["user"]["id"]

        # buyer cannot delete farmer's listing
        rd = requests.delete(f"{API}/listings/{lid}", headers=buyer_auth["headers"])
        assert rd.status_code == 403

        # owner deletes
        rd2 = requests.delete(f"{API}/listings/{lid}", headers=farmer_auth["headers"])
        assert rd2.status_code == 200

        # verify gone
        rg = requests.get(f"{API}/listings/{lid}")
        assert rg.status_code == 404

    def test_listings_by_user(self, http, farmer_auth):
        r = http.get(f"{API}/listings/user/{farmer_auth['user']['id']}")
        assert r.status_code == 200
        for it in r.json():
            assert it["seller_id"] == farmer_auth["user"]["id"]


# ---- Posts ----
class TestPosts:
    def test_list_posts(self, http):
        r = http.get(f"{API}/posts")
        assert r.status_code == 200
        posts = r.json()
        assert isinstance(posts, list) and len(posts) >= 3

    def test_post_lifecycle(self, farmer_auth):
        # create
        r = requests.post(f"{API}/posts", json={"content": "TEST post content"},
                          headers=farmer_auth["headers"])
        assert r.status_code == 200
        pid = r.json()["id"]
        assert r.json()["author_id"] == farmer_auth["user"]["id"]
        assert r.json()["comment_count"] == 0

        # like (toggle)
        rl = requests.post(f"{API}/posts/{pid}/like", headers=farmer_auth["headers"])
        assert rl.status_code == 200
        assert farmer_auth["user"]["id"] in rl.json()["likes"]
        # unlike
        rl2 = requests.post(f"{API}/posts/{pid}/like", headers=farmer_auth["headers"])
        assert farmer_auth["user"]["id"] not in rl2.json()["likes"]

        # comment
        rc = requests.post(f"{API}/posts/{pid}/comments", json={"content": "TEST comment"},
                           headers=farmer_auth["headers"])
        assert rc.status_code == 200

        rcl = requests.get(f"{API}/posts/{pid}/comments")
        assert rcl.status_code == 200
        assert any(c["content"] == "TEST comment" for c in rcl.json())

        # verify comment_count via GET posts
        rp = requests.get(f"{API}/posts")
        found = next((p for p in rp.json() if p["id"] == pid), None)
        assert found and found["comment_count"] == 1

        # delete
        rd = requests.delete(f"{API}/posts/{pid}", headers=farmer_auth["headers"])
        assert rd.status_code == 200

    def test_delete_non_owner_forbidden(self, farmer_auth, buyer_auth):
        r = requests.post(f"{API}/posts", json={"content": "TEST post own"},
                          headers=farmer_auth["headers"])
        pid = r.json()["id"]
        rd = requests.delete(f"{API}/posts/{pid}", headers=buyer_auth["headers"])
        assert rd.status_code == 403
        # cleanup
        requests.delete(f"{API}/posts/{pid}", headers=farmer_auth["headers"])


# ---- Messages ----
class TestMessages:
    def test_send_and_thread(self, farmer_auth, buyer_auth):
        msg = f"hello TEST_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/messages",
                          json={"to_user_id": buyer_auth["user"]["id"], "content": msg},
                          headers=farmer_auth["headers"])
        assert r.status_code == 200, r.text
        assert r.json()["content"] == msg

        # thread (from farmer side)
        rt = requests.get(f"{API}/messages/{buyer_auth['user']['id']}",
                          headers=farmer_auth["headers"])
        assert rt.status_code == 200
        assert any(m["content"] == msg for m in rt.json())

        # conversations
        rc = requests.get(f"{API}/messages/conversations", headers=farmer_auth["headers"])
        assert rc.status_code == 200
        assert any(c["user_id"] == buyer_auth["user"]["id"] for c in rc.json())

    def test_send_to_invalid_user(self, farmer_auth):
        r = requests.post(f"{API}/messages",
                          json={"to_user_id": "nonexistent-id", "content": "hi"},
                          headers=farmer_auth["headers"])
        assert r.status_code == 404


# ---- Users ----
class TestUsers:
    def test_get_user(self, http, farmer_auth):
        r = http.get(f"{API}/users/{farmer_auth['user']['id']}")
        assert r.status_code == 200
        assert r.json()["email"] == FARMER["email"]

    def test_get_user_not_found(self, http):
        r = http.get(f"{API}/users/nonexistent-xyz")
        assert r.status_code == 404
