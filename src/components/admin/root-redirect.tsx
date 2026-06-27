import { Navigate } from "react-router";
import { getHomePath, getLoginPath, hasStoredAuth } from "@/lib/authSession";

/** Root `/` → login when anonymous, `/home` when authenticated. */
export function RootRedirect() {
  return (
    <Navigate to={hasStoredAuth() ? getHomePath() : getLoginPath()} replace />
  );
}
