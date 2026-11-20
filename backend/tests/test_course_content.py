"""Phase 5 tests: course subjects, topics, videos, packages, course copy,
and the student course-content endpoint."""

DEMO_ORG = "DEMO0001"
SECOND_ORG = "SECN0002"


def _make_course(client, admin_headers, title="Phase5 Course"):
    r = client.post("/api/courses", json={"title": title, "price": 499, "mrp": 999}, headers=admin_headers)
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _cleanup_course(client, admin_headers, course_id, subject_ids=(), topic_ids=(), video_ids=(), package_ids=()):
    for vid in video_ids:
        client.delete(f"/api/course-videos/{vid}", headers=admin_headers)
    for tid in topic_ids:
        client.delete(f"/api/topics/{tid}", headers=admin_headers)
    for sid in subject_ids:
        client.delete(f"/api/subjects/{sid}", headers=admin_headers)
    for pid in package_ids:
        client.delete(f"/api/course-packages/{pid}", headers=admin_headers)
    client.delete(f"/api/courses/{course_id}", headers=admin_headers)


def _student_headers(client, org_code, phone, name="Phase5 Student"):
    r = client.post("/api/student/auth/verify", json={"org_code": org_code, "phone": phone, "otp": "123456", "name": name})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _second_course_id(client, second_headers):
    r = client.get("/api/courses", headers=second_headers)
    assert r.status_code == 200
    assert r.json()["total"] == 1
    return r.json()["items"][0]["id"]


# ---------- Subjects ----------
def test_subject_crud(client, admin_headers, second_headers):
    course_id = _make_course(client, admin_headers, "Phase5 Subjects Course")
    try:
        # Create (ordered by order)
        r = client.post(f"/api/courses/{course_id}/subjects", json={"name": "Algebra", "description": "Ch 1", "order": 2}, headers=admin_headers)
        assert r.status_code == 201, r.text
        s1 = r.json()
        assert s1["course_id"] == course_id and s1["order"] == 2
        r = client.post(f"/api/courses/{course_id}/subjects", json={"name": "Geometry", "order": 1}, headers=admin_headers)
        assert r.status_code == 201, r.text
        s2 = r.json()
        # List ordered by order, id
        r = client.get(f"/api/courses/{course_id}/subjects", headers=admin_headers)
        assert r.status_code == 200
        assert [s["name"] for s in r.json()] == ["Geometry", "Algebra"]
        # Get / update (course_id not changeable)
        r = client.get(f"/api/subjects/{s1['id']}", headers=admin_headers)
        assert r.status_code == 200 and r.json()["name"] == "Algebra"
        r = client.put(f"/api/subjects/{s1['id']}", json={"name": "Algebra II", "order": 3}, headers=admin_headers)
        assert r.status_code == 200, r.text
        assert r.json()["name"] == "Algebra II" and r.json()["course_id"] == course_id
        # Unknown course / subject 404
        assert client.post("/api/courses/999999/subjects", json={"name": "X"}, headers=admin_headers).status_code == 404
        assert client.get("/api/subjects/999999", headers=admin_headers).status_code == 404
        assert client.put("/api/subjects/999999", json={"name": "X"}, headers=admin_headers).status_code == 404
        assert client.delete("/api/subjects/999999", headers=admin_headers).status_code == 404
        # Cross-tenant: second tenant's course is invisible to demo admin
        other_course = _second_course_id(client, second_headers)
        assert client.post(f"/api/courses/{other_course}/subjects", json={"name": "X"}, headers=admin_headers).status_code == 404
        assert client.get(f"/api/courses/{other_course}/subjects", headers=admin_headers).status_code == 404
        # Cross-tenant subject: subject created by second tenant is invisible
        r = client.post(f"/api/courses/{other_course}/subjects", json={"name": "Second Subj"}, headers=second_headers)
        assert r.status_code == 201, r.text
        other_subject = r.json()["id"]
        try:
            assert client.get(f"/api/subjects/{other_subject}", headers=admin_headers).status_code == 404
            assert client.put(f"/api/subjects/{other_subject}", json={"name": "Hijack"}, headers=admin_headers).status_code == 404
            assert client.delete(f"/api/subjects/{other_subject}", headers=admin_headers).status_code == 404
        finally:
            assert client.delete(f"/api/subjects/{other_subject}", headers=second_headers).status_code == 204
        # Delete
        assert client.delete(f"/api/subjects/{s2['id']}", headers=admin_headers).status_code == 204
        assert client.get(f"/api/subjects/{s2['id']}", headers=admin_headers).status_code == 404
        assert client.delete(f"/api/subjects/{s1['id']}", headers=admin_headers).status_code == 204
    finally:
        client.delete(f"/api/courses/{course_id}", headers=admin_headers)


