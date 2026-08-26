Using Node.js 20, Next.js 15, React 19, TypeScript 5, and Tailwind CSS v3.4.

Tailwind CSS has been set up with the shadcn theme.

Setup complete: /mnt/agents/output/app

Components (40+):
  accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb,
  button-group, button, calendar, card, carousel, chart, checkbox, collapsible,
  command, context-menu, dialog, drawer, dropdown-menu, empty, field, form,
  hover-card, input-group, input-otp, input, item, kbd, label, menubar,
  navigation-menu, pagination, popover, progress, radio-group, resizable,
  scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner,
  spinner, switch, table, tabs, textarea, toggle-group, toggle, tooltip

Usage:
  import { Button } from '@/components/ui/button'
  import { Card, CardHeader, CardTitle } from '@/components/ui/card'

Structure:
  src/app/           Next.js App Router pages
  src/page-components/ Page-level client components
  src/components/    Shared & feature UI components
  src/hooks/         Custom hooks
  src/lib/           Utilities, API clients, validation
  src/types/         Type definitions
  src/app/globals.css Global styles
  tailwind.config.js Configures Tailwind's theme, plugins, etc.
  next.config.ts     Next.js configuration
  postcss.config.js  Config file for CSS post-processing tools
