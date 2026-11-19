"use client";
import CourseForm, { emptyCourseValues } from "@/components/CourseForm";
import { PageHeader } from "@/components/ui";

export default function NewCoursePage() {
  return (
    <div>
      <PageHeader title="Manage Course" subtitle="Kindly verify all details before submitting." />
      <CourseForm initial={emptyCourseValues} />
    </div>
  );
}
