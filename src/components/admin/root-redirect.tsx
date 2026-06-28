import { Navigate } from "react-router";
import { getLoginPath } from "@/lib/authSession";

/** Root `/` always opens login; stored sessions are restored there. */
export function RootRedirect() {
  return <Navigate to={getLoginPath()} replace />;
}
