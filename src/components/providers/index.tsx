import { SocketProvider } from "./socket";
import { Provider } from "react-redux";
import { persistor, store } from "redux-toolkit";
import { LayoutProvider } from "./layout";
import { PersistGate } from "redux-persist/integration/react";

export default function AppProvider({ children }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <LayoutProvider>
          <SocketProvider>{children}</SocketProvider>
        </LayoutProvider>
      </PersistGate>
    </Provider>
  );
}
