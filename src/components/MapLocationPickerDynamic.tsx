'use client';

import dynamic from 'next/dynamic';
import type { MapLocationValue } from './MapLocationPicker';
export type { MapLocationValue };

export interface MapLocationPickerDynamicProps {
  value?: MapLocationValue | null;
  onChange: (value: MapLocationValue) => void;
  onGeocodedAddress?: (address: string, province?: string) => void;
  height?: string;
}

const MapLocationPicker = dynamic(() => import('./MapLocationPicker'), { ssr: false });

export default function MapLocationPickerDynamic(props: MapLocationPickerDynamicProps) {
  return <MapLocationPicker {...props} />;
}
