import "./App.css";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { setAuthTokenProvider } from "./lib/api";

const CLERK_JWT_TEMPLATE = "ds-backend";

function AuthSync() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenProvider(() => getToken({ template: CLERK_JWT_TEMPLATE }));
    return () => setAuthTokenProvider(null);
  }, [getToken]);

  return null;
}

function App() {
  return (
    <>
      <AuthSync />
      <Outlet />
    </>
  );
}

export default App;
