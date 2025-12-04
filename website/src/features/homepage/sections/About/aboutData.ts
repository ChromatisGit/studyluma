import { LayoutGrid, GraduationCap, Network, LucideIcon } from "lucide-react";
import HOMEPAGE_COPY from "@features/homepage/homepage.de.json";

export interface AboutGoal {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const goalsCopy = HOMEPAGE_COPY.about.goals;

export const aboutGoals: AboutGoal[] = [
  {
    id: 'clear-structure',
    icon: LayoutGrid,
    title: goalsCopy.clearStructure.title,
    description: goalsCopy.clearStructure.description,
  },
  {
    id: 'for-students',
    icon: GraduationCap,
    title: goalsCopy.forStudents.title,
    description: goalsCopy.forStudents.description,
  },
  {
    id: 'connected-knowledge',
    icon: Network,
    title: goalsCopy.connectedKnowledge.title,
    description: goalsCopy.connectedKnowledge.description,
  },
];
