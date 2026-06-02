"use client";

import { useCallback, useSyncExternalStore } from "react";

function getParentDocument() {
  try {
    if (window.parent === window) return null;
    return window.parent.document;
  } catch {
    return null;
  }
}

function subscribeFullscreen(onStoreChange: () => void) {
  document.addEventListener("fullscreenchange", onStoreChange);
  const parentDocument = getParentDocument();
  if (parentDocument && parentDocument !== document) {
    parentDocument.addEventListener("fullscreenchange", onStoreChange);
  }
  return () => {
    document.removeEventListener("fullscreenchange", onStoreChange);
    if (parentDocument && parentDocument !== document) {
      parentDocument.removeEventListener("fullscreenchange", onStoreChange);
    }
  };
}

function getFullscreenSnapshot() {
  const parentDocument = getParentDocument();
  const supported = !!document.documentElement.requestFullscreen || !!parentDocument?.documentElement.requestFullscreen;
  const active = !!document.fullscreenElement || !!parentDocument?.fullscreenElement;
  return `${supported ? 1 : 0}:${active ? 1 : 0}`;
}

function getServerSnapshot() {
  return "0:0";
}

export default function FullscreenButton() {
  const fullscreenState = useSyncExternalStore(
    subscribeFullscreen,
    getFullscreenSnapshot,
    getServerSnapshot
  );
  const [supportedFlag, activeFlag] = fullscreenState.split(":");
  const supported = supportedFlag === "1";
  const isFullscreen = activeFlag === "1";

  const toggle = useCallback(() => {
    const parentDocument = getParentDocument();
    if (parentDocument?.fullscreenElement) {
      parentDocument.exitFullscreen();
      return;
    }
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  }, []);

  if (!supported) return null;

  return (
    <button
      onClick={toggle}
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      style={{
        position: "fixed",
        bottom: "max(1rem, env(safe-area-inset-bottom, 1rem))",
        right: "max(1rem, env(safe-area-inset-right, 1rem))",
        zIndex: 100,
        width: 40, height: 40,
        borderRadius: "50%",
        border: "1px solid rgba(212,175,55,0.2)",
        background: "rgba(0,0,0,0.3)",
        backdropFilter: "blur(8px)",
        color: "rgba(212,175,55,0.6)",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.3s ease",
        padding: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(212,175,55,0.5)";
        e.currentTarget.style.color = "rgba(212,175,55,0.9)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(212,175,55,0.2)";
        e.currentTarget.style.color = "rgba(212,175,55,0.6)";
      }}
    >
      {isFullscreen ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      )}
    </button>
  );
}
