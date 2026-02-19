export type MacroStateAdapter = {
  read: (key: string) => string | null;
  write: (key: string, value: string) => void;
  readonly isReadOnly: boolean;
};
