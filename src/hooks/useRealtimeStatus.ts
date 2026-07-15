import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type RealtimeConnectionState = 'connected' | 'connecting' | 'disconnected';

export function useRealtimeStatus(): RealtimeConnectionState {
  const [status, setStatus] = useState<RealtimeConnectionState>('connecting');

  useEffect(() => {
    // Probe with a heartbeat channel to track connection state.
    const channel = supabase.channel('__connection_probe__');

    channel.subscribe((s) => {
      if (s === 'SUBSCRIBED') setStatus('connected');
      else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') setStatus('disconnected');
      else setStatus('connecting');
    });

    return () => { supabase.removeChannel(channel); };
  }, []);

  return status;
}
