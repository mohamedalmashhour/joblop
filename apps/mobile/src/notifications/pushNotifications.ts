import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { MobileSessionTransport } from "../auth/secureSession";
import { pushPlatformFor, readEasProjectId, readPushTarget, type PushTarget } from "./pushTarget";

// Push notifications for the phone app. expo-notifications / expo-constants are loaded lazily so the
// browser preview and the Node tests never touch the native module, and so a build without an EAS
// project id simply skips push (the owner activates it later by adding extra.eas.projectId).

type PermissionStatus = "granted" | "denied" | "undetermined";
type NotificationResponse = Readonly<{ notification: { request: { content: { data?: unknown } } } }>;

// The small part of expo-notifications this app uses.
type NotificationsModule = {
  setNotificationHandler(
    handler: {
      handleNotification: () => Promise<{
        shouldShowBanner: boolean;
        shouldShowList: boolean;
        shouldPlaySound: boolean;
        shouldSetBadge: boolean;
      }>;
    } | null
  ): void;
  setNotificationChannelAsync(id: string, channel: { name: string; importance: number }): Promise<unknown>;
  AndroidImportance: { HIGH: number };
  getPermissionsAsync(): Promise<{ status: PermissionStatus }>;
  requestPermissionsAsync(): Promise<{ status: PermissionStatus }>;
  getExpoPushTokenAsync(options: { projectId: string }): Promise<{ data: string }>;
  addNotificationResponseReceivedListener(listener: (response: NotificationResponse) => void): { remove(): void };
  getLastNotificationResponseAsync?: () => Promise<NotificationResponse | null>;
};

type PushRuntime = Readonly<{ notifications: NotificationsModule; projectId: string; platform: "ios" | "android" }>;

const askedKey = "rwos.push.asked";
let runtimePromise: Promise<PushRuntime | null> | null = null;

async function loadRuntime(): Promise<PushRuntime | null> {
  const platform = pushPlatformFor(Platform.OS);
  if (!platform) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- types arrive once the package is installed
    // @ts-ignore
    const constantsModule: unknown = await import("expo-constants");
    const constants = (constantsModule as { default?: unknown }).default ?? constantsModule;
    const projectId = readEasProjectId(constants);
    if (!projectId) return null;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- types arrive once the package is installed
    // @ts-ignore
    const notificationsModule: unknown = await import("expo-notifications");
    return { notifications: notificationsModule as NotificationsModule, projectId, platform };
  } catch {
    return null;
  }
}

function runtime(): Promise<PushRuntime | null> {
  runtimePromise ??= loadRuntime();
  return runtimePromise;
}

/** Shows notices while the app is open and creates the Android "shifts" channel. Never throws. */
export async function setUpNotificationDisplay(): Promise<boolean> {
  const rt = await runtime();
  if (!rt) return false;
  try {
    rt.notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false
      })
    });
    if (rt.platform === "android") {
      await rt.notifications.setNotificationChannelAsync("shifts", {
        name: "Shifts",
        importance: rt.notifications.AndroidImportance.HIGH
      });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * What the app should do after sign-in: "register" (already allowed), "ask" (show the one-line
 * explanation first), or "skip" (no EAS project, web, refused, or already asked once).
 */
export async function pushPermissionPlan(): Promise<"register" | "ask" | "skip"> {
  const rt = await runtime();
  if (!rt) return "skip";
  try {
    const { status } = await rt.notifications.getPermissionsAsync();
    if (status === "granted") return "register";
    if (status === "denied") return "skip";
    const asked = await SecureStore.getItemAsync(askedKey).catch(() => null);
    return asked ? "skip" : "ask";
  } catch {
    return "skip";
  }
}

/** Remembers that the worker answered, so the explanation is shown only once. */
export async function rememberPushAsked(): Promise<void> {
  await SecureStore.setItemAsync(askedKey, "1").catch(() => undefined);
}

/**
 * Asks the system permission (when `ask` is true), gets the Expo push token and sends it to the API.
 * Returns the token that was registered, or null. Never throws.
 */
export async function registerForPush(
  transport: MobileSessionTransport,
  options: Readonly<{ ask: boolean }>
): Promise<string | null> {
  const rt = await runtime();
  if (!rt) return null;
  try {
    let { status } = await rt.notifications.getPermissionsAsync();
    if (status !== "granted" && options.ask) {
      await rememberPushAsked();
      status = (await rt.notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return null;
    const { data: token } = await rt.notifications.getExpoPushTokenAsync({ projectId: rt.projectId });
    const result = await transport.registerPushToken({ token, platform: rt.platform });
    return result.status === "ready" ? token : null;
  } catch {
    return null;
  }
}

/** Calls `onOpen` when the worker taps a notice (also for the notice that launched the app). */
export function subscribeToNotificationTaps(onOpen: (target: PushTarget) => void): () => void {
  let removed = false;
  let subscription: { remove(): void } | null = null;
  void runtime().then(async (rt) => {
    if (!rt || removed) return;
    try {
      subscription = rt.notifications.addNotificationResponseReceivedListener((response) => {
        const target = readPushTarget(response.notification.request.content.data);
        if (target) onOpen(target);
      });
      const last = await rt.notifications.getLastNotificationResponseAsync?.();
      const target = last ? readPushTarget(last.notification.request.content.data) : null;
      if (target && !removed) onOpen(target);
    } catch {
      // A broken notification module must never break the app.
    }
  });
  return () => {
    removed = true;
    subscription?.remove();
  };
}
