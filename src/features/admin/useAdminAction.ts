import { useCallback, useTransition } from "react";
import { toast } from "sonner";
import { useDemoOverrides } from "@ui/demo/DemoOverrideContext";
import { postAdminAction } from "./routeActions";

type RunAdminActionOptions<T> = {
  payload: Record<string, unknown>;
  demo?: () => void;
  onSuccess?: (data: T | undefined) => void;
  onError?: (error: string) => void;
  successMessage?: string;
  toastErrors?: boolean;
};

export function useAdminAction() {
  const { isDemoMode } = useDemoOverrides();
  const [isPending, startTransition] = useTransition();

  const runAdminAction = useCallback(
    function runAdminAction<T = unknown>({
      payload,
      demo,
      onSuccess,
      onError,
      successMessage,
      toastErrors = true,
    }: RunAdminActionOptions<T>) {
      if (isDemoMode) {
        demo?.();
        if (successMessage) toast.success(successMessage);
        return;
      }

      startTransition(async () => {
        const result = await postAdminAction<T>(payload);

        if (!result.ok) {
          onError?.(result.error);
          if (toastErrors) toast.error(result.error);
          return;
        }

        onSuccess?.(result.data);
        if (successMessage) toast.success(successMessage);
      });
    },
    [isDemoMode],
  );

  return { isDemoMode, isPending, runAdminAction };
}
