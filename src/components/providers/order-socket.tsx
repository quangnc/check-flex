import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { useAppSelector } from "redux-toolkit";
import { ORDER_SOCKET_URL } from "environment";
import { LocalStorage } from "util/local-storage";
import { LocalStorageKeysConstant } from "constants/storage-keys";

type IContext = {
  socket: WebSocket | null;
  isConnected: boolean;
  serverName: string;
  setComponentCounter: Dispatch<SetStateAction<number>>;
  socketDerivatives: WebSocket | null;
  isDerivativesOrderBookConnected: boolean;
  serverNameDerivatives: string;
  setComponentDerivativesOrderBookCounter: Dispatch<SetStateAction<number>>;
  socketPortfolio: WebSocket | null;
  setComponentPortfolioCounter: Dispatch<SetStateAction<number>>;
  isPortfolioConnected: boolean;
};

const OrderSocketContext = React.createContext<IContext>({
  socket: null,
  isConnected: true,
  serverName: "",
  setComponentCounter: () => {},
  socketDerivatives: null,
  isDerivativesOrderBookConnected: true,
  serverNameDerivatives: "",
  setComponentDerivativesOrderBookCounter: () => {},
  socketPortfolio: null,
  setComponentPortfolioCounter: () => {},
  isPortfolioConnected: true,
});