# ---------- Topics ----------
def test_topic_crud(client, admin_headers, second_headers):
    course_id = _make_course(client, admin_headers, "Phase5 Topics Course")
    r = client.post(f"/api/courses/{course_id}/subjects", json={"name": "Physics"}, headers=admin_headers)
    subject_id = r.json()["id"]
    try:
        r = client.post(f"/api/subjects/{subject_id}/topics", json={"name": "Motion", "description": "Kinematics", "order": 2}, headers=admin_headers)
        assert r.status_code == 201, r.text
        t1 = r.json()
        assert t1["subject_id"] == subject_id
        r = client.post(f"/api/subjects/{subject_id}/topics", json={"name": "Force", "order": 1}, headers=admin_headers)
        t2 = r.json()
        r = client.get(f"/api/subjects/{subject_id}/topics", headers=admin_headers)
        assert [t["name"] for t in r.json()] == ["Force", "Motion"]
        r = client.put(f"/api/topics/{t1['id']}", json={"name": "Motion II"}, headers=admin_headers)
        assert r.status_code == 200 and r.json()["name"] == "Motion II"
        assert client.post("/api/subjects/999999/topics", json={"name": "X"}, headers=admin_headers).status_code == 404
        assert client.get("/api/topics/999999", headers=admin_headers).status_code == 404
        # Cross-tenant topic
        other_course = _second_course_id(client, second_headers)
        r = client.post(f"/api/courses/{other_course}/subjects", json={"name": "Second Subj"}, headers=second_headers)
        other_subject = r.json()["id"]
        r = client.post(f"/api/subjects/{other_subject}/topics", json={"name": "Second Topic"}, headers=second_headers)
        other_topic = r.json()["id"]
        try:
            assert client.get(f"/api/topics/{other_topic}", headers=admin_headers).status_code == 404
            assert client.get(f"/api/subjects/{other_subject}/topics", headers=admin_headers).status_code == 404
            assert client.put(f"/api/topics/{other_topic}", json={"name": "Hijack"}, headers=admin_headers).status_code == 404
            assert client.delete(f"/api/topics/{other_topic}", headers=admin_headers).status_code == 404
        finally:
            client.delete(f"/api/topics/{other_topic}", headers=second_headers)
            client.delete(f"/api/subjects/{other_subject}", headers=second_headers)
        assert client.delete(f"/api/topics/{t2['id']}", headers=admin_headers).status_code == 204
        assert client.delete(f"/api/topics/{t1['id']}", headers=admin_headers).status_code == 204
    finally:
        client.delete(f"/api/subjects/{subject_id}", headers=admin_headers)
        client.delete(f"/api/courses/{course_id}", headers=admin_headers)


