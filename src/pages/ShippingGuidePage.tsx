import { useState, useEffect, useCallback } from 'react';
import { Check, ChevronDown, Package, Leaf, Printer, RotateCcw, Truck, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'shipping-guide-progress';

interface Step {
  id: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  details: string[];
  tips: string[];
}

const STEPS: Step[] = [
  {
    id: 1,
    icon: <Package className="w-5 h-5" />,
    title: 'Gather Materials',
    description: 'Before you touch the plant, make sure you have everything ready. Thai heat means speed matters — you do not want the plant sitting half-packed while you hunt for tape.',
    details: [
      'Sphagnum moss (damp, not soaking) — the gold standard for root hydration during transit',
      'Plastic wrap or zip-lock bags — seal moisture in, keep roots happy',
      'Rubber bands or twine — secure wraps without crushing stems',
      'Sturdy cardboard box — plant should not touch any wall; 5cm cushion minimum on all sides',
      'Packing peanuts, crumpled newspaper, or bubble wrap — fill every gap so nothing shifts',
      'Strong packing tape — the H-pattern taping method prevents box failure',
      '"FRAGILE — LIVE PLANTS" labels — make it obvious to handlers',
      'Bamboo skewers or plant stakes — prevent stem breakage in transit',
    ],
    tips: [
      'Buy moss in advance from Shopee/Lazada garden shops — it is cheaper than nurseries',
      'Save boxes from your own plant deliveries — they are already sized right',
      'If shipping aroid cuttings, pre-cut moss squares (10x10cm) to speed up packing',
    ],
  },
  {
    id: 2,
    icon: <Leaf className="w-5 h-5" />,
    title: 'Prepare the Plant',
    description: 'A well-prepped plant survives 3-day shipping across Thailand. A rushed plant dies in Bangkok traffic. Take your time here.',
    details: [
      'Water the plant 2 days before shipping — not the day of. Wet soil + sealed box = root rot.',
      'Remove dead, yellowing, or damaged leaves — reduces stress and weight',
      'For bare-root shipping (recommended for aroids, hoyas, orchids):',
      '  – Gently remove the plant from its pot',
      '  – Shake off loose soil, rinse roots gently with room-temperature water',
      '  – Trim any mushy or dead roots with clean scissors',
      'For potted shipping (cacti, succulents, established plants):',
      '  – Secure soil surface with plastic wrap around the pot',
      '  – Tape the wrap to prevent spillage — Thai couriers are not gentle',
    ],
    tips: [
      'Take a clear photo of the plant before packing — insurance for disputes',
      'For variegated plants, mark which side faced the light so buyer knows',
      'If roots are long, coil them loosely — do not fold or crimp',
    ],
  },
  {
    id: 3,
    icon: <ShieldCheck className="w-5 h-5" />,
    title: 'Protect the Roots',
    description: 'Roots are the plant lifeline during shipping. In Thailand\'s heat, dry roots die in hours. Keep them hydrated but not waterlogged.',
    details: [
      'Take a generous handful of damp sphagnum moss — squeeze until a few drops come out',
      'Wrap the moss completely around the root ball or bare roots',
      'Seal the moss wrap inside a plastic bag or cling film',
      'Secure with a rubber band — tight enough to hold, loose enough to not damage',
      'For potted plants: wrap the entire pot in plastic, tape the top soil layer',
      'Double-bag if shipping during Songkran or rainy season — humidity is your enemy',
    ],
    tips: [
      'Add a drop of hydrogen peroxide to the moss water — prevents mold in sealed bags',
      'For long transits (south to north Thailand), use slightly more moss',
      'Label the bag "ROOTS — KEEP MOIST" so buyer knows not to discard it',
    ],
  },
  {
    id: 4,
    icon: <Truck className="w-5 h-5" />,
    title: 'Secure the Plant',
    description: 'Stems break. Leaves tear. Thai courier vans bounce. Your job is to make the plant immobile inside the box.',
    details: [
      'Insert bamboo skewers or stakes into the soil alongside the stem',
      'Gently tie the stem to the stake with soft plant tie or twine — not wire',
      'Wrap delicate leaves in soft tissue paper — prevents bruising and drying',
      'For trailing plants (pothos, hoyas): coil vines loosely and secure with paper loops',
      'For tall plants: add a second stake crossing the first — creates a cage',
      'Cover the entire plant with a loose plastic bag (with small air holes) — humidity tent',
    ],
    tips: [
      'Use biodegradable plant ties — buyers appreciate eco-conscious sellers',
      'For velvet-leaf plants (gloriosum, melanochrysum), add extra tissue between leaves',
      'If the plant has a new unfurling leaf, support it with a cotton ball wrap',
    ],
  },
  {
    id: 5,
    icon: <Package className="w-5 h-5" />,
    title: 'Box It Up',
    description: 'The box is your plant\'s home for 1–3 days. Make it a fortress. Shake test is mandatory — if you hear movement, add more padding.',
    details: [
      'Choose a box where the plant does not touch any wall — 5cm minimum clearance',
      'Line the bottom with 5cm of cushioning — packing peanuts or crumpled paper',
      'Place the wrapped plant in the center — upright, stable, no tilt',
      'Fill all gaps with packing material — every empty space is a damage risk',
      'Add a layer of cushioning on top before sealing',
      'Close the box and do the shake test — no movement sound = perfect',
      'Seal with H-tape method: tape across the center seam, then tape perpendicular at both ends',
    ],
    tips: [
      'For expensive plants (5,000+ THB), double-box — inner box with plant, outer box with 3cm gap filled',
      'Write "OPEN THIS SIDE" on the correct flap so buyer does not slice the plant',
      'Include a silica gel packet if shipping in rainy season — but keep it away from roots',
    ],
  },
  {
    id: 6,
    icon: <ShieldCheck className="w-5 h-5" />,
    title: 'Label & Seal',
    description: 'Your package will pass through 3–6 handlers who do not care about plants. Labels are the only thing protecting your shipment.',
    details: [
      'Write "FRAGILE — LIVE PLANTS" in large letters on all 6 sides of the box',
      'Add "THIS SIDE UP" arrows — prevents upside-down handling',
      'Include sender address (your address) and buyer address clearly on top',
      'Tape over the addresses with clear tape — prevents smudging in rain',
      'Add a "DO NOT CRUSH" label if the box is lightweight',
      'Include a small note inside with: your contact, care instructions, and a thank you',
    ],
    tips: [
      'Use a permanent marker — ballpoint ink smears in Thai humidity',
      'Print labels on A4 paper and tape them on — looks more professional than handwriting',
      'Add a "Handle with Care" sticker if you have one — visual reinforcement works',
    ],
  },
  {
    id: 7,
    icon: <Truck className="w-5 h-5" />,
    title: 'Choose Courier & Ship',
    description: 'Thailand has excellent courier options for plants. Pick based on your buyer\'s location and your budget. Same-day or next-day is always best for live plants.',
    details: [
      'Kerry Express — Fast, reliable, handles fragile well. Best for Bangkok metro and major cities.',
      'Flash Express — Cheapest option, decent for non-fragile plants. Longer transit times.',
      'J&T Express — Good tracking, wide coverage. Solid middle-ground choice.',
      'Thailand Post EMS — Best for rural addresses (isan, deep south). Slower but reaches everywhere.',
      'Grab Express — Same-day for Bangkok/major cities. Expensive but plants arrive fresh.',
      'Always ship Monday–Thursday — avoids weekend warehouse sitting',
      'Drop off before 2 PM for same-day pickup by most couriers',
      'Take a photo of the sealed box with tracking label before handing over',
    ],
    tips: [
      'Kerry Express has a "Kerry Express Care" option — worth the extra 20 THB for plants',
      'Flash Express pickup is free from your home — schedule via their app',
      'Always message the buyer the tracking number within 1 hour of drop-off',
    ],
  },
];

const CHECKLIST = [
  'Damp sphagnum moss ready',
  'Plastic wrap / zip bags',
  'Rubber bands or twine',
  'Sturdy cardboard box',
  'Packing peanuts or paper',
  'Strong packing tape',
  'FRAGILE labels',
  'Bamboo stakes for support',
  'Plant watered 2 days ago',
  'Dead leaves removed',
  'Roots rinsed (if bare-root)',
  'Soil secured (if potted)',
  'Roots wrapped in moss',
  'Moss sealed in plastic bag',
  'Stem tied to stake',
  'Delicate leaves wrapped',
  'Vines coiled and secured',
  '5cm bottom cushion in box',
  'Plant centered upright',
  'All gaps filled',
  'Shake test passed',
  'Box sealed H-tape method',
  'FRAGILE on all 6 sides',
  'THIS SIDE UP arrows',
  'Sender + receiver addresses',
  'Tracking photo taken',
  'Buyer messaged tracking #',
];

export default function ShippingGuidePage() {
  const [expanded, setExpanded] = useState<number | null>(1);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCompleted(new Set(JSON.parse(saved)));
    } catch { /* ignore */ }
  }, []);

  const save = useCallback((next: Set<number>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  }, []);

  const toggleComplete = (id: number) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      save(next);
      return next;
    });
  };

  const toggleExpand = (id: number) => {
    setExpanded(prev => (prev === id ? null : id));
  };

  const reset = () => {
    setCompleted(new Set());
    save(new Set());
    setShowReset(false);
  };

  const progress = Math.round((completed.size / STEPS.length) * 100);

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-3">How to Ship Plants Safely</h1>
          <p className="text-zinc-500 max-w-lg mx-auto">
            A step-by-step guide for Thai plant sellers. Follow these 7 steps and your plants will arrive alive, healthy, and happy — every time.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-500">Your progress</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-emerald-400">{progress}%</span>
              {completed.size > 0 && (
                <button
                  onClick={() => setShowReset(true)}
                  className="text-xs text-zinc-600 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Reset Confirm */}
        {showReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-sm p-6">
              <h3 className="text-lg font-medium mb-2">Reset Progress?</h3>
              <p className="text-sm text-zinc-400 mb-6">This will clear all checked steps. You cannot undo this.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowReset(false)} className="flex-1 py-2.5 rounded-lg text-sm border border-white/10 hover:bg-white/5">Cancel</button>
                <button onClick={reset} className="flex-1 py-2.5 rounded-lg text-sm bg-red-500 text-white font-medium hover:bg-red-600">Reset</button>
              </div>
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-3">
          {STEPS.map(step => {
            const isOpen = expanded === step.id;
            const isDone = completed.has(step.id);
            return (
              <div
                key={step.id}
                className={cn(
                  'border rounded-xl overflow-hidden transition-colors',
                  isDone ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 bg-zinc-900/30'
                )}
              >
                <button
                  onClick={() => toggleExpand(step.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-medium',
                    isDone ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'
                  )}>
                    {isDone ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-medium', isDone && 'text-emerald-400')}>{step.title}</p>
                    <p className="text-xs text-zinc-500 truncate">{step.description.slice(0, 60)}…</p>
                  </div>
                  <ChevronDown className={cn('w-5 h-5 text-zinc-600 transition-transform', isOpen && 'rotate-180')} />
                </button>

                <div className={cn(
                  'grid transition-all duration-300',
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                )}>
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 pt-1 space-y-4">
                      <p className="text-sm text-zinc-400 leading-relaxed">{step.description}</p>

                      <div className="space-y-1.5">
                        {step.details.map((d, i) => (
                          <p key={i} className="text-sm text-zinc-300 pl-3 border-l-2 border-zinc-700">{d}</p>
                        ))}
                      </div>

                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                        <p className="text-xs font-medium text-emerald-400 mb-1">Pro Tips</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {step.tips.map((t, i) => (
                            <li key={i} className="text-xs text-zinc-400">{t}</li>
                          ))}
                        </ul>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div className={cn(
                          'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                          isDone ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'
                        )}>
                          {isDone && <Check className="w-3 h-3 text-black" />}
                        </div>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isDone}
                          onChange={() => toggleComplete(step.id)}
                        />
                        <span className="text-sm text-zinc-400">I have completed this step</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Checklist */}
        <div className="mt-12 bg-white text-black rounded-xl p-6 sm:p-8 print:block">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Packing Checklist
            </h2>
            <button
              onClick={() => window.print()}
              className="text-sm bg-black text-white px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors print:hidden"
            >
              Print
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
            {CHECKLIST.map((item, i) => (
              <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                <div className="w-4 h-4 border border-zinc-400 rounded shrink-0" />
                <span>{item}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-6 print:hidden">Tip: Print this page and keep it by your packing station.</p>
        </div>
      </div>
    </div>
  );
}
