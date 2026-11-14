import { apiRequest, getSessionToken } from "./apiClient.ts";

export type RealtimeListener = (event: {
  type: string;
  memberId?: string | null;
  payload?: Record<string, unknown>;
  timestamp: string;
}) => void;

interface SyncStampResponse {
  stamp: {
    members: string;
    subscriptions: string;
    payments: string;
    packages: string;
    services: string;
    attendance: string;
    biometrics: string;
  };
}

class RealtimeSyncClient {
  private listeners = new Set<RealtimeListener>();
  private pollTimer: number | null = null;
  private lastStamp: SyncStampResponse["stamp"] | null = null;
  private running = false;
  private isFetching = false;

  private emit(type: string): void {
    const evt = {
      type,
      memberId: "*",
      timestamp: new Date().toISOString(),
    };
    for (const listener of this.listeners) {
      listener(evt);
    }
  }

  private async checkForUpdates(): Promise<void> {
    if (!this.running || this.isFetching || document.hidden) return;
    if (!getSessionToken()) return;

    this.isFetching = true;
    try {
      const { stamp } = await apiRequest<SyncStampResponse>("/api/sync/stamp");
      if (!this.lastStamp) {
        this.lastStamp = stamp;
        return;
      }

      const map: Array<[keyof SyncStampResponse["stamp"], string]> = [
        ["members", "member:updated"],
        ["subscriptions", "subscription:updated"],
        ["payments", "payment:updated"],
        ["packages", "package:updated"],
        ["services", "service:updated"],
        ["attendance", "attendance:recorded"],
        ["biometrics", "biometric:updated"],
      ];

      for (const [key, eventName] of map) {
        if (this.lastStamp[key] !== stamp[key]) {
          this.emit(eventName);
        }
      }

      this.lastStamp = stamp;
    } catch {
      // Ignore transient network errors; next poll will retry
    } finally {
      this.isFetching = false;
    }
  }

  private handleVisibilityChange = (): void => {
    if (!document.hidden && this.running) {
      void this.checkForUpdates();
    }
  };

  connect(): void {
    if (this.running) return;
    this.running = true;

    void this.checkForUpdates();
    this.pollTimer = window.setInterval(() => {
      void this.checkForUpdates();
    }, 5000);

    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  disconnect(): void {
    this.running = false;
    this.lastStamp = null;
    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
  }
}

export const realtimeClient = new RealtimeSyncClient();
