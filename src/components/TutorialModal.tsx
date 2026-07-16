'use client'

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ShoppingBag, Store, QrCode, MapPin, TrendingUp, Sprout } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';

interface TutorialModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onSkip?: () => void;
  onComplete?: () => void;
  onDontShowAgain?: () => void;
}

const stepIcons: Record<string, React.ReactNode> = {
  browse: <Search className="w-10 h-10 text-emerald-400" />,
  buy: <ShoppingBag className="w-10 h-10 text-emerald-400" />,
  sell: <Store className="w-10 h-10 text-emerald-400" />,
  qr: <QrCode className="w-10 h-10 text-emerald-400" />,
  savedPlaces: <MapPin className="w-10 h-10 text-emerald-400" />,
  marketData: <TrendingUp className="w-10 h-10 text-emerald-400" />,
};

export default function TutorialModal({
  open,
  onOpenChange,
  onSkip,
  onComplete,
  onDontShowAgain,
}: TutorialModalProps) {
  const { t } = useTranslation(['tutorial', 'common']);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  const stepKeys = ['browse', 'buy', 'sell', 'qr', 'savedPlaces', 'marketData'] as const;

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  useEffect(() => {
    if (open) {
      setStarted(false);
      api?.scrollTo(0);
    }
  }, [open, api]);

  const handleStart = useCallback(() => {
    setStarted(true);
    api?.scrollNext();
  }, [api]);

  const handleSkip = useCallback(() => {
    onSkip?.();
    onOpenChange?.(false);
  }, [onSkip, onOpenChange]);

  const handleComplete = useCallback(() => {
    onComplete?.();
    onOpenChange?.(false);
  }, [onComplete, onOpenChange]);

  const handleDontShowAgain = useCallback(() => {
    onDontShowAgain?.();
    onOpenChange?.(false);
  }, [onDontShowAgain, onOpenChange]);

  const isWelcomeSlide = !started || current === 0;
  const isLastStep = current === count - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md border-white/10 bg-zinc-950 text-white"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <Sprout className="h-8 w-8 text-emerald-400" />
          </div>
          <DialogTitle className="text-xl">{t('welcomeTitle')}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {t('welcomeSubtitle')}
          </DialogDescription>
        </DialogHeader>

        <Carousel setApi={setApi} opts={{ align: 'start', containScroll: false }} className="w-full">
          <CarouselContent>
            <CarouselItem>
              <div className="flex flex-col items-center gap-4 px-2 py-4 text-center">
                <p className="text-sm text-zinc-300">
                  {t('welcomeSubtitle')}
                </p>
              </div>
            </CarouselItem>

            {stepKeys.map((key) => (
              <CarouselItem key={key}>
                <div className="flex flex-col items-center gap-4 px-2 py-6 text-center">
                  <div className="rounded-2xl bg-emerald-500/10 p-4">
                    {stepIcons[key]}
                  </div>
                  <h3 className="text-lg font-semibold">
                    {t(`steps.${key}.title`)}
                  </h3>
                  <p className="text-sm text-zinc-300">
                    {t(`steps.${key}.description`)}
                  </p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {started && (
            <>
              <CarouselPrevious label={t('common:actions.previous')} className="left-0 border-white/10 bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white disabled:opacity-30" />
              <CarouselNext label={t('common:actions.next')} className="right-0 border-white/10 bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white disabled:opacity-30" />
            </>
          )}
        </Carousel>

        <div className="flex justify-center gap-1.5 py-2">
          {Array.from({ length: count }).map((_, i) => (
            <span
              key={i}
              className={`block h-1.5 rounded-full transition-all ${
                i === current ? 'w-4 bg-emerald-400' : 'w-1.5 bg-zinc-700'
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-col-reverse">
          {isWelcomeSlide ? (
            <Button onClick={handleStart} className="w-full bg-emerald-500 text-black hover:bg-emerald-600">
              {t('startTour')}
            </Button>
          ) : (
            <Button
              onClick={isLastStep ? handleComplete : () => api?.scrollNext()}
              className="w-full bg-emerald-500 text-black hover:bg-emerald-600"
            >
              {isLastStep ? t('finish') : t('next')}
            </Button>
          )}

          <div className="flex w-full gap-2">
            <Button variant="outline" onClick={handleSkip} className="flex-1 border-white/10 bg-transparent text-white hover:bg-white/5">
              {t('skip')}
            </Button>
            <Button variant="ghost" onClick={handleDontShowAgain} className="flex-1 text-zinc-400 hover:bg-white/5 hover:text-white">
              {t('dontShowAgain')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
