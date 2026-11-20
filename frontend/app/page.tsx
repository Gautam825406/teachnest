import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "TeachNest — Run your coaching institute from one place",
  description:
    "TeachNest is the white-label platform for coaching institutes: admin panel, courses and video lectures, test series with an AI question-paper generator, live classes, a branded student app, and secure payments through Cashfree.",
  openGraph: {
    title: "TeachNest — Run your coaching institute from one place",
    description:
      "Admin panel, test series, live classes and a white-label student app for coaching institutes, with payments through Cashfree.",
    type: "website",
    siteName: "TeachNest",
  },
  twitter: {
    card: "summary_large_image",
    title: "TeachNest — Run your coaching institute from one place",
    description:
      "Admin panel, test series, live classes and a white-label student app for coaching institutes, with payments through Cashfree.",
  },
};

export default function Home() {
  return <LandingPage />;
}
