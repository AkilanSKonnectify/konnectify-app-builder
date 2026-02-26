import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";

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
        {/* Load external SDK */}
        <Script
          src="https://storage.googleapis.com/tracking-poc-stg/konnectify/konnectify.min.js"
          strategy="afterInteractive"
          onLoad={() => {
            window.konnectify?.init({
              endpoint:
                "https://akilan.stack2.us.konnectify.dev/tracking/12408/website-tracker",
              apiKey: "YOUR_KONNECTOR_ID_HERE",
              batchSize: 10,
              batchTimeout: 30000,
              autoCapture: {
                pageView: true,
                pageExit: true,
                click: true,
                scroll: true,
                form: true,
                error: true,
                timing: true,
              },
              respectDNT: true,
              requireConsent: false,
              debug: false,
            });
          }}
        />

        {children}
      </body>
    </html>
  );
}
