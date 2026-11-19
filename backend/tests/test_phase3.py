"""Phase 3 tests: student mobile API (demo OTP auth, purchases, attempts)."""

DEMO_ORG = "DEMO0001"
SECOND_ORG = "SECN0002"


def _student_headers(client, org_code, phone, name="Phase3 Student"):
    r = client.post("/api/student/auth/verify", json={"org_code": org_code, "phone": phone, "otp": "123456", "name": name})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    return {"Authorization": f"Bearer {body['access_token']}"}, body["student"]


def test_request_otp(client):
    assert client.post("/api/student/auth/request-otp", json={"org_code": "NOPE0000", "phone": "9876500901"}).status_code == 404
    r = client.post("/api/student/auth/request-otp", json={"org_code": DEMO_ORG, "phone": "12345"})
    assert r.status_code == 400
    r = client.post("/api/student/auth/request-otp", json={"org_code": DEMO_ORG, "phone": "9876500901"})
    assert r.status_code == 200, r.text
    assert r.json()["demo_otp"] == "123456"
    assert "message" in r.json()


def test_verify_otp(client):
    # Wrong OTP rejected
    r = client.post("/api/student/auth/verify", json={"org_code": DEMO_ORG, "phone": "9876500911", "otp": "000000", "name": "Nope"})
    assert r.status_code == 400
    # New student without a name rejected
    r = client.post("/api/student/auth/verify", json={"org_code": DEMO_ORG, "phone": "9876500911", "otp": "123456"})
    assert r.status_code == 400
    # Correct OTP creates the student and returns a token
    headers, student = _student_headers(client, DEMO_ORG, "9876500911", "Phase3 New")
    assert student["name"] == "Phase3 New"
    assert student["phone"] == "9876500911"
    assert student["org_code"] == DEMO_ORG
    assert student["tenant_name"] == "Demo Academy"
    # Re-verify as the existing student: no name needed
    r = client.post("/api/student/auth/verify", json={"org_code": DEMO_ORG, "phone": "9876500911", "otp": "123456"})
    assert r.status_code == 200, r.text
    # Unknown org
    assert client.post("/api/student/auth/verify", json={"org_code": "NOPE0000", "phone": "9876500911", "otp": "123456"}).status_code == 404


def test_student_endpoints_require_student_auth(client, admin_headers):
    for path in ("/api/student/me", "/api/student/home", "/api/student/courses", "/api/student/my-courses",
                 "/api/student/my-orders", "/api/student/test-series", "/api/student/scores",
                 "/api/student/videos", "/api/student/notes", "/api/student/syllabus",
                 "/api/student/assignments", "/api/student/seminars", "/api/student/notifications",
                 "/api/student/teachers", "/api/student/bundles"):
        assert client.get(path).status_code == 401, path
        # Admin (User) tokens must NOT authenticate as students
        assert client.get(path, headers=admin_headers).status_code == 401, path


