import { useStore } from '@nanostores/react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import { themeStore } from './lib/stores/theme';
import { stripIndents } from './utils/stripIndent';
import { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { cssTransition, ToastContainer } from 'react-toastify';

import 'virtual:uno.css';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

const inlineThemeCode = stripIndents`
  setTutorialKitTheme();

  function setTutorialKitTheme() {
    let theme = localStorage.getItem('octo_theme');

    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.querySelector('html')?.setAttribute('data-theme', theme);
  }
`;

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useStore(themeStore);

  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
      </head>
      <body>
        <DndProvider backend={HTML5Backend}>{children}</DndProvider>
        <ToastContainer
          closeButton={({ closeToast }) => {
            return (
              <button className="Toastify__close-button" onClick={closeToast}>
                <div className="i-ph:x text-lg" />
              </button>
            );
          }}
          icon={({ type }) => {
            switch (type) {
              case 'success': {
                return <div className="i-ph:check-bold text-octo-elements-icon-success text-2xl" />;
              }
              case 'error': {
                return <div className="i-ph:warning-circle-bold text-octo-elements-icon-error text-2xl" />;
              }
            }

            return undefined;
          }}
          position="bottom-right"
          pauseOnFocusLoss
          transition={toastAnimation}
          autoClose={3000}
        />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

import { logStore } from './lib/stores/logs';

export default function App() {
  const theme = useStore(themeStore);

  useEffect(() => {
    logStore.logSystem('Application initialized', {
      theme,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    // Initialize debug logging with improved error handling
    import('./utils/debugLogger')
      .then(({ debugLogger }) => {
        /*
         * The debug logger initializes itself and starts disabled by default
         * It will only start capturing when enableDebugMode() is called
         */
        const status = debugLogger.getStatus();
        logStore.logSystem('Debug logging ready', {
          initialized: status.initialized,
          capturing: status.capturing,
          enabled: status.enabled,
        });
      })
      .catch((error) => {
        logStore.logError('Failed to initialize debug logging', error);
      });
  }, []);

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
