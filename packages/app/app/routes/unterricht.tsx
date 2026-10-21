import { CalmView, LiveBanners, useSite } from "../../src/modules/classroom";
import { StudentLive, useSheetPath } from "../StudentLive";

export function meta() {
  return [{ title: "Unterricht" }];
}

function Calm() {
  const sheetPath = useSheetPath();
  return <CalmView sheetPath={sheetPath} coursesPath="/courses" />;
}

/** Where a student device rests during a lesson; no shell, no course navigation. */
export default function UnterrichtRoute() {
  const site = useSite();
  return (
    <StudentLive enabled={site.viewer === "student"}>
      <LiveBanners />
      <Calm />
    </StudentLive>
  );
}
