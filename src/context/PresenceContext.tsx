import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/services/supabase/client';
import { useAuth } from './AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceUser {
  id: string;
  name?: string;
  role?: string;
  online_at: string;
}

interface PresenceContextType {
  onlineUserIds: Set<string>;
  onlineUsers: PresenceUser[];
  onlineCount: number;
  isUserOnline: (userId?: string | null) => boolean;
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUserIds: new Set(),
  onlineUsers: [],
  onlineCount: 0,
  isUserOnline: () => false,
});

export const PresenceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!user?.id) {
      setOnlineUserIds(new Set());
      setOnlineUsers([]);
      return;
    }

    const channelName = 'presence:online-users';
    let presenceChannel: RealtimeChannel | null = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    const updatePresenceState = () => {
      if (!presenceChannel) return;
      const state = presenceChannel.presenceState();
      const ids = new Set<string>();
      const userList: PresenceUser[] = [];

      Object.keys(state).forEach((key) => {
        ids.add(key);
        const presences = state[key] as any[];
        if (presences && presences.length > 0) {
          const latest = presences[presences.length - 1];
          userList.push({
            id: key,
            name: latest.name,
            role: latest.role,
            online_at: latest.online_at || new Date().toISOString(),
          });
        }
      });

      setOnlineUserIds(ids);
      setOnlineUsers(userList);
    };

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        updatePresenceState();
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        updatePresenceState();
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        updatePresenceState();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel?.track({
            id: user.id,
            name: user.name || 'User',
            role: user.role || 'student',
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      if (presenceChannel) {
        presenceChannel.untrack().catch(() => {});
        supabase.removeChannel(presenceChannel);
        presenceChannel = null;
      }
    };
  }, [user?.id, user?.name, user?.role]);

  const isUserOnline = (userId?: string | null): boolean => {
    if (!userId) return false;
    return onlineUserIds.has(userId);
  };

  return (
    <PresenceContext.Provider
      value={{
        onlineUserIds,
        onlineUsers,
        onlineCount: onlineUserIds.size,
        isUserOnline,
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => useContext(PresenceContext);

