import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { SOCKET_URL } from "environment";
import { SocketTopic, SocketType } from "types/socket";
import { difference, isEqual } from "lodash";

type IComponent = {
  topic: SocketTopic;
  variables: any;
};

type IContext = {
  socket: WebSocket | null;
  isConnected: boolean;
  addComponent: (component: IComponent) => void;
  removeComponent: (component: IComponent) => void;
};

const SocketContext = React.createContext<IContext>({
  socket: null,
  isConnected: false,
  addComponent: () => {},
  removeComponent: () => {},
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [components, setComponents] = useState<IComponent[]>([]);
  const numberOfRetries = useRef(0);

  useEffect(() => {
    if (!socket) return;
    const onOpen = () => {
      numberOfRetries.current = 0;
      setIsConnected(true);
    };
    const onClose = () => {
      setIsConnected(false);
      setSocket(null);
      setComponents([]);
    };
    const onError = () => {
      setIsConnected(false);
    };
    const onOnline = async () => {
      setSocket(prev => {
        if (prev?.readyState === 1) {
          setIsConnected(true);
          return prev;
        }
        setComponents([]);
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
          setComponents([]);
          setIsConnected(false);
          return null;
        });
        allowRefetch = false;
      }
    };

    socket.onopen = onOpen;
    socket.onclose = onClose;
    socket.onerror = onError;
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      if (socket?.readyState === 1) socket?.close();
      if (refetchTimeout) clearTimeout(refetchTimeout);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) {
      try {
        const socketInstance = new WebSocket(SOCKET_URL);
        setSocket(socketInstance);
      } catch (error) {}
    }
  }, [socket]);

  const addComponent = useCallback(
    (component: IComponent) => {
      if (!socket || !isConnected) return;
      if (Array.isArray(component.variables)) {
        component = { ...component, variables: component.variables.sort() };
      }
      setComponents(prev => {
        const newComponents = [...prev];
        if (Array.isArray(component.variables)) {
          let existVariables = [];
          newComponents.forEach(el => {
            if (el.topic === component.topic && Array.isArray(el.variables)) {
              el.variables.forEach(variable => {
                if (!existVariables.includes(variable)) existVariables.push(variable);
              });
            }
          });
          const diffVariables = difference(component.variables, existVariables);
          if (diffVariables.length > 0) {
            socket.send(
              JSON.stringify({
                type: SocketType.SUBSCRIBE,
                topic: component.topic,
                variables: diffVariables,
              })
            );
          }
        } else {
          const foundAddIndex = prev.findIndex(el => isEqualComponent(el, component));
          if (foundAddIndex === -1) {
            socket.send(
              JSON.stringify({
                type: SocketType.SUBSCRIBE,
                topic: component.topic,
                variables: component.variables,
              })
            );
          }
        }
        newComponents.push({ topic: component.topic, variables: component.variables });
        return newComponents;
      });
    },
    [socket, isConnected]
  );

  const removeComponent = useCallback(
    (component: IComponent) => {
      if (!socket || !isConnected || socket.readyState !== 1) return;
      if (Array.isArray(component.variables)) {
        component = { ...component, variables: component.variables.sort() };
      }

      setComponents(prev => {
        const newComponents = [...prev];
        const foundIndex = prev.findIndex(el => isEqualComponent(el, component));
        if (foundIndex === -1) return prev;
        newComponents.splice(foundIndex, 1);
        if (Array.isArray(component.variables)) {
          let existVariables = [];
          newComponents.forEach(el => {
            if (el.topic === component.topic && Array.isArray(el.variables)) {
              el.variables.forEach(variable => {
                if (!existVariables.includes(variable)) existVariables.push(variable);
              });
            }
          });
          const diffVariables = difference(component.variables, existVariables);
          if (diffVariables.length > 0) {
            socket?.send(
              JSON.stringify({
                type: SocketType.UNSUBSCRIBE,
                topic: component.topic,
                variables: diffVariables,
              })
            );
          }
        } else {
          const existComponents = newComponents.filter(el => isEqualComponent(el, component));
          if (existComponents.length === 0) {
            socket?.send(
              JSON.stringify({
                type: SocketType.UNSUBSCRIBE,
                topic: component.topic,
                variables: component.variables,
              })
            );
          }
        }
        return newComponents;
      });
    },
    [socket, isConnected]
  );

  const isEqualComponent = useCallback(
    (val: IComponent, other: IComponent) =>
      val.topic === other.topic && isEqual(val.variables, other.variables),
    []
  );

  return (
    <SocketContext.Provider value={{ socket, isConnected, addComponent, removeComponent }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => {
  return useContext(SocketContext);
};
