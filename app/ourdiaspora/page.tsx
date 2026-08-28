import type { Metadata } from "next";
import Questions from "@/components/rinwa/TravelQuestionnaire";

export const metadata: Metadata = {
  title: "Diaspora Check-In",
  description:
    "Coming home to Lagos this holiday, or still making plans? Tell RÌNWÁ what would make it easier.",
};

export default function OurDiasporaPage() {
  return <Questions />;
}
