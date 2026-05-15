import { ReactNode, useEffect } from 'react';
import { socket, setSocketAuthToken } from '@/lib/socket';
import { useSocketStore } from '@/store/useSocketStore';
import { useAuth } from '@/lib/auth';

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, accessToken } = useAuth();
  const { setConnectionStatus, addEvent } = useSocketStore();

  useEffect(() => {
    if (!user || !user.organizationId) {
      setSocketAuthToken(null);
      if (socket.connected) {
        socket.disconnect();
      }
      return;
    }

    setSocketAuthToken(accessToken);

    // Debounce state to prevent rapid UI flickering
    let timeoutId: NodeJS.Timeout;

    const updateStatus = (status: 'connected' | 'disconnected' | 'reconnecting') => {
      clearTimeout(timeoutId);
      if (status === 'connected') {
        setConnectionStatus(status);
      } else {
        timeoutId = setTimeout(() => {
          setConnectionStatus(status);
        }, 1500); // 1.5s debounce
      }
    };

    // Handlers
    const onConnect = () => {
      updateStatus('connected');
      // Join the organization's specific room
      socket.emit('join_company', user.organizationId);
    };

    const onDisconnect = () => {
      updateStatus('disconnected');
    };

    const onConnectError = () => {
      updateStatus('reconnecting');
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
      clearTimeout(timeoutId);
      // We don't disconnect entirely here to allow fast navigation,
      // but if user changes/logs out, the outer effect will handle disconnect.
    };
  }, [user, accessToken, setConnectionStatus, addEvent]);

  return <>{children}</>;
}
