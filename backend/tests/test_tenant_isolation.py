"""Tenant isolation: Second Academy must not see Demo Academy data (404, not leak)."""


def test_second_tenant_sees_only_own_data(client, admin_headers, second_headers):
    # Second tenant dashboard: 1 course, 1 student, 0 orders
    r = client.get("/api/dashboard/stats", headers=second_headers)
    assert r.status_code == 200
    assert r.json()["total_courses"] == 1
    assert r.json()["total_students"] == 1
    assert r.json()["total_orders"] == 0

    # Second tenant course list has only its own course
    r = client.get("/api/courses", headers=second_headers)
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["title"] == "Second Academy Demo Course"
    second_course_id = r.json()["items"][0]["id"]

    # Demo tenant course ids are invisible to second tenant
    r = client.get("/api/courses?search=Hindi Class 12", headers=second_headers)
    assert r.json()["total"] == 0
    demo_course = client.get("/api/courses?search=Hindi Class 12", headers=admin_headers).json()["items"][0]
    assert client.get(f"/api/courses/{demo_course['id']}", headers=second_headers).status_code == 404
    assert client.put(f"/api/courses/{demo_course['id']}", json={"price": 1}, headers=second_headers).status_code == 404
    assert client.delete(f"/api/courses/{demo_course['id']}", headers=second_headers).status_code == 404

    # Demo students invisible to second tenant
    demo_student = client.get("/api/students?search=Aarav", headers=admin_headers).json()["items"][0]
    assert client.get(f"/api/students/{demo_student['id']}", headers=second_headers).status_code == 404
    r = client.get("/api/students?search=Aarav", headers=second_headers)
    assert r.json()["total"] == 0

    # Demo orders invisible to second tenant
    demo_order = client.get("/api/orders", headers=admin_headers).json()["items"][0]
    assert client.get(f"/api/orders/{demo_order['id']}", headers=second_headers).status_code == 404
    assert client.get("/api/orders", headers=second_headers).json()["total"] == 0

    # And the reverse: demo admin cannot see second tenant's course
    assert client.get(f"/api/courses/{second_course_id}", headers=admin_headers).status_code == 404
