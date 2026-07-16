'use client';

import { useOnboarding } from '@/hooks/useOnboarding';
import TutorialModal from '@/components/TutorialModal';

export default function TutorialModalWrapper() {
  const { showTutorial, closeTutorial, skipTour, completeTour, dontShowAgain } = useOnboarding();
  return (
    <TutorialModal
      open={showTutorial}
      onOpenChange={closeTutorial}
      onSkip={skipTour}
      onComplete={completeTour}
      onDontShowAgain={dontShowAgain}
    />
  );
}
