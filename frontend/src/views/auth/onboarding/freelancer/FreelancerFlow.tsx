"use client";

import { useOnboardingStore } from "@/features/onboarding/model";
import { StepTransition } from "../StepTransition";
import { ProgressStepper } from "../ProgressStepper";
import { StepName } from "./StepName";
import { StepExperience } from "./StepExperience";
import { StepContacts } from "./StepContacts";
import { StepSkills } from "./StepSkills";
import { StepPortfolio } from "./StepPortfolio";
import { StepRate } from "./StepRate";
import { StepWelcomeTemplate } from "./StepWelcomeTemplate";

export const FREELANCER_STEPS = [
  "Имя",
  "Опыт",
  "Контакты",
  "Навыки",
  "Портфолио",
  "Ставка",
  "Отклик",
];

type Props = {
  onFinish: (redirectTo?: string) => void;
  isFinishing: boolean;
};

export const FreelancerFlow = ({ onFinish, isFinishing }: Props) => {
  const { step, direction } = useOnboardingStore();
  // step 1..7 in flow
  const flowStep = step;

  const renderStep = () => {
    switch (flowStep) {
      case 1:
        return <StepName />;
      case 2:
        return <StepExperience />;
      case 3:
        return <StepContacts />;
      case 4:
        return <StepSkills />;
      case 5:
        return <StepPortfolio />;
      case 6:
        return <StepRate />;
      case 7:
        return <StepWelcomeTemplate onFinish={onFinish} isFinishing={isFinishing} />;
      default:
        return <StepName />;
    }
  };

  return (
    <>
      <div className="mb-8">
        <ProgressStepper steps={FREELANCER_STEPS} currentStep={flowStep} />
      </div>
      <StepTransition stepKey={flowStep} direction={direction}>
        {renderStep()}
      </StepTransition>
    </>
  );
};
