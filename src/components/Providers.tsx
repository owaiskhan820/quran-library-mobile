"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { AuthProvider } from "@/context/AuthContext";
import { hydrateManifest } from "@/lib/offline/manifest";
import DownloadProgressIndicator from "@/components/offline/DownloadProgressIndicator";

function NativeChromeSetup() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

    if (Capacitor.getPlatform() === "android") {
      document.documentElement.style.setProperty("--safe-area-inset-top", "32px");
    }

    // Intercept Android hardware back button to navigate history or exit
    let backButtonSub: any = null;
    const initBackButton = async () => {
      const { App } = await import("@capacitor/app");
      backButtonSub = await App.addListener("backButton", (data) => {
        const overlays = (window as any).__activeOverlays || [];
        if (overlays.length > 0) {
          const closeFn = overlays.pop();
          if (closeFn) {
            closeFn();
            return;
          }
        }

        if (data.canGoBack) {
          window.history.back();
        } else {
          App.exitApp();
        }
      });
    };

    if (Capacitor.getPlatform() === "android") {
      initBackButton();
    }

    return () => {
      if (backButtonSub) {
        backButtonSub.remove();
      }
    };
  }, []);

  return null;
}

function OfflineManifestSetup() {
  // Hydrates the in-memory offline-content lookup caches from disk once at
  // boot, so audio/translation/tafsir resolution can do synchronous checks
  // instead of hitting Filesystem on every playback/read.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    hydrateManifest().catch((err) => {
      console.error("Failed to hydrate offline manifest:", err);
    });
  }, []);

  return null;
}

function GlobalErrorAlerts() {
  // Without adb/logcat access during on-device testing, uncaught errors and
  // rejected promises would otherwise fail completely silently in the WebView.
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      alert(`Uncaught error: ${event.message}`);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
      alert(`Unhandled promise rejection: ${reason}`);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}

export function Providers({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <NativeChromeSetup />
      <OfflineManifestSetup />
      <GlobalErrorAlerts />
      <DownloadProgressIndicator />
      {children}
    </AuthProvider>
  );
}
