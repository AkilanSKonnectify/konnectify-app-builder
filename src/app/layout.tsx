import "./globals.css";
import type { Metadata } from "next";

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
            <!-- Konnectify Tracking Script -->
            <script>
            (function() {
                var script = document.createElement('script');
                script.src = 'https://storage.googleapis.com/tracking-poc-stg/konnectify/konnectify.min.js';
                script.async = true;
                script.onload = function() {
                window.konnectify.init({
                    endpoint: "https://akilan.stack2.us.konnectify.dev/tracking/12408/website-tracker",
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
                        timing: true
                    },
                    respectDNT: true,
                    requireConsent: false,
                    debug: false
                });
                };
                document.head.appendChild(script);
            })();
            </script>
            `,
          }}
        />
      </head>
      <body style={{ margin: 0, padding: 0, overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
