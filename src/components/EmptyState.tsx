'use client'

import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-zinc-500" />
        </div>
      )}
      <h3 className="text-base font-medium text-white mb-1">{title}</h3>
      {description && <p className="text-sm text-zinc-500 max-w-sm mb-4">{description}</p>}
      {action && (
        <Button onClick={action.onClick} variant="outline" size="sm" className="border-white/10 hover:bg-white/5">
          {action.label}
        </Button>
      )}
    </div>
  );
}
