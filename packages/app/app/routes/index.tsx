import { Navigate } from "react-router";

/** The website starts in the established course UI. */
export default function Index() {
  return <Navigate to="/courses" replace />;
}
