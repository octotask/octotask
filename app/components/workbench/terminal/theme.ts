import type { ITheme } from '@xterm/xterm';

const style = getComputedStyle(document.documentElement);
const cssVar = (token: string) => style.getPropertyValue(token) || undefined;

export function getTerminalTheme(overrides?: ITheme): ITheme {
  return {
    cursor: cssVar('--octo-elements-terminal-cursorColor'),
    cursorAccent: cssVar('--octo-elements-terminal-cursorColorAccent'),
    foreground: cssVar('--octo-elements-terminal-textColor'),
    background: cssVar('--octo-elements-terminal-backgroundColor'),
    selectionBackground: cssVar('--octo-elements-terminal-selection-backgroundColor'),
    selectionForeground: cssVar('--octo-elements-terminal-selection-textColor'),
    selectionInactiveBackground: cssVar('--octo-elements-terminal-selection-backgroundColorInactive'),

    // ansi escape code colors
    black: cssVar('--octo-elements-terminal-color-black'),
    red: cssVar('--octo-elements-terminal-color-red'),
    green: cssVar('--octo-elements-terminal-color-green'),
    yellow: cssVar('--octo-elements-terminal-color-yellow'),
    blue: cssVar('--octo-elements-terminal-color-blue'),
    magenta: cssVar('--octo-elements-terminal-color-magenta'),
    cyan: cssVar('--octo-elements-terminal-color-cyan'),
    white: cssVar('--octo-elements-terminal-color-white'),
    brightBlack: cssVar('--octo-elements-terminal-color-brightBlack'),
    brightRed: cssVar('--octo-elements-terminal-color-brightRed'),
    brightGreen: cssVar('--octo-elements-terminal-color-brightGreen'),
    brightYellow: cssVar('--octo-elements-terminal-color-brightYellow'),
    brightBlue: cssVar('--octo-elements-terminal-color-brightBlue'),
    brightMagenta: cssVar('--octo-elements-terminal-color-brightMagenta'),
    brightCyan: cssVar('--octo-elements-terminal-color-brightCyan'),
    brightWhite: cssVar('--octo-elements-terminal-color-brightWhite'),

    ...overrides,
  };
}