# ---------- Videos ----------
def test_video_crud_and_filters(client, admin_headers, second_headers):
    course_id = _make_course(client, admin_headers, "Phase5 Videos Course")
    r = client.post(f"/api/courses/{course_id}/subjects", json={"name": "Chemistry"}, headers=admin_headers)
    subject_id = r.json()["id"]
    r = client.post(f"/api/subjects/{subject_id}/topics", json={"name": "Atoms"}, headers=admin_headers)
    topic_id = r.json()["id"]
    r = client.post(f"/api/subjects/{subject_id}/topics", json={"name": "Molecules"}, headers=admin_headers)
    topic2_id = r.json()["id"]
    try:
        # Course-level video (no subject/topic)
        r = client.post(f"/api/courses/{course_id}/videos", json={"title": "Intro", "video_url": "https://example.com/intro.mp4", "duration_seconds": 120, "is_free_preview": True}, headers=admin_headers)
        assert r.status_code == 201, r.text
        v_intro = r.json()
        assert v_intro["subject_id"] is None and v_intro["topic_id"] is None
        # Topic video
        r = client.post(f"/api/courses/{course_id}/videos", json={"title": "Atoms 101", "subject_id": subject_id, "topic_id": topic_id, "duration_seconds": 600, "order": 1}, headers=admin_headers)
        assert r.status_code == 201, r.text
        v_atoms = r.json()
        r = client.post(f"/api/courses/{course_id}/videos", json={"title": "Molecules 101", "subject_id": subject_id, "topic_id": topic2_id, "order": 2}, headers=admin_headers)
        v_mol = r.json()
        # List + filters
        r = client.get(f"/api/courses/{course_id}/videos", headers=admin_headers)
        assert r.status_code == 200 and len(r.json()) == 3
        r = client.get(f"/api/courses/{course_id}/videos?subject_id={subject_id}", headers=admin_headers)
        assert {v["title"] for v in r.json()} == {"Atoms 101", "Molecules 101"}
        r = client.get(f"/api/courses/{course_id}/videos?topic_id={topic_id}", headers=admin_headers)
        assert [v["title"] for v in r.json()] == ["Atoms 101"]
        r = client.get(f"/api/courses/{course_id}/videos?topic_id={topic2_id}", headers=admin_headers)
        assert [v["title"] for v in r.json()] == ["Molecules 101"]
        # Update + get
        r = client.put(f"/api/course-videos/{v_atoms['id']}", json={"title": "Atoms 102", "duration_seconds": 700}, headers=admin_headers)
        assert r.status_code == 200 and r.json()["title"] == "Atoms 102" and r.json()["duration_seconds"] == 700
        # Invalid subject 404 (unknown id, and cross-tenant subject)
        assert client.post(f"/api/courses/{course_id}/videos", json={"title": "Bad", "subject_id": 999999}, headers=admin_headers).status_code == 404
        assert client.post(f"/api/courses/{course_id}/videos", json={"title": "Bad", "topic_id": 999999}, headers=admin_headers).status_code == 404
        other_course = _second_course_id(client, second_headers)
        r = client.post(f"/api/courses/{other_course}/subjects", json={"name": "Second Subj"}, headers=second_headers)
        other_subject = r.json()["id"]
        try:
            assert client.post(f"/api/courses/{course_id}/videos", json={"title": "Bad", "subject_id": other_subject}, headers=admin_headers).status_code == 404
            # Topic belonging to a different subject than the given one: 404
            assert client.post(f"/api/courses/{course_id}/videos", json={"title": "Bad", "subject_id": subject_id, "topic_id": topic2_id + 100000}, headers=admin_headers).status_code == 404
        finally:
            client.delete(f"/api/subjects/{other_subject}", headers=second_headers)
        # Topic/subject mismatch: topic2 belongs to subject, but pair it with a
        # topic from another subject — build a second subject + topic.
        r = client.post(f"/api/courses/{course_id}/subjects", json={"name": "Biology"}, headers=admin_headers)
        subject2_id = r.json()["id"]
        r = client.post(f"/api/subjects/{subject2_id}/topics", json={"name": "Cells"}, headers=admin_headers)
        other_topic_id = r.json()["id"]
        assert client.post(f"/api/courses/{course_id}/videos", json={"title": "Mismatch", "subject_id": subject_id, "topic_id": other_topic_id}, headers=admin_headers).status_code == 404
        # Cross-tenant video access 404
        assert client.get(f"/api/course-videos/{v_atoms['id']}", headers=second_headers).status_code == 404
        assert client.put(f"/api/course-videos/{v_atoms['id']}", json={"title": "Hijack"}, headers=second_headers).status_code == 404
        # Delete
        assert client.delete(f"/api/course-videos/{v_mol['id']}", headers=admin_headers).status_code == 204
        assert client.get(f"/api/course-videos/{v_mol['id']}", headers=admin_headers).status_code == 404
        assert client.delete(f"/api/course-videos/{v_intro['id']}", headers=admin_headers).status_code == 204
        assert client.delete(f"/api/course-videos/{v_atoms['id']}", headers=admin_headers).status_code == 204
        client.delete(f"/api/topics/{other_topic_id}", headers=admin_headers)
        client.delete(f"/api/subjects/{subject2_id}", headers=admin_headers)
    finally:
        _cleanup_course(client, admin_headers, course_id, subject_ids=(subject_id,), topic_ids=(topic_id, topic2_id))


