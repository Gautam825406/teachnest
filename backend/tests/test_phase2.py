"""Phase 2 tests: auth, tenant isolation, and create+list per module group."""


def test_phase2_unauthenticated_401(client):
    assert client.get("/api/test-series").status_code == 401
    assert client.get("/api/leads").status_code == 401
    assert client.get("/api/notes").status_code == 401
    assert client.get("/api/ebooks").status_code == 401
    assert client.get("/api/banners").status_code == 401
    assert client.get("/api/coupons").status_code == 401
    assert client.get("/api/users").status_code == 401
    assert client.get("/api/course-logs").status_code == 401
    assert client.post("/api/uploads", files={"file": ("x.png", b"data", "image/png")}).status_code == 401


def test_phase2_seed_counts(client, admin_headers, second_headers):
    # Demo Academy seeded rows; Second Academy gets nothing new.
    assert client.get("/api/test-series", headers=admin_headers).json()["total"] == 2
    assert client.get("/api/test-series", headers=second_headers).json()["total"] == 0
    assert client.get("/api/notes", headers=admin_headers).json()["total"] == 3
    assert client.get("/api/leads", headers=admin_headers).json()["total"] == 3
    assert client.get("/api/ebooks", headers=admin_headers).json()["total"] == 2
    assert client.get("/api/banners", headers=admin_headers).json()["total"] == 3
    assert client.get("/api/coupons", headers=admin_headers).json()["total"] == 2
    assert client.get("/api/otp-usage", headers=admin_headers).json()["total"] == 3
    assert client.get("/api/course-logs", headers=admin_headers).json()["total"] >= 3
    assert client.get("/api/users", headers=admin_headers).json()["total"] >= 2
    assert client.get("/api/users", headers=second_headers).json()["total"] == 1


def test_test_series_and_questions(client, admin_headers, second_headers):
    r = client.post("/api/test-series", json={"title": "P2 Maths Series", "category": "Maths", "price": 299, "validity_days": 90}, headers=admin_headers)
    assert r.status_code == 201, r.text
    sid = r.json()["id"]
    # Cross-tenant: invisible to Second Academy
    assert client.get(f"/api/test-series/{sid}", headers=second_headers).status_code == 404
    assert client.get(f"/api/test-series/{sid}/questions", headers=second_headers).status_code == 404
    # Question create + list
    r = client.post(f"/api/test-series/{sid}/questions", json={
        "question_text": "What is 2+2?", "option_a": "3", "option_b": "4",
        "option_c": "5", "option_d": "6", "correct_option": "B", "marks": 1, "negative_marks": 0.25,
    }, headers=admin_headers)
    assert r.status_code == 201, r.text
    qid = r.json()["id"]
    assert r.json()["test_series_id"] == sid
    r = client.get(f"/api/test-series/{sid}/questions", headers=admin_headers)
    assert r.json()["total"] == 1
    # Update + delete series
    assert client.put(f"/api/test-series/{sid}", json={"price": 199}, headers=admin_headers).json()["price"] == 199
    assert client.delete(f"/api/test-series/{sid}/questions/{qid}", headers=admin_headers).status_code == 204
    assert client.delete(f"/api/test-series/{sid}", headers=admin_headers).status_code == 204
    assert client.get(f"/api/test-series/{sid}", headers=admin_headers).status_code == 404
    # Seeded series has 3 questions
    seeded = client.get("/api/test-series?search=Hindi Class 12 Test Series", headers=admin_headers).json()["items"][0]
    assert client.get(f"/api/test-series/{seeded['id']}/questions", headers=admin_headers).json()["total"] == 3