def test_me_and_home(client):
    headers, student = _student_headers(client, DEMO_ORG, "9876500912", "Phase3 Home")
    r = client.get("/api/student/me", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["id"] == student["id"]
    assert r.json()["tenant_name"] == "Demo Academy"
    assert r.json()["org_code"] == DEMO_ORG
    r = client.get("/api/student/home", headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    for key in ("banners", "featured_courses", "test_series", "current_affairs", "jobs", "toppers", "testimonials"):
        assert key in body, key
        assert isinstance(body[key], list)
    assert len(body["featured_courses"]) == 5
    assert len(body["test_series"]) == 2
    assert len(body["banners"]) == 3


def test_course_purchase_flow(client):
    headers, _ = _student_headers(client, DEMO_ORG, "9876500913", "Phase3 Buyer")
    courses = client.get("/api/student/courses", headers=headers).json()
    assert courses["total"] == 5
    course = courses["items"][0]
    # First purchase: creates a SUCCESS demo order
    r = client.post(f"/api/student/courses/{course['id']}/purchase", headers=headers)
    assert r.status_code == 200, r.text
    order = r.json()
    assert order["status"] == "SUCCESS"
    assert order["amount"] == course["price"]
    assert order["items"] == [course["title"]]
    assert order["transaction_id"].startswith("DEMO-")
    assert order["demo_purchase"] is True
    # My courses / my orders contain it
    mine = client.get("/api/student/my-courses", headers=headers).json()
    assert any(c["id"] == course["id"] for c in mine["items"])
    orders = client.get("/api/student/my-orders", headers=headers).json()
    assert orders["total"] == 1
    assert orders["items"][0]["id"] == order["id"]
    # Second purchase: same order, no duplicate
    r2 = client.post(f"/api/student/courses/{course['id']}/purchase", headers=headers)
    assert r2.status_code == 200, r2.text
    assert r2.json()["id"] == order["id"]
    assert client.get("/api/student/my-orders", headers=headers).json()["total"] == 1
    assert client.post("/api/student/courses/999999/purchase", headers=headers).status_code == 404
    # Detail 404 for unknown course
    assert client.get("/api/student/courses/999999", headers=headers).status_code == 404


def test_test_series_detail_hides_answers_and_attempt_scores(client, admin_headers):
    headers, _ = _student_headers(client, DEMO_ORG, "9876500914", "Phase3 Tester")
    series = client.get("/api/test-series?search=Hindi Class 12 Test Series", headers=admin_headers).json()["items"][0]
    sid = series["id"]
    # Detail must not leak correct answers
    r = client.get(f"/api/student/test-series/{sid}", headers=headers)
    assert r.status_code == 200, r.text
    assert "correct_option" not in r.text
    assert "correct_answer" not in r.text
    questions = r.json()["questions"]
    assert len(questions) == 3
    for q in questions:
        assert set(q.keys()) == {"id", "question", "options", "marks"}, q.keys()
        assert len(q["options"]) == 4
    # All-correct attempt: seeded questions are all correct_option "A" (index 0), marks 1
    answers = {str(q["id"]): 0 for q in questions}
    r = client.post(f"/api/student/test-series/{sid}/attempt", json={"answers": answers}, headers=headers)
    assert r.status_code == 200, r.text
    assert r.json() == {"score": 3.0, "total_marks": 3.0, "correct": 3, "total_questions": 3}
    # All-wrong attempt scores 0 (negative marks floored at 0)
    wrong = {str(q["id"]): 1 for q in questions}
    r = client.post(f"/api/student/test-series/{sid}/attempt", json={"answers": wrong}, headers=headers)
    assert r.json()["score"] == 0
    assert r.json()["correct"] == 0
    # Scores recorded for this student, chapter_test = series title
    scores = client.get("/api/student/scores", headers=headers).json()
    assert scores["total"] == 2
    assert all(s["chapter_test"] == series["title"] for s in scores["items"])
    assert scores["items"][0]["score"] == 0  # most recent first
    # Unknown series 404
    assert client.get("/api/student/test-series/999999", headers=headers).status_code == 404
    assert client.post("/api/student/test-series/999999/attempt", json={"answers": {}}, headers=headers).status_code == 404


def test_cross_tenant_student_isolation(client, admin_headers):
    demo_course = client.get("/api/courses", headers=admin_headers).json()["items"][0]
    demo_series = client.get("/api/test-series", headers=admin_headers).json()["items"][0]
    # Seeded Second Academy student (phone 9123456780): verify reuses the
    # existing row — creating a new second-tenant student here would break
    # test_tenant_isolation's total_students == 1 assertion.
    r = client.post("/api/student/auth/verify", json={"org_code": SECOND_ORG, "phone": "9123456780", "otp": "123456"})
    assert r.status_code == 200, r.text
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get(f"/api/student/courses/{demo_course['id']}", headers=headers).status_code == 404
    assert client.get(f"/api/student/test-series/{demo_series['id']}", headers=headers).status_code == 404
    assert client.post(f"/api/student/courses/{demo_course['id']}/purchase", headers=headers).status_code == 404
    # Second tenant sees only its own course in lists
    courses = client.get("/api/student/courses", headers=headers).json()
    assert courses["total"] == 1
    assert courses["items"][0]["title"] == "Second Academy Demo Course"
    assert client.get("/api/student/test-series", headers=headers).json()["total"] == 0


def test_student_content_lists(client):
    headers, _ = _student_headers(client, DEMO_ORG, "9876500916", "Phase3 Reader")
    assert client.get("/api/student/videos", headers=headers).json()["total"] == 2
    assert client.get("/api/student/notes", headers=headers).json()["total"] == 3
    assert client.get("/api/student/previous-papers", headers=headers).json()["total"] == 2
    assert client.get("/api/student/ebooks", headers=headers).json()["total"] == 2
    syllabus = client.get("/api/student/syllabus", headers=headers).json()
    assert syllabus["total"] == 1
    assert syllabus["items"][0]["kind"] == "syllabus"
    assert client.get("/api/student/seminars", headers=headers).json()["total"] == 1
    assert client.get("/api/student/notifications", headers=headers).json()["total"] >= 2
    assert client.get("/api/student/teachers", headers=headers).json()["total"] >= 1
    assert client.get("/api/student/bundles", headers=headers).json()["total"] == 1


def test_assignments_and_enquiries(client, admin_headers):
    headers, student = _student_headers(client, DEMO_ORG, "9876500917", "Phase3 Assignee")
    r = client.get("/api/student/assignments", headers=headers)
    assert r.status_code == 200, r.text
    assert len(r.json()["video_assignments"]) >= 1
    assert len(r.json()["test_assignments"]) >= 1
    va_id = r.json()["video_assignments"][0]["id"]
    ta_id = r.json()["test_assignments"][0]["id"]
    r = client.post(f"/api/student/assignments/video/{va_id}/submit", json={"text": "my summary"}, headers=headers)
    assert r.status_code == 201, r.text
    assert r.json()["status"] == "SUBMITTED"
    assert r.json()["student_id"] == student["id"]
    r = client.post(f"/api/student/assignments/test/{ta_id}/submit", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "COMPLETED"
    assert r.json()["score"] == 0
    assert r.json()["total_marks"] == 3.0  # seeded Hindi series: 3 x 1-mark questions
    # Re-submit updates the same row, no duplicate
    r2 = client.post(f"/api/student/assignments/test/{ta_id}/submit", headers=headers)
    assert r2.status_code == 200
    assert r2.json()["id"] == r.json()["id"]
    assert client.post("/api/student/assignments/video/999999/submit", json={"text": "x"}, headers=headers).status_code == 404
    assert client.post("/api/student/assignments/test/999999/submit", headers=headers).status_code == 404
    # Enquiry: name/phone default from the student
    r = client.post("/api/student/enquiries", json={"message": "Fees enquiry"}, headers=headers)
    assert r.status_code == 201, r.text
    assert r.json()["name"] == "Phase3 Assignee"
    assert r.json()["phone"] == "9876500917"
    assert r.json()["message"] == "Fees enquiry"
    assert r.json()["status"] == "NEW"
