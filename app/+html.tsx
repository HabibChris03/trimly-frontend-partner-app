import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// Template for rendering HTML headers for Web/iOS Safari PWA
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1.00001, viewport-fit=cover, user-scalable=no"
        />
        <title>Trimly Partner - Barber & Salon Management</title>
        <meta name="description" content="Manage appointments, staff, earnings, and bookings with Trimly Partner." />

        {/* iOS Safari PWA / Fullscreen App Experience */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Trimly Partner" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <meta name="theme-color" content="#171918" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `
          html, body, #root {
            height: 100%;
            background-color: #171918;
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
            user-select: none;
            overflow-x: hidden;
          }
        ` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