def test_video_assignment_and_submission(client, admin_headers):
    course = client.get("/api/courses?search=Hindi Class 12", headers=admin_headers).json()["items"][0]
    student = client.get("/api/students?search=Aarav", headers=admin_headers).json()["items"][0]
    r = client.post("/api/video-assignments", json={"title": "P2 Video Task", "course_id": course["id"], "video_url": "https://example.com/v"}, headers=admin_headers)
    assert r.status_code == 201, r.text
    aid = r.json()["id"]
    r = client.post("/api/video-assignments/submissions", json={"assignment_id": aid, "student_id": student["id"], "text": "done"}, headers=admin_headers)
    assert r.status_code == 201, r.text
    sub_id = r.json()["id"]
    r = client.get(f"/api/video-assignments/submissions?assignment_id={aid}", headers=admin_headers)
    assert r.json()["total"] == 1
    r = client.put(f"/api/video-assignments/submissions/{sub_id}", json={"marks": 9, "feedback": "Nice", "status": "GRADED"}, headers=admin_headers)
    assert r.status_code == 200 and r.json()["marks"] == 9
    assert client.delete(f"/api/video-assignments/{aid}", headers=admin_headers).status_code == 204


def test_test_assignments_and_scores(client, admin_headers):
    series = client.get("/api/test-series?search=Hindi Class 12 Test Series", headers=admin_headers).json()["items"][0]
    student = client.get("/api/students?search=Aarav", headers=admin_headers).json()["items"][0]
    r = client.post("/api/test-assignments", json={"title": "P2 Weekly Test", "test_series_id": series["id"]}, headers=admin_headers)
    assert r.status_code == 201, r.text
    ta_id = r.json()["id"]
    r = client.post("/api/test-assignments/student-assignments", json={"test_assignment_id": ta_id, "student_id": student["id"], "score": 15, "total_marks": 20, "status": "COMPLETED"}, headers=admin_headers)
    assert r.status_code == 201, r.text
    sta_id = r.json()["id"]
    assert client.get(f"/api/test-assignments/student-assignments?test_assignment_id={ta_id}", headers=admin_headers).json()["total"] >= 1
    assert client.put(f"/api/test-assignments/student-assignments/{sta_id}", json={"score": 16}, headers=admin_headers).json()["score"] == 16
    # Scores + score sheet (seeded: 2 rows for Hindi Chapter 1 Test)
    r = client.post("/api/scores", json={"student_id": student["id"], "test_series_id": series["id"], "chapter_test": "P2 Chapter", "score": 8, "total_marks": 10}, headers=admin_headers)
    assert r.status_code == 201, r.text
    r = client.get(f"/api/scores?test_series_id={series['id']}&chapter_test=Chapter 1 Test", headers=admin_headers)
    assert r.json()["total"] == 2
    r = client.get(f"/api/score-sheet?test_series_id={series['id']}&chapter_test=Chapter 1 Test", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()["students"]) == 2
    assert r.json()["students"][0]["student_name"] == "Aarav Sharma"
    assert client.delete(f"/api/test-assignments/{ta_id}", headers=admin_headers).status_code == 204


def test_notes_previous_papers(client, admin_headers):
    r = client.post("/api/notes", json={"title": "P2 Note", "folder": "Maths", "kind": "note", "description": "x"}, headers=admin_headers)
    assert r.status_code == 201, r.text
    nid = r.json()["id"]
    assert client.get("/api/notes?kind=note", headers=admin_headers).json()["total"] >= 1
    assert client.get("/api/notes?kind=folder", headers=admin_headers).json()["total"] == 1
    assert client.put(f"/api/notes/{nid}", json={"title": "P2 Note Updated"}, headers=admin_headers).json()["title"] == "P2 Note Updated"
    assert client.delete(f"/api/notes/{nid}", headers=admin_headers).status_code == 204
    # Invalid kind rejected
    assert client.post("/api/notes", json={"title": "Bad", "kind": "nope"}, headers=admin_headers).status_code == 422
    # Exam types + previous papers
    r = client.post("/api/exam-types", json={"name": "P2 Board"}, headers=admin_headers)
    assert r.status_code == 201
    et_id = r.json()["id"]
    r = client.post("/api/previous-papers", json={"title": "P2 Paper 2024", "exam_type_id": et_id, "year": 2024}, headers=admin_headers)
    assert r.status_code == 201, r.text
    pp_id = r.json()["id"]
    assert client.get("/api/previous-papers", headers=admin_headers).json()["total"] >= 3
    assert client.delete(f"/api/previous-papers/{pp_id}", headers=admin_headers).status_code == 204
    assert client.delete(f"/api/exam-types/{et_id}", headers=admin_headers).status_code == 204


