"use server";

import { signOutAction } from "@actions/accessActions";

/**
 * Server action to log the user out.
 * Re-exports signOutAction for direct use as a prop in app route components.
 */
export async function logoutAction(): Promise<void> {
  await signOutAction();
}
