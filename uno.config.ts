import { globSync } from 'fast-glob';
import fs from 'node:fs/promises';
import { basename } from 'node:path';
import { defineConfig, presetIcons, presetUno, transformerDirectives } from 'unocss';

const iconPaths = globSync('./icons/*.svg');

const collectionName = 'octo';

const customIconCollection = iconPaths.reduce(
  (acc, iconPath) => {
    const [iconName] = basename(iconPath).split('.');

    acc[collectionName] ??= {};
    acc[collectionName][iconName] = async () => fs.readFile(iconPath, 'utf8');

    return acc;
  },
  {} as Record<string, Record<string, () => Promise<string>>>,
);

const BASE_COLORS = {
  white: '#FFFFFF',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A',
  },
  accent: {
    50: '#F8F5FF',
    100: '#F0EBFF',
    200: '#E1D6FF',
    300: '#CEBEFF',
    400: '#B69EFF',
    500: '#9C7DFF',
    600: '#8A5FFF',
    700: '#7645E8',
    800: '#6234BB',
    900: '#502D93',
    950: '#2D1959',
  },
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
    950: '#052E16',
  },
  orange: {
    50: '#FFFAEB',
    100: '#FEEFC7',
    200: '#FEDF89',
    300: '#FEC84B',
    400: '#FDB022',
    500: '#F79009',
    600: '#DC6803',
    700: '#B54708',
    800: '#93370D',
    900: '#792E0D',
  },
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
    950: '#450A0A',
  },
};

const COLOR_PRIMITIVES = {
  ...BASE_COLORS,
  alpha: {
    white: generateAlphaPalette(BASE_COLORS.white),
    gray: generateAlphaPalette(BASE_COLORS.gray[900]),
    red: generateAlphaPalette(BASE_COLORS.red[500]),
    accent: generateAlphaPalette(BASE_COLORS.accent[500]),
  },
};

