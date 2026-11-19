"""The permissions from the ClassWalla Roles screen (spec).

NOTE: the spec says "36 permissions" but the list it gives contains 37
strings. The list itself is authoritative, so all 37 are kept and validated.
"""

PERMISSIONS = [
    "View Course",
    "Manage Course",
    "View Videos",
    "Manage Videos",
    "View Students",
    "Manage Students",
    "View Coupons",
    "Manage Coupons",
    "View Users",
    "Manage Users",
    "Help Request",
    "Notification",
    "Banners",
    "Score Sheet",
    "Purchases",
    "Leads",
    "View Test Series",
    "Manage Test Series",
    "View Seminars",
    "Manage Seminars",
    "View Ebook",
    "Manage Ebook",
    "Manage OTP",
    "View Item Bundles",
    "Manage Item Bundles",
    "View Previous Paper",
    "Manage Previous Paper",
    "View PDFs/Notes",
    "Manage PDFs/Notes",
    "Current Affairs & Latest Jobs",
    "View Playlist",
    "Manage Playlist",
    "Transfer Order",
    "Refund Order",
    "Integrations",
    "View Teachers",
    "Manage Teachers",
]

# Teacher role subset (sensible read/manage subset, not system default).
TEACHER_PERMISSIONS = [
    "View Course",
    "View Videos",
    "View Students",
    "View Test Series",
    "Manage Test Series",
    "Score Sheet",
    "View PDFs/Notes",
    "View Teachers",
    "View Playlist",
]
