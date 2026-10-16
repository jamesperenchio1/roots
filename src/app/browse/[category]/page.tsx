import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import BrowsePage from '@/page-components/BrowsePage';
import { BROWSE_CATEGORIES, isCategory } from '@/lib/categories';
import type { Metadata } from 'next';

export const revalidate = 30;
export const dynamicParams = false;

type Params = Promise<{ category: string }>;

export function generateStaticParams() {
  return BROWSE_CATEGORIES.map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category } = await params;
  const label = category.charAt(0).toUpperCase() + category.slice(1);
  return {
    title: `${label} plants for sale`,
    description: `Browse ${category} plants for sale in Thailand.`,
  };
}

export default async function Page({ params }: { params: Params }) {
  const { category } = await params;
  if (!isCategory(category)) notFound();
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <BrowsePage category={category} />
    </Suspense>
  );
}
