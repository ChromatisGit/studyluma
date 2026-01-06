import { LayoutGrid, GraduationCap, Network, LucideIcon } from "lucide-react";
import HOMEPAGE_TEXT from "@features/homepage/homepage.de.json";

export interface AboutGoal {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const goalsText = HOMEPAGE_TEXT.about.goals;

export const aboutGoals: AboutGoal[] = [
  {
    id: 'clear-structure',
    icon: LayoutGrid,
    title: goalsText.clearStructure.title,
    description: goalsText.clearStructure.description,
  },
  {
    id: 'for-students',
    icon: GraduationCap,
    title: goalsText.forStudents.title,
    description: goalsText.forStudents.description,
  },
  {
    id: 'connected-knowledge',
    icon: Network,
    title: goalsText.connectedKnowledge.title,
    description: goalsText.connectedKnowledge.description,
  },
];
