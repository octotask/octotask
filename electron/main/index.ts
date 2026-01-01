import { app, BrowserWindow, session } from 'electron';
import log from 'electron-log';
import path from 'node:path';

import { createWindow } from './ui/window';
import { setupMenu } from './ui/menu';
import { secureIpcMainHandle } from './utils/ipc';
import { isDev } from './utils/constants';

// 1. Set up logging
Object.assign(console, log.functions);
log.transports.file.level = isDev ? 'debug' : 'info';

// 2. Handle unhandled errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

// 3. Main app entry point
async function main() {
  await app.whenReady();

  // 4. Apply security settings
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          // Only allow scripts from 'self' and our secure protocol
          "script-src 'self' 'unsafe-inline'"
        ],
      },
    });
  });

  // 5. Define renderer URL
  // In production, we'll load the local file.
  // In development, we'll load the Vite dev server.
  const rendererURL = isDev
    ? `http://localhost:5173` // Default Vite port
    : `file://${path.join(__dirname, '..', 'renderer', 'index.html')}`;

  // 6. Create the main window
  const win = await createWindow(rendererURL);

  // 7. Set up the application menu
  setupMenu(win);

  // 8. Register secure IPC handlers
  registerIpcHandlers();

  // 9. Handle macOS activation
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow(rendererURL);
    }
  });
}

// 10. IPC Handler Registration
function registerIpcHandlers() {
  const API_URL = 'http://localhost:8787';

  secureIpcMainHandle('ipcTest', (event, ...args) => {
    console.log('IPC Test Received:', { event, args });
    return { success: true, message: 'IPC Test Handled' };
  });

  // Vault handlers now proxy to the API service
  secureIpcMainHandle('vault:get-secret', async (_, key: string) => {
    try {
      const response = await fetch(`${API_URL}/vault/${key}`);
      if (!response.ok) {
        console.error(`[API] Error getting secret ${key}:`, response.statusText);
        return null;
      }
      const { value } = (await response.json()) as { value: string };
      return value;
    } catch (error) {
      console.error(`[API] Fetch error getting secret ${key}:`, error);
      return null;
    }
  });

  secureIpcMainHandle('vault:save-secret', async (_, key: string, value: string) => {
    try {
      const response = await fetch(`${API_URL}/vault/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      return response.ok;
    } catch (error) {
      console.error(`[API] Fetch error saving secret ${key}:`, error);
      return false;
    }
  });

  secureIpcMainHandle('vault:delete-secret', async (_, key: string) => {
    try {
      const response = await fetch(`${API_URL}/vault/${key}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error(`[API] Fetch error deleting secret ${key}:`, error);
      return false;
    }
  });
}

// 11. App lifecycle handlers
app.on('window-all-closed', () => {
  // On macOS, it's common for applications to stay open until the user explicitly quits.
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 12. Start the application
main().catch(console.error);
