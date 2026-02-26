import "./globals.css";
import type { Metadata } from "next";
import KonnectifyScript from "./konnectify-script";

export const metadata: Metadata = {
  title: "Konnectify App Builder",
  description: "A simplified UI to test and build Konnectify apps",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head />
      <body style={{ margin: 0, padding: 0, overflow: "hidden" }}>
        <KonnectifyScript />
        {children}
      </body>
    </html>
  );
}
