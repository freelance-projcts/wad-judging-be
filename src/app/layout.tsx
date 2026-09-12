import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WAD Judging API",
  description: "Backend API for the WAD Judging System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
