import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const ONBOARDING_STORAGE_KEY = 'roots-onboarding-completed';

export interface OnboardingStatus {
  completed?: boolean;
  skipped?: boolean;
  steps?: Record<string, boolean>;
  dontShowAgain?: boolean;
}

interface UseOnboardingReturn {
  isOnboarding: boolean;
  showTutorial: boolean;
  openTutorial: () => void;
  closeTutorial: () => void;
  startTour: () => void;
  skipTour: () => void;
  completeStep: (step: string) => void;
  completeTour: () => void;
  dontShowAgain: () => void;
}

function getLocalCompleted(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function setLocalCompleted(completed: boolean) {
  try {
    if (completed) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    }
  } catch {
    // localStorage may be unavailable in restricted contexts.
  }
}

export function useOnboarding(): UseOnboardingReturn {
  const { user, refreshProfile, freshSignup, acknowledgeFreshSignup } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const status = (user?.onboarding_status ?? {}) as OnboardingStatus;
  const isProfileEmpty = !status || Object.keys(status).length === 0;
  const shouldShowTutorial = user
    ? (isProfileEmpty || (!status.completed && !status.skipped && !status.dontShowAgain))
    : false;

  // Auto-open for fresh users when onboarding_status is empty or after a fresh signup.
  useEffect(() => {
    if (!user) return;
    if (freshSignup) {
      setIsOpen(true);
      acknowledgeFreshSignup();
      return;
    }
    if (isProfileEmpty && !getLocalCompleted()) {
      setIsOpen(true);
    }
  }, [user, isProfileEmpty, freshSignup, acknowledgeFreshSignup]);

  const updateStatus = useCallback(async (patch: Partial<OnboardingStatus>) => {
    if (!user) return;
    const next: OnboardingStatus = {
      ...status,
      ...patch,
      steps: {
        ...status.steps,
        ...patch.steps,
      },
    };
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_status: next })
        .eq('id', user.id);
      if (error) {
        logger.warn('Failed to update onboarding_status', { error: error.message });
        return;
      }
      await refreshProfile();
    } catch (err) {
      logger.warn('update onboarding_status threw', { error: err instanceof Error ? err.message : String(err) });
    }
  }, [user, status, refreshProfile]);

  const openTutorial = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeTutorial = useCallback(() => {
    setIsOpen(false);
  }, []);

  const startTour = useCallback(() => {
    setIsOpen(true);
  }, []);

  const skipTour = useCallback(() => {
    setIsOpen(false);
    updateStatus({ skipped: true });
  }, [updateStatus]);

  const completeStep = useCallback((step: string) => {
    updateStatus({ steps: { [step]: true } });
  }, [updateStatus]);

  const completeTour = useCallback(() => {
    setIsOpen(false);
    updateStatus({ completed: true });
    setLocalCompleted(true);
  }, [updateStatus]);

  const dontShowAgain = useCallback(() => {
    setIsOpen(false);
    updateStatus({ dontShowAgain: true, completed: true });
    setLocalCompleted(true);
  }, [updateStatus]);

  return {
    isOnboarding: shouldShowTutorial,
    showTutorial: isOpen,
    openTutorial,
    closeTutorial,
    startTour,
    skipTour,
    completeStep,
    completeTour,
    dontShowAgain,
  };
}