def test_ebooks_and_authors(client, admin_headers):
    r = client.post("/api/ebook-types", json={"name": "P2 Type"}, headers=admin_headers)
    assert r.status_code == 201
    type_id = r.json()["id"]
    r = client.post("/api/authors", json={"name": "P2 Author", "bio": "bio"}, headers=admin_headers)
    assert r.status_code == 201
    author_id = r.json()["id"]
    r = client.post("/api/ebooks", json={"title": "P2 Ebook", "author_id": author_id, "ebook_type_id": type_id, "price": 99}, headers=admin_headers)
    assert r.status_code == 201, r.text
    eb_id = r.json()["id"]
    assert client.get("/api/ebooks?search=P2 Ebook", headers=admin_headers).json()["total"] == 1
    r = client.post("/api/ebook-banners", json={"title": "P2 Banner", "image_url": "", "weight": 1}, headers=admin_headers)
    assert r.status_code == 201
    assert client.delete(f"/api/ebook-banners/{r.json()['id']}", headers=admin_headers).status_code == 204
    assert client.delete(f"/api/ebooks/{eb_id}", headers=admin_headers).status_code == 204
    assert client.delete(f"/api/authors/{author_id}", headers=admin_headers).status_code == 204
    assert client.delete(f"/api/ebook-types/{type_id}", headers=admin_headers).status_code == 204


def test_seminars_bundles_youtube_jobs(client, admin_headers):
    r = client.post("/api/seminars", json={"title": "P2 Seminar", "category": "General"}, headers=admin_headers)
    assert r.status_code == 201, r.text
    sem_id = r.json()["id"]
    assert client.get("/api/seminars?search=P2 Seminar", headers=admin_headers).json()["total"] == 1
    assert client.delete(f"/api/seminars/{sem_id}", headers=admin_headers).status_code == 204

    r = client.post("/api/bundles", json={"name": "P2 Bundle", "price": 999, "course_ids": [1], "test_series_ids": [], "ebook_ids": []}, headers=admin_headers)
    assert r.status_code == 201, r.text
    b_id = r.json()["id"]
    assert client.put(f"/api/bundles/{b_id}", json={"price": 899}, headers=admin_headers).json()["price"] == 899
    assert client.delete(f"/api/bundles/{b_id}", headers=admin_headers).status_code == 204

    r = client.post("/api/youtube-playlists", json={"video_id": "p2vid1", "title": "P2 Video", "category": "Maths"}, headers=admin_headers)
    assert r.status_code == 201, r.text
    y_id = r.json()["id"]
    assert client.get("/api/youtube-playlists", headers=admin_headers).json()["total"] >= 3
    assert client.delete(f"/api/youtube-playlists/{y_id}", headers=admin_headers).status_code == 204

    r = client.post("/api/jobs", json={"title": "P2 Job", "description": "d"}, headers=admin_headers)
    assert r.status_code == 201, r.text
    j_id = r.json()["id"]
    assert client.delete(f"/api/jobs/{j_id}", headers=admin_headers).status_code == 204


def test_leads_testimonials_toppers(client, admin_headers):
    r = client.post("/api/leads", json={"name": "P2 Lead", "phone": "9876500999", "type": "custom"}, headers=admin_headers)
    assert r.status_code == 201, r.text
    lead_id = r.json()["id"]
    assert client.get("/api/leads?type=signup", headers=admin_headers).json()["total"] == 1
    assert client.get("/api/leads?type=expired", headers=admin_headers).json()["total"] == 1
    assert client.put(f"/api/leads/{lead_id}", json={"status": "CONTACTED"}, headers=admin_headers).json()["status"] == "CONTACTED"
    assert client.delete(f"/api/leads/{lead_id}", headers=admin_headers).status_code == 204

    r = client.post("/api/testimonials", json={"student_name": "P2 Student", "text": "Great!", "rating": 5}, headers=admin_headers)
    assert r.status_code == 201
    assert client.delete(f"/api/testimonials/{r.json()['id']}", headers=admin_headers).status_code == 204

    student = client.get("/api/students?search=Aarav", headers=admin_headers).json()["items"][0]
    r = client.post("/api/toppers", json={"student_id": student["id"], "student_name": "Aarav Sharma", "exam": "P2 Exam", "rank": 1, "score": 99}, headers=admin_headers)
    assert r.status_code == 201, r.text
    top_id = r.json()["id"]
    r = client.get("/api/toppers/call-list", headers=admin_headers)
    assert r.status_code == 200
    entry = next(x for x in r.json() if x["id"] == top_id)
    assert entry["phone"] == "9876500001"
    assert client.delete(f"/api/toppers/{top_id}", headers=admin_headers).status_code == 204


