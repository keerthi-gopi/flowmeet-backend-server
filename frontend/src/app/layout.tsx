import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowMeet — Video Conferencing, Reimagined",
  description:
    "Free, instant video meetings for teams of up to 10. No signup required. Share a link and start talking.",
  keywords: ["video conferencing", "free meetings", "WebRTC", "screen sharing"],
  openGraph: {
    title: "FlowMeet — Video Conferencing, Reimagined",
    description: "Free, instant video meetings. No signup required.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
