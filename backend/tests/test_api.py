"""Core API tests: health, auth, courses CRUD, students, orders, dashboard,
roles, teachers, categories, settings, orders export."""


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_signup_and_login(client):
    r = client.post("/api/auth/signup", json={
        "tenant_name": "Test Academy", "username": "testadmin",
        "email": "testadmin@testacademy.local", "password": "Test@1234",
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["tenant_name"] == "Test Academy"
    assert len(body["user"]["org_code"]) == 8
    assert body["user"]["org_code"].isupper()
    assert body["user"]["role"] == "Super Admin"

    r2 = client.post("/api/auth/login", json={"username": "testadmin", "password": "Test@1234"})
    assert r2.status_code == 200
    assert r2.json()["user"]["username"] == "testadmin"

    r3 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {r2.json()['access_token']}"})
    assert r3.status_code == 200
    assert r3.json()["org_code"] == body["user"]["org_code"]


def test_login_wrong_password_401(client):
    r = client.post("/api/auth/login", json={"username": "admin", "password": "Wrong@123"})
    assert r.status_code == 401


def test_login_unknown_user_401(client):
    r = client.post("/api/auth/login", json={"username": "nosuchuser", "password": "Wrong@123"})
    assert r.status_code == 401


def test_auth_required(client):
    assert client.get("/api/courses").status_code == 401
    assert client.get("/api/dashboard/stats").status_code == 401


def test_seed_demo_login_and_dashboard(client, admin_headers):
    r = client.get("/api/dashboard/stats", headers=admin_headers)
    assert r.status_code == 200
    d = r.json()
    assert d["total_courses"] == 5
    assert d["total_students"] == 8
    assert d["total_teachers"] == 1
    assert d["total_orders"] == 5
    # SUCCESS orders: 1999 + 1999 + 1999 + 999 = 6996
    assert d["total_earnings"] == 6996.0
    assert d["storage_plan"] == "FREE"
    assert d["payment_gateway"]["provider"] == "Razorpay"
    assert d["payment_gateway"]["merchant_id"] == "SQIP****"


def test_courses_crud(client, admin_headers):
    # Create
    r = client.post("/api/courses", json={
        "title": "Test Course CRUD", "mrp": 1000, "price": 799,
        "validity_days": 90, "description": "<p>Demo</p>",
        "show_in_app": True, "drip_content": False,
    }, headers=admin_headers)
    assert r.status_code == 201, r.text
    cid = r.json()["id"]
    assert r.json()["title"] == "Test Course CRUD"
    assert r.json()["show_in_app"] is True

    # List + search
    r = client.get("/api/courses?search=Test Course CRUD", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["total"] == 1

    # Get
    r = client.get(f"/api/courses/{cid}", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["price"] == 799

    # Update
    r = client.put(f"/api/courses/{cid}", json={"price": 699, "title": "Test Course CRUD Updated"}, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["price"] == 699

    # Delete
    r = client.delete(f"/api/courses/{cid}", headers=admin_headers)
    assert r.status_code == 204
    assert client.get(f"/api/courses/{cid}", headers=admin_headers).status_code == 404


def test_courses_seed_contains_hindi_class_12(client, admin_headers):
    r = client.get("/api/courses?search=Hindi Class 12", headers=admin_headers)
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["title"] == "Hindi Class 12"


def test_students_search_and_masking(client, admin_headers):
    r = client.get("/api/students?search=Aarav", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["total"] == 1
    item = r.json()["items"][0]
    assert item["name"] == "Aarav Sharma"
    # List: masked phone, no full phone
    assert item["masked_phone"] == "+91 *****00001"
    assert item["phone"] is None

    # Detail: full phone present
    r = client.get(f"/api/students/{item['id']}", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["phone"] == "9876500001"
    assert r.json()["masked_phone"] == "+91 *****00001"

    # Filter by city
    r = client.get("/api/students?city=Hazaribagh", headers=admin_headers)
    assert r.json()["total"] == 3


def test_orders_list_and_export(client, admin_headers):
    r = client.get("/api/orders", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["total"] == 5

    r = client.get("/api/orders?status=SUCCESS", headers=admin_headers)
    assert r.json()["total"] == 4

    r = client.get("/api/orders?status=PENDING", headers=admin_headers)
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["transaction_id"] == "TXNDEMO0003"

    r = client.get("/api/orders/export", headers=admin_headers)
    assert r.status_code == 200
    assert "text/csv" in r.headers["content-type"]
    assert r.text.splitlines()[0] == "student,contact,status,transaction_id,date,amount,items"
    assert "TXNDEMO0001" in r.text


def test_categories_crud(client, admin_headers):
    r = client.post("/api/course-categories", json={"name": "Maths"}, headers=admin_headers)
    assert r.status_code == 201
    cat_id = r.json()["id"]
    r = client.post("/api/course-subcategories", json={"name": "Class 10", "category_id": cat_id}, headers=admin_headers)
    assert r.status_code == 201
    sub_id = r.json()["id"]
    assert client.get("/api/course-categories", headers=admin_headers).json()[-1]["name"] == "Maths"
    r = client.put(f"/api/course-subcategories/{sub_id}", json={"name": "Class 9", "category_id": cat_id}, headers=admin_headers)
    assert r.json()["name"] == "Class 9"
    assert client.delete(f"/api/course-subcategories/{sub_id}", headers=admin_headers).status_code == 204
    assert client.delete(f"/api/course-categories/{cat_id}", headers=admin_headers).status_code == 204


def test_teachers_phone_validation(client, admin_headers):
    r = client.post("/api/teachers", json={
        "name": "Bad Phone", "subject": "Maths", "email": "bad@example.com",
        "phone": "12345", "experience_years": 1,
    }, headers=admin_headers)
    assert r.status_code == 422

    r = client.post("/api/teachers", json={
        "name": "Good Teacher", "subject": "Maths", "email": "good@example.com",
        "phone": "9876500011", "experience_years": 5, "display_weight": 1,
        "tagline": "Hi", "categories": ["English"],
    }, headers=admin_headers)
    assert r.status_code == 201, r.text
    tid = r.json()["id"]
    assert client.delete(f"/api/teachers/{tid}", headers=admin_headers).status_code == 204


def test_roles_seed_and_validation(client, admin_headers):
    r = client.get("/api/roles", headers=admin_headers)
    assert r.status_code == 200
    roles = r.json()
    admin_role = next(x for x in roles if x["name"] == "Admin")
    assert admin_role["is_system_default"] is True
    assert len(admin_role["permissions"]) == 37  # spec says 36, list has 37 — list wins
    assert "Manage Course" in admin_role["permissions"]
    teacher_role = next(x for x in roles if x["name"] == "Teacher")
    assert len(teacher_role["permissions"]) < 37

    # Invalid permission rejected
    r = client.post("/api/roles", json={"name": "Bad", "permissions": ["Fly To Moon"]}, headers=admin_headers)
    assert r.status_code == 422

    # Valid custom role CRUD
    r = client.post("/api/roles", json={"name": "Viewer", "permissions": ["View Course"]}, headers=admin_headers)
    assert r.status_code == 201
    rid = r.json()["id"]
    r = client.put(f"/api/roles/{rid}", json={"permissions": ["View Course", "View Students"]}, headers=admin_headers)
    assert r.status_code == 200
    assert client.delete(f"/api/roles/{rid}", headers=admin_headers).status_code == 204


def test_settings_get_put(client, admin_headers):
    r = client.get("/api/settings", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["company_name"] == "Demo Academy"
    r = client.put("/api/settings", json={"company_name": "Demo Academy", "gst_rate": 7, "gstin": "TESTGSTIN"}, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["gst_rate"] == 7
    # Restore
    client.put("/api/settings", json={"company_name": "Demo Academy", "gst_rate": 0, "gstin": ""}, headers=admin_headers)
