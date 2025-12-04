import { z } from 'zod';

export const accentColorSchema = z.enum(['purple', 'blue', 'green', 'orange', 'teal', 'red']);
export type AccentColor = z.infer<typeof accentColorSchema>;
//https://coolors.co/eb8023-af1b3f-2e8555-32989a-5784ec