def test_banners_notifications_current_affairs(client, admin_headers):
    r = client.post("/api/banners", json={"name": "P2 Banner", "banner_type": "HOME", "placement": "TOP"}, headers=admin_headers)
    assert r.status_code == 201, r.text
    ban_id = r.json()["id"]
    assert client.get("/api/banners?search=P2 Banner", headers=admin_headers).json()["total"] == 1
    assert client.delete(f"/api/banners/{ban_id}", headers=admin_headers).status_code == 204

    r = client.post("/api/notifications", json={"title": "P2 Push", "body": "Hello", "audience": "ALL"}, headers=admin_headers)
    assert r.status_code == 201, r.text
    assert r.json()["status"] == "SENT"
    assert client.get("/api/notifications", headers=admin_headers).json()["total"] >= 3

    r = client.post("/api/current-affairs", json={"title": "P2 Affair", "language": "en", "content": "c", "published_date": "2026-11-20"}, headers=admin_headers)
    assert r.status_code == 201, r.text
    ca_id = r.json()["id"]
    assert client.get("/api/current-affairs?language=en", headers=admin_headers).json()["total"] >= 2
    assert client.get("/api/current-affairs?from=2026-11-20&to=2026-11-20", headers=admin_headers).json()["total"] >= 1
    assert client.delete(f"/api/current-affairs/{ca_id}", headers=admin_headers).status_code == 204


def test_coupons_enquiries_users_logs(client, admin_headers):
    r = client.post("/api/coupons", json={"code": "P2TEST50", "discount_percent": 50, "max_discount": 100}, headers=admin_headers)
    assert r.status_code == 201, r.text
    cp_id = r.json()["id"]
    assert client.get("/api/coupons?search=P2TEST50", headers=admin_headers).json()["total"] == 1
    assert client.get("/api/coupons/applied", headers=admin_headers).json()["total"] == 1
    assert client.delete(f"/api/coupons/{cp_id}", headers=admin_headers).status_code == 204

    r = client.post("/api/enquiry-types", json={"name": "P2 Type"}, headers=admin_headers)
    assert r.status_code == 201
    et_id = r.json()["id"]
    r = client.post("/api/enquiries", json={"name": "P2 Enquirer", "email": "e@example.com", "message": "Hi", "enquiry_type_id": et_id}, headers=admin_headers)
    assert r.status_code == 201, r.text
    enq_id = r.json()["id"]
    assert client.get("/api/enquiries", headers=admin_headers).json()["total"] >= 3
    assert client.delete(f"/api/enquiries/{enq_id}", headers=admin_headers).status_code == 204
    assert client.delete(f"/api/enquiry-types/{et_id}", headers=admin_headers).status_code == 204

    # Users: create + duplicate rejected
    r = client.post("/api/users", json={"username": "p2user", "email": "p2user@example.com", "password": "Pass@123", "role": "Teacher"}, headers=admin_headers)
    assert r.status_code == 201, r.text
    assert r.json()["username"] == "p2user"
    assert "password" not in r.text
    assert client.post("/api/users", json={"username": "p2user", "email": "other@example.com", "password": "Pass@123"}, headers=admin_headers).status_code == 400
    # New user can log in
    r2 = client.post("/api/auth/login", json={"username": "p2user", "password": "Pass@123"})
    assert r2.status_code == 200

    # Course logs: creating a course writes a log
    before = client.get("/api/course-logs", headers=admin_headers).json()["total"]
    r = client.post("/api/courses", json={"title": "P2 Log Course", "price": 100}, headers=admin_headers)
    assert r.status_code == 201
    cid = r.json()["id"]
    after = client.get("/api/course-logs", headers=admin_headers).json()["total"]
    assert after == before + 1
    # SQLite reuses a deleted course's id, so earlier CRUD-test logs for that
    # id may also match; check the newest log instead of an exact count.
    logs = client.get(f"/api/course-logs?course_id={cid}", headers=admin_headers).json()
    assert logs["total"] >= 1
    assert logs["items"][0]["course_title"] == "P2 Log Course"
    assert logs["items"][0]["action"] == "COURSE_CREATED"
    assert client.delete(f"/api/courses/{cid}", headers=admin_headers).status_code == 204


