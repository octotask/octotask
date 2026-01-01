import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';

const ALLOWED_CHANNELS = new Set([
  'ipcTest',
  'vault:save-secret',
  'vault:get-secret',
  'vault:delete-secret',
]);

export function secureIpcMainHandle(
  channel: string,
  listener: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any
) {
  if (!ALLOWED_CHANNELS.has(channel)) {
    console.error(`Attempted to register a handler for unallowed IPC channel: ${channel}`);
    return;
  }

  ipcMain.handle(channel, (event, ...args) => {
    // We could add more security checks here in the future,
    // for example, checking the sender's origin.
    console.log(`IPC call on allowed channel: ${channel}`);
    return listener(event, ...args);
  });
}
