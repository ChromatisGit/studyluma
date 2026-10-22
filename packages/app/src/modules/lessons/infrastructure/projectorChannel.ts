import type { TeacherQuizView } from "../../classroom";
import type { DeckState } from "../domain/lesson";

/** The invitation the projector shows instead of the slide. */
export type JoinInfo = {
  code: string;
  /** The address students open, without the scheme. */
  address: string;
  /** The full link behind the QR code. */
  url: string;
  /** Students who have joined; no names. */
  count: number;
};

/** Messages between the teacher window and the projector window. */
export type ProjectorMessage =
  | {
      type: "state";
      /** The deck on the stage and where the projector shows it. */
      presentationId: string;
      projectorPath: string;
      deck: DeckState;
    }
  | { type: "join"; join: JoinInfo | null }
  /** The running quiz of the slide on the stage; null: none. */
  | { type: "quiz"; view: TeacherQuizView | null }
  | { type: "laser"; point: [number, number] | null }
  | { type: "scroll"; slideId: string; ratio: number }
  | { type: "hello" }
  | { type: "ping" }
  | { type: "bye" };

/**
 * Both windows run in the same browser and talk over a BroadcastChannel;
 * there is no server. Returns `null` where the API is missing.
 */
export function openProjectorChannel(
  onMessage: (message: ProjectorMessage) => void,
): { send: (message: ProjectorMessage) => void; close: () => void } | null {
  if (typeof BroadcastChannel === "undefined") {
    return null;
  }
  const channel = new BroadcastChannel("studyluma-unit");
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
