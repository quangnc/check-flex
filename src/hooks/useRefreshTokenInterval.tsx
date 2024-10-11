import { useEffect, useRef, useState } from "react";

const REFRESH_INTERVAL_DEFAULT: number = 1000 * 60 * 60;

const monitoredEvents: string[] = [
  "mousedown",
  "mousemove",
  "wheel",
  "keydown",
  "touchstart",
  "scroll",
];

const addEventListeners = (events: string[], callback: () => void) => {
  events.forEach(event => window.addEventListener(event, callback, { capture: true }));

  return () => {
    events.forEach(event => window.removeEventListener(event, callback, { capture: false }));
  };
};

const AuthenticationService = {
  refresh: (_key: string, callback: () => void) => {
    setTimeout(callback, 3000);
  },
};

export const useRefreshTokenInterval = (
  isActiveAccount: boolean,
  interval: number = REFRESH_INTERVAL_DEFAULT
) => {
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const intervalRef = useRef(null);
  const unlistenRef = useRef(null);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    const cleanup = () => {
      clearInterval(intervalRef.current);
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };

    if (!isActiveAccount) {
      cleanup();
      setIsTokenExpired(true);
      return;
    }

    const refreshTokenInterval = initial => {
      // TODO: Remove log then testing
      console.log("Inactive, clearing interval, not refreshing token", Date());
      if (!initial && !wasActiveRef.current) {
        cleanup();
        setIsTokenExpired(true);
        return;
      }

      try {
        // TODO: Remove log then testing
        console.log("Attempting token refresh", Date());
        AuthenticationService.refresh(null, () => {
          setIsTokenExpired(false);
        });
      } catch (error) {
        console.error(error);
      } finally {
        wasActiveRef.current = false;
      }
    };

    refreshTokenInterval(true);
    intervalRef.current = setInterval(refreshTokenInterval, interval);
    unlistenRef.current = addEventListeners(monitoredEvents, () => {
      wasActiveRef.current = true;
    });

    return cleanup;
  }, [isActiveAccount, interval]);

  return isTokenExpired;
};