# ---------- Packages ----------
def test_package_crud(client, admin_headers, second_headers):
    c1 = _make_course(client, admin_headers, "Phase5 Pkg Course 1")
    c2 = _make_course(client, admin_headers, "Phase5 Pkg Course 2")
    package_id = None
    try:
        # Invalid course id rejected (unknown + cross-tenant)
        assert client.post("/api/course-packages", json={"name": "Bad", "course_ids": [999999]}, headers=admin_headers).status_code == 404
        other_course = _second_course_id(client, second_headers)
        assert client.post("/api/course-packages", json={"name": "Bad", "course_ids": [other_course]}, headers=admin_headers).status_code == 404
        # Create
        r = client.post("/api/course-packages", json={"name": "Combo Pack", "description": "Two courses", "course_ids": [c1, c2], "price": 899, "mrp": 1998}, headers=admin_headers)
        assert r.status_code == 201, r.text
        pkg = r.json()
        package_id = pkg["id"]
        assert pkg["course_ids"] == [c1, c2] and pkg["is_active"] is True
        # List / get
        r = client.get("/api/course-packages", headers=admin_headers)
        assert any(p["id"] == package_id for p in r.json())
        r = client.get(f"/api/course-packages/{package_id}", headers=admin_headers)
        assert r.status_code == 200 and r.json()["price"] == 899
        # Deactivate then re-activate
        r = client.put(f"/api/course-packages/{package_id}", json={"is_active": False}, headers=admin_headers)
        assert r.status_code == 200 and r.json()["is_active"] is False
        r = client.put(f"/api/course-packages/{package_id}", json={"is_active": True, "price": 799, "course_ids": [c1]}, headers=admin_headers)
        assert r.status_code == 200 and r.json()["is_active"] is True
        assert r.json()["price"] == 799 and r.json()["course_ids"] == [c1]
        # Update with an invalid course id rejected
        assert client.put(f"/api/course-packages/{package_id}", json={"course_ids": [c1, 999999]}, headers=admin_headers).status_code == 404
        # Cross-tenant 404
        assert client.get(f"/api/course-packages/{package_id}", headers=second_headers).status_code == 404
        assert client.put(f"/api/course-packages/{package_id}", json={"price": 1}, headers=second_headers).status_code == 404
        assert client.delete(f"/api/course-packages/{package_id}", headers=second_headers).status_code == 404
        assert client.get("/api/course-packages/999999", headers=admin_headers).status_code == 404
        # Delete
        assert client.delete(f"/api/course-packages/{package_id}", headers=admin_headers).status_code == 204
        package_id = None
        assert client.get("/api/course-packages", headers=admin_headers).status_code == 200
    finally:
        if package_id is not None:
            client.delete(f"/api/course-packages/{package_id}", headers=admin_headers)
        client.delete(f"/api/courses/{c1}", headers=admin_headers)
        client.delete(f"/api/courses/{c2}", headers=admin_headers)


