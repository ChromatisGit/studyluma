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
  isAttemptedRef.current = isAttempted;

  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  useEffect(() => {
    if (!context.storageKey) return;
    context.onAttemptedChange?.(context.storageKey, isAttempted);
  }, [context.storageKey, context.onAttemptedChange, isAttempted]);

  useEffect(() => {
    if (!context.checkTrigger || context.checkTrigger === 0) return;
    if (!isAttemptedRef.current) return;
    onTriggerRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.checkTrigger]);
}
