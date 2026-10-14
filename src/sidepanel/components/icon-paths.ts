/** Hand-drawn icon strokes. Each icon is one or more SVG paths drawn with the current text colour. */
export interface IconDrawing {
  viewBox: string;
  strokeWidth: number;
  paths: string[];
}

export const ICON_PATHS = {
  tick: { viewBox: '0 0 20 20', strokeWidth: 2.2, paths: ['M3 10.5c1.6 1.4 2.8 3 4 4.6C9.6 9.8 13 5.6 17.5 2.5'] },
  cross: {
    viewBox: '0 0 20 20',
    strokeWidth: 2.2,
    paths: ['M4.5 4c3.4 3.7 7.2 7.6 11 12M15.5 4.5C11.6 8 8 11.6 4 15.6'],
  },
  arrow: {
    viewBox: '0 0 20 20',
    strokeWidth: 2,
    paths: ['M3 10.4c4.4-.3 8.8-.5 13.4-.2M11.5 5.5c1.8 1.6 3.4 3.1 5 4.6-1.6 1.6-3.2 3.3-4.6 5'],
  },
  pen: {
    viewBox: '0 0 20 20',
    strokeWidth: 1.8,
    paths: ['M3.5 16.5l1-4L13.8 3.3c.9-.8 2.2-.8 3 0 .8.9.8 2.1 0 3L7.5 15.5zM12 5l3 3'],
  },
  copy: {
    viewBox: '0 0 20 20',
    strokeWidth: 1.7,
    paths: [
      'M7 6.5c0-1 .5-1.6 1.6-1.6h6.6c1 .1 1.5.6 1.5 1.6v8.2c0 1-.5 1.5-1.5 1.5H8.6c-1 0-1.6-.5-1.6-1.5zM4.2 13V4.6c0-1 .5-1.5 1.5-1.5h6.6',
    ],
  },
  download: {
    viewBox: '0 0 20 20',
    strokeWidth: 1.8,
    paths: ['M10 3c.2 3.8.1 7.4 0 10.6M5.6 9.6c1.5 1.5 3 3 4.4 4.4 1.5-1.4 3-2.9 4.4-4.4M4 16.8c4 .3 8 .3 12-.1'],
  },
  redo: {
    viewBox: '0 0 20 20',
    strokeWidth: 1.8,
    paths: ['M15.6 7.5A6.3 6.3 0 1 0 16.4 12M16 3.2c.1 1.6.1 3.1 0 4.6-1.5.1-3 .1-4.5 0'],
  },
  external: {
    viewBox: '0 0 20 20',
    strokeWidth: 1.7,
    paths: [
      'M11 3.4h5.6v5.4M16.4 3.6c-3 3-5.6 5.6-8 8M14.4 12v3.3c0 .9-.5 1.4-1.4 1.4H4.8c-.9 0-1.4-.5-1.4-1.4V7c0-.9.5-1.4 1.4-1.4H8',
    ],
  },
  trash: {
    viewBox: '0 0 20 20',
    strokeWidth: 1.7,
    paths: [
      'M3.5 5.4c4.4-.3 8.7-.3 13 0M8 5.2c0-1.3.6-2 2-2 1.4 0 2 .7 2 2M5.2 5.6l.9 10.6c.1.8.6 1.3 1.4 1.3h5c.8 0 1.3-.5 1.4-1.3l.9-10.6M8.4 8.6l.3 6M11.6 8.6l-.3 6',
    ],
  },
  document: {
    viewBox: '0 0 40 40',
    strokeWidth: 1.8,
    paths: [
      'M10 5c6-.4 11-.3 15 .1l6 6.2c.3 7.6.2 15.3-.2 23-6.8.5-13.8.4-21-.1C9.4 26 9.5 15.6 10 5z M25 5.3c-.2 2.2-.1 4.2.3 6.2 2 .2 3.9.1 5.8-.1M15 20c3.4-.2 6.6-.2 10 0M15 25.5c2.4-.1 4.6-.1 7 .1',
    ],
  },
  warning: { viewBox: '0 0 20 20', strokeWidth: 2.4, paths: ['M10 3c-.3 3.6-.2 6.9.2 10'] },
} satisfies Record<string, IconDrawing>;

export type IconName = keyof typeof ICON_PATHS;
