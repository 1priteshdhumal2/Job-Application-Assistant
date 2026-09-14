import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export function ProtectedRoute(): React.ReactElement {
  const { status } = useAuth();

  if (status !== "AUTHENTICATED") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