# ---------- Copy ----------
def test_course_copy_deep_copy(client, admin_headers, second_headers):
    source_id = _make_course(client, admin_headers, "Phase5 Source Course")
    # Build content on the source course
    r = client.post(f"/api/courses/{source_id}/subjects", json={"name": "Maths", "description": "Numbers", "order": 1}, headers=admin_headers)
    s1 = r.json()["id"]
    r = client.post(f"/api/courses/{source_id}/subjects", json={"name": "English", "order": 2}, headers=admin_headers)
    s2 = r.json()["id"]
    r = client.post(f"/api/subjects/{s1}/topics", json={"name": "Fractions", "order": 1}, headers=admin_headers)
    t1 = r.json()["id"]
    r = client.post(f"/api/courses/{source_id}/videos", json={"title": "Welcome", "video_url": "https://example.com/w.mp4", "duration_seconds": 60, "is_free_preview": True}, headers=admin_headers)
    v_course = r.json()["id"]
    r = client.post(f"/api/courses/{source_id}/videos", json={"title": "Fractions Lec 1", "subject_id": s1, "topic_id": t1, "duration_seconds": 900, "order": 1}, headers=admin_headers)
    v_topic = r.json()["id"]
    copy_id = None
    try:
        # Copy with new name + price override
        r = client.post(f"/api/courses/{source_id}/copy", json={"new_name": "Phase5 Source Course Copy", "price": 299}, headers=admin_headers)
        assert r.status_code == 201, r.text
        copy = r.json()
        copy_id = copy["id"]
        assert copy_id != source_id
        assert copy["title"] == "Phase5 Source Course Copy"
        assert copy["price"] == 299
        assert copy["mrp"] == 999  # copied from source
        # Subjects deep-copied with new ids
        r = client.get(f"/api/courses/{copy_id}/subjects", headers=admin_headers)
        assert r.status_code == 200
        copied_subjects = r.json()
        assert len(copied_subjects) == 2
        assert {s["name"] for s in copied_subjects} == {"Maths", "English"}
        assert all(s["id"] not in (s1, s2) for s in copied_subjects)
        copied_s1 = next(s for s in copied_subjects if s["name"] == "Maths")
        assert copied_s1["description"] == "Numbers" and copied_s1["order"] == 1
        # Topics deep-copied under the new subject
        r = client.get(f"/api/subjects/{copied_s1['id']}/topics", headers=admin_headers)
        copied_topics = r.json()
        assert len(copied_topics) == 1
        assert copied_topics[0]["name"] == "Fractions" and copied_topics[0]["id"] != t1
        # Videos deep-copied with remapped subject/topic ids
        r = client.get(f"/api/courses/{copy_id}/videos", headers=admin_headers)
        copied_videos = r.json()
        assert len(copied_videos) == 2
        assert all(v["id"] not in (v_course, v_topic) for v in copied_videos)
        welcome = next(v for v in copied_videos if v["title"] == "Welcome")
        assert welcome["topic_id"] is None and welcome["is_free_preview"] is True
        lec = next(v for v in copied_videos if v["title"] == "Fractions Lec 1")
        assert lec["subject_id"] == copied_s1["id"]
        assert lec["topic_id"] == copied_topics[0]["id"]
        assert lec["duration_seconds"] == 900
        # Source untouched
        r = client.get(f"/api/courses/{source_id}/subjects", headers=admin_headers)
        assert len(r.json()) == 2
        r = client.get(f"/api/courses/{source_id}/videos", headers=admin_headers)
        assert len(r.json()) == 2
        assert client.get(f"/api/courses/{source_id}", headers=admin_headers).json()["price"] == 499
        # Default copy name
        r = client.post(f"/api/courses/{source_id}/copy", json={}, headers=admin_headers)
        assert r.status_code == 201, r.text
        default_copy_id = r.json()["id"]
        assert r.json()["title"] == "Phase5 Source Course (Copy)"
        assert r.json()["price"] == 499
        # Clean up the default copy's children, then the copy itself
        for s in client.get(f"/api/courses/{default_copy_id}/subjects", headers=admin_headers).json():
            for t in client.get(f"/api/subjects/{s['id']}/topics", headers=admin_headers).json():
                client.delete(f"/api/topics/{t['id']}", headers=admin_headers)
            client.delete(f"/api/subjects/{s['id']}", headers=admin_headers)
        for v in client.get(f"/api/courses/{default_copy_id}/videos", headers=admin_headers).json():
            client.delete(f"/api/course-videos/{v['id']}", headers=admin_headers)
        assert client.delete(f"/api/courses/{default_copy_id}", headers=admin_headers).status_code == 204
        # Cross-tenant copy 404 + unknown course 404
        other_course = _second_course_id(client, second_headers)
        assert client.post(f"/api/courses/{other_course}/copy", json={}, headers=admin_headers).status_code == 404
        assert client.post("/api/courses/999999/copy", json={}, headers=admin_headers).status_code == 404
    finally:
        if copy_id is not None:
            for s in client.get(f"/api/courses/{copy_id}/subjects", headers=admin_headers).json():
                for t in client.get(f"/api/subjects/{s['id']}/topics", headers=admin_headers).json():
                    client.delete(f"/api/topics/{t['id']}", headers=admin_headers)
                client.delete(f"/api/subjects/{s['id']}", headers=admin_headers)
            for v in client.get(f"/api/courses/{copy_id}/videos", headers=admin_headers).json():
                client.delete(f"/api/course-videos/{v['id']}", headers=admin_headers)
            client.delete(f"/api/courses/{copy_id}", headers=admin_headers)
        _cleanup_course(client, admin_headers, source_id, subject_ids=(s1, s2), topic_ids=(t1,), video_ids=(v_course, v_topic))


