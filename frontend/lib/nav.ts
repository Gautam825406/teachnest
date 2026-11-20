export interface NavItem { label: string; href: string; children?: NavItem[] }
export interface NavGroup { group: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  { group: "DASHBOARD", items: [{ label: "Dashboard", href: "/dashboard" }] },
  {
    group: "ACADEMICS & CONTENT",
    items: [
      {
        label: "Courses", href: "/dashboard/courses",
        children: [
          { label: "All Courses", href: "/dashboard/courses" },
          { label: "Add Course", href: "/dashboard/courses/new" },
          { label: "Course Category", href: "/dashboard/courses/categories" },
          { label: "Course Sub Category", href: "/dashboard/courses/categories?tab=subcategory" },
          { label: "Add Subject", href: "/dashboard/courses/subjects" },
          { label: "Add Topic", href: "/dashboard/courses/topics" },
          { label: "Add Videos", href: "/dashboard/courses/videos" },
          { label: "Packages", href: "/dashboard/courses/packages" },
          { label: "Copy Course", href: "/dashboard/courses/copy" },
        ],
      },
      { label: "Teachers", href: "/dashboard/teachers" },
      { label: "Seminars", href: "/dashboard/seminars" },
      { label: "Item Bundles", href: "/dashboard/bundles" },
      { label: "YouTube Playlist", href: "/dashboard/youtube-playlist" },
    ],
  },
  {
    group: "TESTING & RESOURCES",
    items: [
      { label: "Test Series", href: "/dashboard/test-series" },
      { label: "AI Question Paper Generator", href: "/dashboard/ai-generator" },
      { label: "Video Assignments", href: "/dashboard/video-assignments" },
      { label: "Test Assignments", href: "/dashboard/test-assignments" },
      { label: "Notes & Docs", href: "/dashboard/notes" },
      { label: "Previous Papers", href: "/dashboard/previous-papers" },
      { label: "Score Sheet", href: "/dashboard/score-sheet" },
      { label: "E-Books", href: "/dashboard/ebooks" },
    ],
  },
  {
    group: "STUDENTS & MARKETING",
    items: [
      { label: "Students", href: "/dashboard/students" },
      { label: "Leads", href: "/dashboard/leads" },
      { label: "Toppers & Reviews", href: "/dashboard/toppers" },
      { label: "App Banners", href: "/dashboard/banners" },
      { label: "Push Notifications", href: "/dashboard/notifications" },
      { label: "Current Affairs", href: "/dashboard/current-affairs" },
      { label: "Latest Jobs", href: "/dashboard/jobs" },
    ],
  },
  {
    group: "SALES & BILLING",
    items: [
      { label: "Purchases & Orders", href: "/dashboard/orders" },
      { label: "Discounts & Coupons", href: "/dashboard/coupons" },
      { label: "OTP Usage", href: "/dashboard/otp-usage" },
    ],
  },
  {
    group: "SYSTEM & CONFIG",
    items: [
      { label: "Help & Support", href: "/dashboard/support" },
      { label: "Integrations", href: "/dashboard/integrations" },
      {
        label: "User Management", href: "/dashboard/roles",
        children: [
          { label: "Users", href: "/dashboard/users" },
          { label: "Roles", href: "/dashboard/roles" },
        ],
      },
      { label: "System Logs", href: "/dashboard/logs" },
      { label: "Account Settings", href: "/dashboard/settings" },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV.flatMap((g) =>
  g.items.flatMap((i) => (i.children ? [i, ...i.children] : [i]))
);
