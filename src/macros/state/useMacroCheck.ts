import { useRef, useEffect } from 'react';
import type { MacroRenderContext } from '@macros/componentTypes';

/**
 * Shared hook for macro check-solution behavior.
 *
 * - Reports `isAttempted` via `context.onAttemptedChange` whenever it changes.
 * - Calls `onTrigger` when `context.checkTrigger` increments AND the macro was
 *   attempted at that moment. Typing after a failed check never triggers early.
 *   `onTrigger` may safely close over current component state.
 */
export function useMacroCheck(
  context: MacroRenderContext,
  isAttempted: boolean,
  onTrigger: () => void,
): void {
  const isAttemptedRef = useRef(isAttempted);
  const onTriggerRef = useRef(onTrigger);

  useEffect(() => { isAttemptedRef.current = isAttempted; });
  useEffect(() => { onTriggerRef.current = onTrigger; });

  const { storageKey, onAttemptedChange, checkTrigger } = context;

  useEffect(() => {
    if (!storageKey) return;
    onAttemptedChange?.(storageKey, isAttempted);
  }, [storageKey, onAttemptedChange, isAttempted]);

  useEffect(() => {
    if (!checkTrigger || checkTrigger === 0) return;
    if (!isAttemptedRef.current) return;
    onTriggerRef.current();
  }, [checkTrigger]);
}