export default defineConfig({
  safelist: [...Object.keys(customIconCollection[collectionName] || {}).map((x) => `i-octo:${x}`)],
  shortcuts: {
    'octo-ease-cubic-bezier': 'ease-[cubic-bezier(0.4,0,0.2,1)]',
    'transition-theme': 'transition-[background-color,border-color,color] duration-150 octo-ease-cubic-bezier',
    kdb: 'bg-octo-elements-code-background text-octo-elements-code-text py-1 px-1.5 rounded-md',
    'max-w-chat': 'max-w-[var(--chat-max-width)]',
  },
  rules: [
    /**
     * This shorthand doesn't exist in Tailwind and we overwrite it to avoid
     * any conflicts with minified CSS classes.
     */
    ['b', {}],
  ],
  theme: {
    colors: {
      ...COLOR_PRIMITIVES,
      octo: {
        elements: {
          borderColor: 'var(--octo-elements-borderColor)',
          borderColorActive: 'var(--octo-elements-borderColorActive)',
          background: {
            depth: {
              1: 'var(--octo-elements-bg-depth-1)',
              2: 'var(--octo-elements-bg-depth-2)',
              3: 'var(--octo-elements-bg-depth-3)',
              4: 'var(--octo-elements-bg-depth-4)',
            },
          },
          textPrimary: 'var(--octo-elements-textPrimary)',
          textSecondary: 'var(--octo-elements-textSecondary)',
          textTertiary: 'var(--octo-elements-textTertiary)',
          code: {
            background: 'var(--octo-elements-code-background)',
            text: 'var(--octo-elements-code-text)',
          },
          button: {
            primary: {
              background: 'var(--octo-elements-button-primary-background)',
              backgroundHover: 'var(--octo-elements-button-primary-backgroundHover)',
              text: 'var(--octo-elements-button-primary-text)',
            },
            secondary: {
              background: 'var(--octo-elements-button-secondary-background)',
              backgroundHover: 'var(--octo-elements-button-secondary-backgroundHover)',
              text: 'var(--octo-elements-button-secondary-text)',
            },
            danger: {
              background: 'var(--octo-elements-button-danger-background)',
              backgroundHover: 'var(--octo-elements-button-danger-backgroundHover)',
              text: 'var(--octo-elements-button-danger-text)',
            },
          },
          item: {
            contentDefault: 'var(--octo-elements-item-contentDefault)',
            contentActive: 'var(--octo-elements-item-contentActive)',
            contentAccent: 'var(--octo-elements-item-contentAccent)',
            contentDanger: 'var(--octo-elements-item-contentDanger)',
            backgroundDefault: 'var(--octo-elements-item-backgroundDefault)',
            backgroundActive: 'var(--octo-elements-item-backgroundActive)',
            backgroundAccent: 'var(--octo-elements-item-backgroundAccent)',
            backgroundDanger: 'var(--octo-elements-item-backgroundDanger)',
          },
          actions: {
            background: 'var(--octo-elements-actions-background)',
            code: {
              background: 'var(--octo-elements-actions-code-background)',
            },
          },
          artifacts: {
            background: 'var(--octo-elements-artifacts-background)',
            backgroundHover: 'var(--octo-elements-artifacts-backgroundHover)',
            borderColor: 'var(--octo-elements-artifacts-borderColor)',
            inlineCode: {
              background: 'var(--octo-elements-artifacts-inlineCode-background)',
              text: 'var(--octo-elements-artifacts-inlineCode-text)',
            },
          },
          messages: {
            background: 'var(--octo-elements-messages-background)',
            linkColor: 'var(--octo-elements-messages-linkColor)',
            code: {
              background: 'var(--octo-elements-messages-code-background)',
            },
            inlineCode: {
              background: 'var(--octo-elements-messages-inlineCode-background)',
              text: 'var(--octo-elements-messages-inlineCode-text)',
            },
          },
          icon: {
            success: 'var(--octo-elements-icon-success)',
            error: 'var(--octo-elements-icon-error)',
            primary: 'var(--octo-elements-icon-primary)',
            secondary: 'var(--octo-elements-icon-secondary)',
            tertiary: 'var(--octo-elements-icon-tertiary)',
          },
          preview: {
            addressBar: {
              background: 'var(--octo-elements-preview-addressBar-background)',
              backgroundHover: 'var(--octo-elements-preview-addressBar-backgroundHover)',
              backgroundActive: 'var(--octo-elements-preview-addressBar-backgroundActive)',
              text: 'var(--octo-elements-preview-addressBar-text)',
              textActive: 'var(--octo-elements-preview-addressBar-textActive)',
            },
          },
          terminals: {
            background: 'var(--octo-elements-terminals-background)',
            buttonBackground: 'var(--octo-elements-terminals-buttonBackground)',
          },
          dividerColor: 'var(--octo-elements-dividerColor)',
          loader: {
            background: 'var(--octo-elements-loader-background)',
            progress: 'var(--octo-elements-loader-progress)',
          },
          prompt: {
            background: 'var(--octo-elements-prompt-background)',
          },
          sidebar: {
            dropdownShadow: 'var(--octo-elements-sidebar-dropdownShadow)',
            buttonBackgroundDefault: 'var(--octo-elements-sidebar-buttonBackgroundDefault)',
            buttonBackgroundHover: 'var(--octo-elements-sidebar-buttonBackgroundHover)',
            buttonText: 'var(--octo-elements-sidebar-buttonText)',
          },
          cta: {
            background: 'var(--octo-elements-cta-background)',
            text: 'var(--octo-elements-cta-text)',
          },
        },
      },
    },
  },
  transformers: [transformerDirectives()],
  presets: [
    presetUno({
      dark: {
        light: '[data-theme="light"]',
        dark: '[data-theme="dark"]',
      },
    }),
    presetIcons({
      warn: true,
      collections: {
        ...customIconCollection,
      },
      unit: 'em',
    }),
  ],
});

/**
 * Generates an alpha palette for a given hex color.
 *
 * @param hex - The hex color code (without alpha) to generate the palette from.
 * @returns An object where keys are opacity percentages and values are hex colors with alpha.
 *
 * Example:
 *
 * ```
 * {
 *   '1': '#FFFFFF03',
 *   '2': '#FFFFFF05',
 *   '3': '#FFFFFF08',
 * }
 * ```
 */
function generateAlphaPalette(hex: string) {
  return [1, 2, 3, 4, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].reduce(
    (acc, opacity) => {
      const alpha = Math.round((opacity / 100) * 255)
        .toString(16)
        .padStart(2, '0');

      acc[opacity] = `${hex}${alpha}`;

      return acc;
    },
    {} as Record<number, string>,
  );
}
