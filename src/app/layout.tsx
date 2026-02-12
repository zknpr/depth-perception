import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Depth Perception",
  description: "Test your knowledge of chronological events",
  icons: { icon: "/leviathan-200x200-circle.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
