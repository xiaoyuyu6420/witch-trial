"use client";

import { useCallback, useSyncExternalStore } from "react";

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitCurrentFullScreenElement?: Element | null;
  webkitIsFullScreen?: boolean;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitCancelFullScreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitRequestFullScreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

function getParentDocument() {
  try {
    if (window.parent === window) return null;
    return window.parent.document;
  } catch {
    return null;
  }
}

function getFullscreenElement(doc: Document) {
  const fullscreenDoc = doc as FullscreenDocument;
  return fullscreenDoc.fullscreenElement ||
    fullscreenDoc.webkitFullscreenElement ||
    fullscreenDoc.webkitCurrentFullScreenElement ||
    fullscreenDoc.mozFullScreenElement ||
    fullscreenDoc.msFullscreenElement ||
    (fullscreenDoc.webkitIsFullScreen ? fullscreenDoc.documentElement : null);
}

function requestFullscreen(el: HTMLElement) {
  const fullscreenEl = el as FullscreenElement;
  const request = fullscreenEl.requestFullscreen ||
    fullscreenEl.webkitRequestFullscreen ||
    fullscreenEl.webkitRequestFullScreen ||
    fullscreenEl.mozRequestFullScreen ||
    fullscreenEl.msRequestFullscreen;
  return request?.call(fullscreenEl);
}

function exitFullscreen(doc: Document) {
  const fullscreenDoc = doc as FullscreenDocument;
  const exit = fullscreenDoc.exitFullscreen ||
    fullscreenDoc.webkitExitFullscreen ||
    fullscreenDoc.webkitCancelFullScreen ||
    fullscreenDoc.mozCancelFullScreen ||
    fullscreenDoc.msExitFullscreen;
  return exit?.call(fullscreenDoc);
}

function subscribeFullscreen(onStoreChange: () => void) {
  document.addEventListener("fullscreenchange", onStoreChange);
  document.addEventListener("webkitfullscreenchange", onStoreChange);
  document.addEventListener("mozfullscreenchange", onStoreChange);
  document.addEventListener("MSFullscreenChange", onStoreChange);
  const parentDocument = getParentDocument();
  if (parentDocument && parentDocument !== document) {
    parentDocument.addEventListener("fullscreenchange", onStoreChange);
    parentDocument.addEventListener("webkitfullscreenchange", onStoreChange);
    parentDocument.addEventListener("mozfullscreenchange", onStoreChange);
    parentDocument.addEventListener("MSFullscreenChange", onStoreChange);
  }
  return () => {
    document.removeEventListener("fullscreenchange", onStoreChange);
    document.removeEventListener("webkitfullscreenchange", onStoreChange);
    document.removeEventListener("mozfullscreenchange", onStoreChange);
    document.removeEventListener("MSFullscreenChange", onStoreChange);
    if (parentDocument && parentDocument !== document) {
      parentDocument.removeEventListener("fullscreenchange", onStoreChange);
      parentDocument.removeEventListener("webkitfullscreenchange", onStoreChange);
      parentDocument.removeEventListener("mozfullscreenchange", onStoreChange);
      parentDocument.removeEventListener("MSFullscreenChange", onStoreChange);
    }
  };
}

function getFullscreenSnapshot() {
  const parentDocument = getParentDocument();
  const supported = !!(
    document.documentElement.requestFullscreen ||
    (document.documentElement as FullscreenElement).webkitRequestFullscreen ||
    (document.documentElement as FullscreenElement).webkitRequestFullScreen ||
    (document.documentElement as FullscreenElement).mozRequestFullScreen ||
    (document.documentElement as FullscreenElement).msRequestFullscreen ||
    parentDocument?.documentElement.requestFullscreen ||
    (parentDocument?.documentElement as FullscreenElement | undefined)?.webkitRequestFullscreen ||
    (parentDocument?.documentElement as FullscreenElement | undefined)?.webkitRequestFullScreen ||
    (parentDocument?.documentElement as FullscreenElement | undefined)?.mozRequestFullScreen ||
    (parentDocument?.documentElement as FullscreenElement | undefined)?.msRequestFullscreen
  );
  const active = !!getFullscreenElement(document) || !!(parentDocument && getFullscreenElement(parentDocument));
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
    if (parentDocument && getFullscreenElement(parentDocument)) {
      exitFullscreen(parentDocument);
      return;
    }
    if (getFullscreenElement(document)) {
      exitFullscreen(document);
    } else {
      requestFullscreen(document.documentElement);
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
