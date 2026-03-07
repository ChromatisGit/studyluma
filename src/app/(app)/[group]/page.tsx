import { redirect } from "next/navigation";

// Group overview is deprecated — redirect to Student Home
export default function GroupOverviewPage() {
  redirect("/");
}
