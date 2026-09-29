import { API_CONFIG } from "../config/api-config";
import { getAccessToken } from "./apiClient";

// ─── Singleton State ──────────────────────────────────────────────────────────

let socket: any = null;
let socketPromise: Promise<any> | null = null;

/**
 * Stores the last join_room payload so we can re-emit it automatically after
 * every (re)connect, including reconnects triggered by token rotation.
 */
let _lastJoinPayload: { role: string; userId: string; hospitalId?: string } | null = null;

/**
 * Set to true once the socket has permanently given up (max retries exhausted).
 * Prevents infinite re-initialisation loops.
 */
let _fatallyFailed = false;

// Keep reconnectionAttempts and MAX_RETRIES in sync — one source of truth.
const MAX_RETRIES = 10;

// ─── Socket Initialisation ────────────────────────────────────────────────────

export const getSocket = (token?: string): Promise<any> => {
  // Bail out early if WS_URL is not configured — avoids pointless connection spam.
  const baseUrl = API_CONFIG.WS_URL;
  if (!baseUrl) {
    console.warn("📡 [Socket] WS_URL is not configured. Real-time features are disabled.");
    return Promise.resolve(null);
  }

  // Do not retry once we have permanently failed.
  if (_fatallyFailed) {
    return Promise.resolve(null);
  }

  if (socket?.connected) return Promise.resolve(socket);
  if (socketPromise) return socketPromise;

  socketPromise = (async () => {
    try {
      // @ts-ignore — dynamic import keeps socket.io-client out of the SSR bundle
      const { io } = await import("socket.io-client");

      // Prefer the explicitly supplied token, then fall back to the in-memory store.
      const resolvedToken = token || getAccessToken() || undefined;

      console.log(
        "🔌 [Socket] Initializing Socket.IO →",
        baseUrl,
        "| Token present:",
        !!resolvedToken
      );

      const socketInstance = io(baseUrl, {
        auth: { token: resolvedToken },
        // Polling first so the handshake works behind proxies that don't yet support WS,
        // then upgrades to WebSocket automatically.
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: MAX_RETRIES,   // ← aligned with the counter below
        reconnectionDelay: 1000,
        reconnectionDelayMax: 8000,
        timeout: 20000,
        autoConnect: true,
        path: "/socket.io/",
      });

      // ── Connection success ────────────────────────────────────────────────
      socketInstance.on("connect", () => {
        _fatallyFailed = false;
        console.log("📡 ✅ [Socket] Connected (ID:", socketInstance.id + ")");

        // Re-join rooms on every (re)connect — covers both initial connection
        // and reconnects after token rotation.
        if (_lastJoinPayload) {
          console.log("🔌 [Socket] Auto re-joining room:", _lastJoinPayload);
          socketInstance.emit("join_room", _lastJoinPayload);
        }
      });

      // ── Connection error ──────────────────────────────────────────────────
      socketInstance.on("connect_error", (err: any) => {
        console.warn(`📡 ⚠️ [Socket] Connection error:`, err.message);
        if (err.description) console.warn("📡 [Socket] Detail:", err.description);
      });

      // ── Permanent failure (all retries exhausted) ─────────────────────────
      socketInstance.on("reconnect_failed", () => {
        _fatallyFailed = true;
        socketPromise = null; // allow callers to retry later if they choose
        console.error(
          `📡 ❌ [Socket] Max connection retries (${MAX_RETRIES}) reached. ` +
          `Real-time features disabled. Backend URL: ${baseUrl}`
        );
      });

      socketInstance.on("disconnect", (reason: string) => {
        console.log("📡 [Socket] Disconnected. Reason:", reason);
      });

      socketInstance.on("error", (err: any) => {
        console.error("📡 [Socket] Error:", err);
      });

      socketInstance.on("reconnect", (attemptNumber: number) => {
        console.log(`📡 🔄 [Socket] Reconnected after ${attemptNumber} attempt(s)`);
      });

      socket = socketInstance;
      return socket;
    } catch (error) {
      console.error("📡 [Socket] Failed to initialize Socket.IO:", error);
      socketPromise = null; // allow a future retry
      return null;
    }
  })();

  return socketPromise;
};

// ─── Disconnect ───────────────────────────────────────────────────────────────

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socketPromise = null;
  _fatallyFailed = false; // reset so a future login can reconnect
};

// ─── Token Rotation Handler ───────────────────────────────────────────────────

/**
 * Called by apiClient / authStore after every successful token refresh.
 *
 * Strategy:
 *  1. Update socket.auth.token in-place (no destroy).
 *  2. Cycle disconnect → connect so the server receives the new token in the handshake.
 *  3. The "connect" listener fires and re-emits join_room automatically.
 *
 * This is safer than resetSocket() because all existing event listeners are preserved.
 */
export const updateSocketToken = async (newToken: string): Promise<void> => {
  if (!newToken) return;

  if (!socket) {
    // Socket not yet initialized — create fresh with the new token.
    await getSocket(newToken);
    return;
  }

  try {
    console.log("🔄 [Socket] Rotating token — cycling connection...");
    socket.auth = { token: newToken };
    socket.disconnect();
    socket.connect();
  } catch (err) {
    console.warn("📡 [Socket] updateSocketToken failed:", err);
    // Fallback: full reinitialise
    disconnectSocket();
    await getSocket(newToken);
  }
};

/**
 * Full reset — use only on login/logout.
 * Token rotation should use updateSocketToken() to preserve event listeners.
 */
export const resetSocket = async (newToken?: string): Promise<any> => {
  disconnectSocket();
  return getSocket(newToken || undefined);
};

// ─── Pub/Sub Helpers ──────────────────────────────────────────────────────────

export const subscribeToSocket = async (
  event: string,
  callback: (data: any) => void
) => {
  const socketInstance = await getSocket();
  if (socketInstance) {
    socketInstance.on(event, callback);
  }
};

export const unsubscribeFromSocket = async (
  event: string,
  callback: (data: any) => void
) => {
  const socketInstance = await getSocket();
  if (socketInstance) {
    socketInstance.off(event, callback);
  }
};

// ─── Room Management ──────────────────────────────────────────────────────────

export const joinSocketRoom = async (userData: {
  role: string;
  userId: string;
  hospitalId?: string;
}) => {
  // Persist payload so reconnect-after-rotation can re-emit automatically.
  _lastJoinPayload = userData;

  const socketInstance = await getSocket();
  if (!socketInstance) return;

  if (socketInstance.connected) {
    console.log("🔌 [Socket] Joining room:", userData);
    socketInstance.emit("join_room", userData);
  } else {
    // Use 'once' — avoids stacking duplicate listeners on repeated calls.
    socketInstance.once("connect", () => {
      console.log("🔌 [Socket] Joining room (deferred until connect):", userData);
      socketInstance.emit("join_room", userData);
    });
  }
};

export const leaveSocketRoom = () => {
  _lastJoinPayload = null;
};
