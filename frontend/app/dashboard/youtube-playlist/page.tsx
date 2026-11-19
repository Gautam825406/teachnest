"use client";
import CrudPage from "@/components/CrudPage";

export default function Page() {
  return (
    <CrudPage
      title="YouTube Playlist"
      subtitle="Curate YouTube videos for your students."
      endpoint="/youtube-playlists"
      itemLabel="Video"
      searchPlaceholder="Search videos..."
      fields={[
        { key: "video_id", label: "YouTube Video ID", required: true, placeholder: "e.g. dQw4w9WgXcQ" },
        { key: "title", label: "Title", placeholder: "Video title" },
        { key: "category", label: "Category", placeholder: "e.g. Mathematics" },
      ]}
      columns={[
        { key: "title", label: "TITLE" },
        { key: "video_id", label: "VIDEO ID" },
        { key: "category", label: "CATEGORY" },
      ]}
    />
  );
}
