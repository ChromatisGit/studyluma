export const accentColorEnum = ['purple', 'blue', 'green', 'orange', 'teal', 'red'] as const;
export type AccentColor = typeof accentColorEnum[number];