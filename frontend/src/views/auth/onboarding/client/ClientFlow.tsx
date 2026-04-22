"use client";

import { useOnboardingStore } from "@/features/onboarding/model";
import { StepTransition } from "../StepTransition";
import { ProgressStepper } from "../ProgressStepper";
import { StepNameCompany } from "./StepNameCompany";
import { StepAvatarUpload } from "./StepAvatarUpload";
import { StepDescription } from "./StepDescription";
import { StepBalance } from "./StepBalance";

export const CLIENT_STEPS = ["Имя", "Аватар", "Описание", "Баланс"];

type Props = {
  onFinish: () => void;
  isFinishing: boolean;
};

export const ClientFlow = ({ onFinish, isFinishing }: Props) => {
  const { step, direction } = useOnboardingStore();
  const flowStep = step;

  const renderStep = () => {
    switch (flowStep) {
      case 1:
        return <StepNameCompany />;
      case 2:
        return <StepAvatarUpload />;
      case 3:
        return <StepDescription />;
      case 4:
        return <StepBalance onFinish={onFinish} isFinishing={isFinishing} />;
      default:
        return <StepNameCompany />;
    }
  };

  return (
    <>
      <div className="mb-8">
        <ProgressStepper steps={CLIENT_STEPS} currentStep={flowStep} />
      </div>
      <StepTransition stepKey={flowStep} direction={direction}>
        {renderStep()}
      </StepTransition>
    </>
  );
};
