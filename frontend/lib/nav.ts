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
          { label: "Course Sub Category", href: "/dashboard/courses/categories" },
        ],
      },
      { label: "Teachers", href: "/dashboard/teachers" },
      { label: "Seminars", href: "/dashboard/coming-soon?feature=Seminars" },
      { label: "Item Bundles", href: "/dashboard/coming-soon?feature=Item%20Bundles" },
      { label: "YouTube Playlist", href: "/dashboard/coming-soon?feature=YouTube%20Playlist" },
    ],
  },
  {
    group: "TESTING & RESOURCES",
    items: [
      { label: "Test Series", href: "/dashboard/coming-soon?feature=Test%20Series" },
      { label: "Video Assignments", href: "/dashboard/coming-soon?feature=Video%20Assignments" },
      { label: "Test Assignments", href: "/dashboard/coming-soon?feature=Test%20Assignments" },
      { label: "Notes & Docs", href: "/dashboard/coming-soon?feature=Notes%20%26%20Docs" },
      { label: "Previous Papers", href: "/dashboard/coming-soon?feature=Previous%20Papers" },
      { label: "Score Sheet", href: "/dashboard/coming-soon?feature=Score%20Sheet" },
      { label: "E-Books", href: "/dashboard/coming-soon?feature=E-Books" },
    ],
  },
  {
    group: "STUDENTS & MARKETING",
    items: [
      { label: "Students", href: "/dashboard/students" },
      { label: "Leads", href: "/dashboard/coming-soon?feature=Leads" },
      { label: "Toppers & Reviews", href: "/dashboard/coming-soon?feature=Toppers%20%26%20Reviews" },
      { label: "App Banners", href: "/dashboard/coming-soon?feature=App%20Banners" },
      { label: "Push Notifications", href: "/dashboard/coming-soon?feature=Push%20Notifications" },
      { label: "Current Affairs", href: "/dashboard/coming-soon?feature=Current%20Affairs" },
      { label: "Latest Jobs", href: "/dashboard/coming-soon?feature=Latest%20Jobs" },
    ],
  },
  {
    group: "SALES & BILLING",
    items: [
      { label: "Purchases & Orders", href: "/dashboard/orders" },
      { label: "Discounts & Coupons", href: "/dashboard/coming-soon?feature=Discounts%20%26%20Coupons" },
      { label: "OTP Usage", href: "/dashboard/coming-soon?feature=OTP%20Usage" },
    ],
  },
  {
    group: "SYSTEM & CONFIG",
    items: [
      { label: "Help & Support", href: "/dashboard/coming-soon?feature=Help%20%26%20Support" },
      { label: "Integrations", href: "/dashboard/coming-soon?feature=Integrations" },
      {
        label: "User Management", href: "/dashboard/roles",
        children: [
          { label: "Users", href: "/dashboard/coming-soon?feature=Users" },
          { label: "Roles", href: "/dashboard/roles" },
        ],
      },
      { label: "System Logs", href: "/dashboard/coming-soon?feature=System%20Logs" },
      { label: "Account Settings", href: "/dashboard/settings" },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV.flatMap((g) =>
  g.items.flatMap((i) => (i.children ? [i, ...i.children] : [i]))
);
