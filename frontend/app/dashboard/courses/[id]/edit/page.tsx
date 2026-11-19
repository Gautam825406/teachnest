"use client";
import { useEffect, useState } from "react";
import { apiFetch, type Course } from "@/lib/api";
import CourseForm, { courseToValues } from "@/components/CourseForm";
import { ErrorBox, Loading, PageHeader } from "@/components/ui";

export default function EditCoursePage({ params }: { params: { id: string } }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Course>(`/courses/${params.id}`)
      .then(setCourse)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the course."))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <Loading />;
  if (error || !course) return <ErrorBox message={error || "Course not found."} />;
  return (
    <div>
      <PageHeader title="Manage Course" subtitle="Kindly verify all details before submitting." />
      <CourseForm initial={courseToValues(course)} courseId={params.id} />
    </div>
  );
}
