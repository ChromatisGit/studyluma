import type { LessonSession } from "../domain/lesson";

/** Messages between the teacher window and the projector window. */
export type ProjectorMessage =
  | { type: "state"; session: LessonSession }
  | { type: "laser"; point: [number, number] | null }
  | { type: "hello" }
  | { type: "ping" }
  | { type: "bye" };

/**
 * Both windows run in the same browser and talk over a BroadcastChannel;
 * there is no server. Returns `null` where the API is missing.
 */
export function openProjectorChannel(
  chapterId: string,
  onMessage: (message: ProjectorMessage) => void,
): { send: (message: ProjectorMessage) => void; close: () => void } | null {
  if (typeof BroadcastChannel === "undefined") {
    return null;
  }
  const channel = new BroadcastChannel(`studyluma-lesson-${chapterId}`);
  channel.onmessage = (event: MessageEvent<ProjectorMessage>) =>
    onMessage(event.data);
  return {
    send: (message) => channel.postMessage(message),
    close: () => channel.close(),
  };
}

/**
 * Opens the projector window. Where the Window Management API allows it,
 * the window goes to the other screen; otherwise the teacher drags it
 * over and presses F11.
 */
export async function openProjectorWindow(url: string): Promise<void> {
  const name = "studyluma-projector";
  const features = "popup,width=1280,height=720";
  try {
    const screens = await (
      window as Window & {
        getScreenDetails?: () => Promise<{
          screens: {
            isPrimary: boolean;
            availLeft: number;
            availTop: number;
            availWidth: number;
            availHeight: number;
          }[];
        }>;
      }
    ).getScreenDetails?.();
    const other = screens?.screens.find((screen) => !screen.isPrimary);
    if (other) {
      window.open(
        url,
        name,
        `popup,left=${other.availLeft},top=${other.availTop},width=${other.availWidth},height=${other.availHeight}`,
      );
      return;
    }
  } catch {
    // Permission denied or unsupported: open a normal window.
  }
  window.open(url, name, features);
}
