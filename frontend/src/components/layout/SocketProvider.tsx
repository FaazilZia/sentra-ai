import { ReactNode, useEffect } from 'react';
import { socket } from '@/lib/socket';
import { useSocketStore } from '@/store/useSocketStore';
import { useAuth } from '@/lib/auth';

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { setConnectionStatus, addEvent } = useSocketStore();

  useEffect(() => {
    if (!user || !user.organizationId) {
      if (socket.connected) {
        socket.disconnect();
      }
      return;
    }

    // Handlers
    const onConnect = () => {
      setConnectionStatus('connected');
      // Join the organization's specific room
      socket.emit('join_company', user.organizationId);
    };

    const onDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    const onConnectError = () => {
      setConnectionStatus('reconnecting');
    };

    const onActivityLog = (payload: any) => {
      // Ensure the event belongs to this org (safety check)
      if (payload.organizationId === user.organizationId) {
        addEvent(payload);
      }
    };

    // Attach listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('activity_log', onActivityLog);

    // Initiate connection
    socket.connect();

    // Cleanup
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('activity_log', onActivityLog);
      // We don't disconnect entirely here to allow fast navigation,
      // but if user changes/logs out, the outer effect will handle disconnect.
    };
  }, [user, setConnectionStatus, addEvent]);

  return <>{children}</>;
}