def test_integrations_and_otp(client, admin_headers):
    r = client.get("/api/integrations", headers=admin_headers)
    assert r.status_code == 200
    providers = {x["provider"]: x for x in r.json()}
    assert providers["whatsapp"]["name"] == "WhatsApp API"
    assert providers["whatsapp"]["status"] == "INACTIVE"
    assert providers["whatsapp"]["badge"] == "BETA"
    assert providers["whatsapp"]["category"] == "NOTIFICATIONS"
    assert providers["teachnest-ai"]["category"] == "INTELLIGENCE"
    r = client.post("/api/integrations/whatsapp/setup", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "INACTIVE"
    assert "no real keys" in r.json()["message"]
    assert client.post("/api/integrations/nope/setup", headers=admin_headers).status_code == 404
    # OTP usage is read-only list
    r = client.get("/api/otp-usage?mobile=9876500001", headers=admin_headers)
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["otp"] == "123456"


def test_orders_extensions(client, admin_headers):
    orders = client.get("/api/orders", headers=admin_headers).json()
    oid = orders["items"][0]["id"]
    total = orders["total"]
    r = client.get("/api/orders/company", headers=admin_headers)
    assert r.status_code == 200 and r.json()["total"] == total
    r = client.get("/api/orders/deactivated", headers=admin_headers)
    assert r.status_code == 200
    # Transfer to another student
    student2 = client.get("/api/students?search=Priya", headers=admin_headers).json()["items"][0]
    r = client.post(f"/api/orders/{oid}/transfer", json={"to_student_id": student2["id"]}, headers=admin_headers)
    assert r.status_code == 200, r.text
    assert r.json()["student_name"] == "Priya Verma"
    # Refund then deactivate (deactivate is the final state checked)
    r = client.post(f"/api/orders/{oid}/refund", json={"reason": "test refund"}, headers=admin_headers)
    assert r.status_code == 200 and r.json()["status"] == "REFUNDED"
    r = client.post(f"/api/orders/{oid}/deactivate", headers=admin_headers)
    assert r.status_code == 200 and r.json()["status"] == "DEACTIVATED"
    assert client.get("/api/orders/deactivated", headers=admin_headers).json()["total"] >= 1


def test_uploads(client, admin_headers):
    # Valid image upload
    r = client.post("/api/uploads", files={"file": ("test.png", b"\x89PNG\r\n\x1a\nfake", "image/png")}, headers=admin_headers)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["url"].startswith("/uploads/")
    assert body["filename"].endswith(".png")
    assert body["size_bytes"] > 0
    assert body["content_type"] == "image/png"
    # Served back via StaticFiles
    r2 = client.get(body["url"])
    assert r2.status_code == 200
    # Invalid type rejected
    r = client.post("/api/uploads", files={"file": ("evil.exe", b"MZ", "application/octet-stream")}, headers=admin_headers)
    assert r.status_code == 400
    # Course thumbnail can point at the upload URL (CourseForm wiring)
    r = client.put("/api/courses/1", json={"thumbnail_url": body["url"]}, headers=admin_headers)
    assert r.status_code == 200 and r.json()["thumbnail_url"] == body["url"]
    client.put("/api/courses/1", json={"thumbnail_url": ""}, headers=admin_headers)
