import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import "./index.css";
import App from "./App.jsx";
import Home from "./pages/Home.jsx";
import Explore from "./pages/Explore.jsx";
import EditCourses from "./pages/EditCourses.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "explore", element: <Explore /> },
      { path: "edit-courses", element: <EditCourses /> },
    ],
  },
]);

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const hasClerkKey = typeof clerkPublishableKey === "string" && clerkPublishableKey.trim().length > 0;

if (!hasClerkKey) {
  console.error("Missing VITE_CLERK_PUBLISHABLE_KEY. App cannot start Clerk authentication.");
}

function ConfigErrorScreen() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#0b1220",
        color: "#e2e8f0",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <section style={{ maxWidth: "720px", lineHeight: 1.5 }}>
        <h1 style={{ margin: "0 0 12px" }}>Configuration Error</h1>
        <p style={{ margin: "0 0 8px" }}>
          Missing <code>VITE_CLERK_PUBLISHABLE_KEY</code> in the frontend environment.
        </p>
        <p style={{ margin: 0 }}>
          Add the key in Cloudflare Pages environment variables for this project and redeploy.
        </p>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {hasClerkKey ? (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <RouterProvider router={router} />
      </ClerkProvider>
    ) : (
      <ConfigErrorScreen />
    )}
  </StrictMode>,
);
