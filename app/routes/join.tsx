import { useParams } from "react-router";
import { JoinPage } from "../../src/modules/classroom";

export function meta() {
  return [{ title: "Unterricht beitreten" }];
}

/** Where students enter a join code; the QR code and join links lead here. */
export default function JoinRoute() {
  const { code = "" } = useParams();
  return <JoinPage initialCode={code} coursesPath="/courses" />;
}
