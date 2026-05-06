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
  console.error(
    "Missing VITE_CLERK_PUBLISHABLE_KEY. Rendering app without ClerkProvider to avoid blank screen.",
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {hasClerkKey ? (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <RouterProvider router={router} />
      </ClerkProvider>
    ) : (
      <RouterProvider router={router} />
    )}
  </StrictMode>,
);
