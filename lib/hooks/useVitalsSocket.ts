import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { getSocket, joinSocketRoom } from "@/lib/integrations/api/socket";

/**
 * useVitalsSocket
 *
 * Plugs into the shared Socket.IO singleton (lib/integrations/api/socket.ts)
 * instead of spawning a second raw io() connection. This prevents duplicate
 * connection attempts, double-counting retries, and WSS errors when the
 * backend is unreachable.
 *
 * The hook safely no-ops when the socket cannot connect (WS_URL missing,
 * backend down, or max retries exhausted) — real-time features are optional.
 */
export function useVitalsSocket(
  patientId: string | null,
  onVitalsUpdate: (vitals: any) => void,
  doctorId?: string | null
) {
  const callbackRef = useRef(onVitalsUpdate);

  // Keep the callback ref in sync without triggering effect re-runs.
  useEffect(() => {
    callbackRef.current = onVitalsUpdate;
  }, [onVitalsUpdate]);

  useEffect(() => {
    if (!patientId) return;

    let socketInstance: any = null;
    let cleanedUp = false;

    const setup = async () => {
      // Reuse the application-wide singleton — no new connection is created.
      socketInstance = await getSocket();

      // If the socket is unavailable (WS_URL missing, max retries hit, etc.)
      // silently skip — the rest of the page still works without real-time.
      if (!socketInstance || cleanedUp) return;

      // ── Vitals subscription ─────────────────────────────────────────────
      socketInstance.emit("subscribe-patient", patientId);

      // ── Doctor room ─────────────────────────────────────────────────────
      if (doctorId) {
        console.log(`📡 [VitalsSocket] Joining doctor room: doctor_${doctorId}`);
        joinSocketRoom({ role: "doctor", userId: doctorId });
      }

      // ── Event handlers ──────────────────────────────────────────────────
      const onVitalsUpdated = (data: any) => {
        if (data?.patientId === patientId) {
          callbackRef.current(data.vitals);
        }
      };

      const onVitalAlert = (data: any) => {
        console.log("🚨 [VitalsSocket] Vital alert:", data);
        if (data?.severity === "CRITICAL") {
          toast.error(data.message, {
            duration: 10000,
            icon: "🚨",
            style: { background: "#dc2626", color: "#fff", fontWeight: "bold" },
          });
        } else {
          toast.error(data.message, {
            duration: 6000,
            icon: "⚠️",
            style: { background: "#f59e0b", color: "#fff", fontWeight: "bold" },
          });
        }
      };

      socketInstance.on("vitals-updated", onVitalsUpdated);
      socketInstance.on("doctoral_vital_alert", onVitalAlert);

      // Store cleanup handles on the socket ref for teardown.
      (socketInstance as any)._vitalsCleanup = () => {
        socketInstance.off("vitals-updated", onVitalsUpdated);
        socketInstance.off("doctoral_vital_alert", onVitalAlert);
        socketInstance.emit("unsubscribe-patient", patientId);
      };
    };

    setup();

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      cleanedUp = true;
      if (socketInstance?._vitalsCleanup) {
        socketInstance._vitalsCleanup();
        delete socketInstance._vitalsCleanup;
      }
    };
  }, [patientId, doctorId]);
}
