import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Template for rendering HTML headers and scripts for Web/iOS Safari PWA
export default function Root({ children }: PropsWithChildren) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();

  return (
    <html lang="en" {...htmlAttributes}>
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
          html, body {
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
            background-color: #0D0F0E;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
            overflow-x: hidden;
          }
          #root {
            display: flex;
            height: 100%;
            width: 100%;
            max-width: 480px;
            margin: 0 auto;
            position: relative;
            background-color: #171918;
            box-shadow: 0 0 50px rgba(0, 0, 0, 0.7);
          }
          @media (max-width: 500px) {
            #root {
              max-width: 100%;
              box-shadow: none;
            }
          }
        ` }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
