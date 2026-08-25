import type { Metadata } from "next";
import GuestExperienceQuestionnaire from "@/components/rinwa/GuestExperienceQuestionnaire";

export const metadata: Metadata = {
  title: "Rate Tonight",
  description:
    "Tell RÌNWÁ how tonight felt, not just how it ran. Five quick questions, under two minutes.",
};

export default function ExperiencePage() {
  return <GuestExperienceQuestionnaire />;
}