export const OrderSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [serverName, setServerName] = useState("");
  const [componentCounter, setComponentCounter] = useState(0);
  const [socketDerivatives, setSocketDerivatives] = useState<WebSocket | null>(null);
  const [isDerivativesOrderBookConnected, setIsDerivativesOrderBookConnected] = useState(true);
  const [serverNameDerivatives, setServerNameDerivatives] = useState("");
  const [componentDerivativesOrderBookCounter, setComponentDerivativesOrderBookCounter] =
    useState(0);
  const [isPortfolioConnected, setIsPortfolioConnected] = useState(true);
  const [socketPortfolio, setSocketPortfolio] = useState<WebSocket | null>(null);
  const [componentPortfolioCounter, setComponentPortfolioCounter] = useState(0);
  const userCoreId = useAppSelector(state => state?.user?.userInfo?.activeUserCore?.id);

  const hasSomeOrderBookComponent = componentCounter > 0;
  const hasSomeDerivativesOrderBookComponent = componentDerivativesOrderBookCounter > 0;
  const hasSomePortfolioComponent = componentPortfolioCounter > 0;

  const onMessage = useCallback(
    (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.serverName) {
          setServerName(data.serverName);
        }
      } catch (error) {}
    },
    [socket]
  );

  const onMessageDerivatives = useCallback(
    (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.serverName) {
          setServerNameDerivatives(data.serverName);
        }
      } catch (error) {}
    },
    [socketDerivatives]
  );

  //handle socket order book
  useEffect(() => {
    if (!socket) return;
    const onOpen = () => {
      setIsConnected(true);
    };
    const onClose = () => {
      setIsConnected(false);
      setSocket(null);
    };
    const onError = () => {
      setIsConnected(false);
    };
    const onOnline = () => {
      setSocket(prev => {
        if (prev?.readyState === 1) {
          setIsConnected(true);
          return prev;
        }
        setIsConnected(false);
        return null;
      });
    };
    const onOffline = () => {
      setIsConnected(false);
    };

    let refetchTimeout: any;
    let allowRefetch = false;

    const onVisibilityChange = () => {
      const MILISECONDS_IN_5_MINUTES = 5 * 60 * 1000;
      if (document.visibilityState !== "visible") {
        refetchTimeout = setTimeout(() => {
          allowRefetch = true;
        }, MILISECONDS_IN_5_MINUTES);
        return;
      }
      clearTimeout(refetchTimeout);
      if (allowRefetch) {
        setSocket(prev => {
          if (prev?.readyState === 1) {
            return prev;
          }
          setIsConnected(false);
          return null;
        });
        allowRefetch = false;
      }
    };

    socket.onopen = onOpen;
    socket.onclose = onClose;
    socket.onerror = onError;
    socket.addEventListener("message", onMessage);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      if (socket?.readyState === 1) {
        socket?.close();
        socket?.removeEventListener("message", onMessage);
      }
      if (refetchTimeout) clearTimeout(refetchTimeout);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [socket, userCoreId, hasSomeOrderBookComponent]);

  //handle socket derivative order book
  useEffect(() => {
    if (!socketDerivatives) return;
    const onOpen = () => {
      setIsDerivativesOrderBookConnected(true);
    };
    const onClose = () => {
      setIsDerivativesOrderBookConnected(false);
      setSocketDerivatives(null);
    };
    const onError = () => {
      setIsDerivativesOrderBookConnected(false);
    };
    const onOnline = () => {
      setSocketDerivatives(prev => {
        if (prev?.readyState === 1) {
          setIsDerivativesOrderBookConnected(true);
          return prev;
        }
        setIsDerivativesOrderBookConnected(false);
        return null;
      });
    };
    const onOffline = () => {
      setIsDerivativesOrderBookConnected(false);
    };

    let refetchTimeout: any;
    let allowRefetch = false;

    const onVisibilityChange = () => {
      const MILISECONDS_IN_5_MINUTES = 5 * 60 * 1000;
      if (document.visibilityState !== "visible") {
        refetchTimeout = setTimeout(() => {
          allowRefetch = true;
        }, MILISECONDS_IN_5_MINUTES);
        return;
      }
      clearTimeout(refetchTimeout);
      if (allowRefetch) {
        setSocketDerivatives(prev => {
          if (prev?.readyState === 1) {
            return prev;
          }
          setIsDerivativesOrderBookConnected(false);
          return null;
        });
        allowRefetch = false;
      }
    };

    socketDerivatives.onopen = onOpen;
    socketDerivatives.onclose = onClose;
    socketDerivatives.onerror = onError;
    socketDerivatives.addEventListener("message", onMessageDerivatives);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      if (socketDerivatives?.readyState === 1) {
        socketDerivatives?.close();
        socketDerivatives?.removeEventListener("message", onMessageDerivatives);
      }
      if (refetchTimeout) clearTimeout(refetchTimeout);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [socketDerivatives, userCoreId, hasSomeDerivativesOrderBookComponent]);

  //handle socket portfolio
  useEffect(() => {
    if (!socketPortfolio) return;
    const onOpen = () => {
      setIsPortfolioConnected(true);
    };
    const onClose = () => {
      setSocketPortfolio(null);
      setIsPortfolioConnected(false);
    };
    const onError = () => {
      setIsPortfolioConnected(false);
    };
    const onOnline = () => {
      setSocketPortfolio(prev => {
        if (prev?.readyState === 1) {
          setIsPortfolioConnected(true);
          return prev;
        }
        setIsPortfolioConnected(false);
        return null;
      });
    };
    const onOffline = () => {
      setIsPortfolioConnected(false);
    };

    let refetchTimeout: any;
    let allowRefetch = false;

    const onVisibilityChange = () => {
      const MILISECONDS_IN_5_MINUTES = 5 * 60 * 1000;
      if (document.visibilityState !== "visible") {
        refetchTimeout = setTimeout(() => {
          allowRefetch = true;
        }, MILISECONDS_IN_5_MINUTES);
        return;
      }
      clearTimeout(refetchTimeout);
      if (allowRefetch) {
        setSocketPortfolio(prev => {
          if (prev?.readyState === 1) {
            return prev;
          }
          setIsPortfolioConnected(false);
          return null;
        });
        allowRefetch = false;
      }
    };

    socketPortfolio.onopen = onOpen;
    socketPortfolio.onclose = onClose;
    socketPortfolio.onerror = onError;
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      if (socketPortfolio?.readyState === 1) {
        socketPortfolio?.close();
      }
      if (refetchTimeout) clearTimeout(refetchTimeout);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [socketPortfolio, userCoreId, hasSomePortfolioComponent]);

  useEffect(() => {
    const accessToken = LocalStorage.getItem(LocalStorageKeysConstant.ACCESS_TOKEN);
    if (!socket && userCoreId && accessToken && hasSomeOrderBookComponent) {
      const socketInstance = new WebSocket(
        `${ORDER_SOCKET_URL}/trade-stream/order-update?access_token=${accessToken}&userId=${userCoreId}`
      );
      setSocket(socketInstance);
    }
  }, [socket, userCoreId, hasSomeOrderBookComponent]);

  useEffect(() => {
    const accessToken = LocalStorage.getItem(LocalStorageKeysConstant.ACCESS_TOKEN);
    if (!socketDerivatives && userCoreId && accessToken && hasSomeDerivativesOrderBookComponent) {
      const socketInstance = new WebSocket(
        `${ORDER_SOCKET_URL}/trade-stream/derivative-order-update?access_token=${accessToken}&userId=${userCoreId}`
      );
      setSocketDerivatives(socketInstance);
    }
  }, [socketDerivatives, userCoreId, hasSomeDerivativesOrderBookComponent]);

  useEffect(() => {
    const accessToken = LocalStorage.getItem(LocalStorageKeysConstant.ACCESS_TOKEN);
    if (!socketPortfolio && userCoreId && accessToken && hasSomePortfolioComponent) {
      const socketInstance = new WebSocket(
        `${ORDER_SOCKET_URL}/trade-stream/portfolios?access_token=${accessToken}&userId=${userCoreId}`
      );
      setSocketPortfolio(socketInstance);
    }
  }, [socketPortfolio, userCoreId, hasSomePortfolioComponent]);

  return (
    <OrderSocketContext.Provider
      value={{
        socket,
        isConnected,
        serverName,
        setComponentCounter,
        socketDerivatives,
        isDerivativesOrderBookConnected,
        serverNameDerivatives,
        setComponentDerivativesOrderBookCounter,
        socketPortfolio,
        setComponentPortfolioCounter,
        isPortfolioConnected,
      }}
    >
      {children}
    </OrderSocketContext.Provider>
  );
};

export const useOrderSocketContext = () => {
  return useContext(OrderSocketContext);
};