# ---------- Student content endpoint ----------
def test_student_course_content(client, admin_headers, second_headers):
    course_id = _make_course(client, admin_headers, "Phase5 Student Content Course")
    r = client.post(f"/api/courses/{course_id}/subjects", json={"name": "Science", "order": 1}, headers=admin_headers)
    subject_id = r.json()["id"]
    r = client.post(f"/api/subjects/{subject_id}/topics", json={"name": "Light", "order": 1}, headers=admin_headers)
    topic_id = r.json()["id"]
    client.post(f"/api/courses/{course_id}/videos", json={"title": "Course Intro", "duration_seconds": 30, "is_free_preview": True}, headers=admin_headers)
    client.post(f"/api/courses/{course_id}/videos", json={"title": "Light Lec 1", "subject_id": subject_id, "topic_id": topic_id, "duration_seconds": 500}, headers=admin_headers)
    try:
        headers = _student_headers(client, DEMO_ORG, "9876500931", "Phase5 Reader")
        r = client.get(f"/api/student/courses/{course_id}/content", headers=headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["course"]["id"] == course_id
        assert body["course"]["title"] == "Phase5 Student Content Course"
        assert len(body["subjects"]) == 1
        subj = body["subjects"][0]
        assert subj["name"] == "Science"
        assert set(subj.keys()) == {"id", "name", "description", "order", "topics"}
        assert len(subj["topics"]) == 1
        topic = subj["topics"][0]
        assert topic["name"] == "Light"
        assert set(topic.keys()) == {"id", "name", "description", "order", "videos"}
        assert len(topic["videos"]) == 1
        assert topic["videos"][0]["title"] == "Light Lec 1"
        assert set(topic["videos"][0].keys()) == {"id", "title", "video_url", "duration_seconds", "order", "is_free_preview"}
        # Course-level videos only (no topic)
        assert len(body["videos"]) == 1
        assert body["videos"][0]["title"] == "Course Intro"
        # 404 for unknown course; admin token rejected (student auth only)
        assert client.get("/api/student/courses/999999/content", headers=headers).status_code == 404
        assert client.get(f"/api/student/courses/{course_id}/content", headers=admin_headers).status_code == 401
        assert client.get(f"/api/student/courses/{course_id}/content").status_code == 401
        # Cross-tenant: second tenant's student cannot see demo course content
        r = client.post("/api/student/auth/verify", json={"org_code": SECOND_ORG, "phone": "9123456780", "otp": "123456"})
        assert r.status_code == 200, r.text
        other_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
        assert client.get(f"/api/student/courses/{course_id}/content", headers=other_headers).status_code == 404
    finally:
        _cleanup_course(client, admin_headers, course_id, subject_ids=(subject_id,), topic_ids=(topic_id,))


# ---------- Cascade deletes ----------
def test_subject_and_topic_cascade_delete(client, admin_headers):
    course_id = _make_course(client, admin_headers, "Phase5 Cascade Course")
    r = client.post(f"/api/courses/{course_id}/subjects", json={"name": "S1", "order": 1}, headers=admin_headers)
    subject_id = r.json()["id"]
    r = client.post(f"/api/subjects/{subject_id}/topics", json={"name": "T1", "order": 1}, headers=admin_headers)
    topic_id = r.json()["id"]
    r = client.post(f"/api/courses/{course_id}/videos", json={"title": "V-topic", "subject_id": subject_id, "topic_id": topic_id}, headers=admin_headers)
    topic_video_id = r.json()["id"]
    r = client.post(f"/api/courses/{course_id}/videos", json={"title": "V-subject", "subject_id": subject_id}, headers=admin_headers)
    subject_video_id = r.json()["id"]
    try:
        # Deleting the topic removes its videos only
        assert client.delete(f"/api/topics/{topic_id}", headers=admin_headers).status_code == 204
        assert client.get(f"/api/course-videos/{topic_video_id}", headers=admin_headers).status_code == 404
        assert client.get(f"/api/course-videos/{subject_video_id}", headers=admin_headers).status_code == 200
        # Deleting the subject removes its remaining topics and videos
        assert client.delete(f"/api/subjects/{subject_id}", headers=admin_headers).status_code == 204
        assert client.get(f"/api/course-videos/{subject_video_id}", headers=admin_headers).status_code == 404
        assert client.get(f"/api/courses/{course_id}/subjects", headers=admin_headers).json() == []
    finally:
        client.delete(f"/api/courses/{course_id}", headers=admin_headers)
