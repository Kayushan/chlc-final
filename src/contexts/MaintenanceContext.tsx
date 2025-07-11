import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase'; // Adjust path as necessary

interface MaintenanceStatus {
  isMaintenanceModeActive: boolean;
  isLoadingMaintenanceStatus: boolean;
}

const MaintenanceContext = createContext<MaintenanceStatus | undefined>(undefined);

export const useMaintenanceStatus = (): MaintenanceStatus => {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error('useMaintenanceStatus must be used within a MaintenanceProvider');
  }
  return context;
};

interface MaintenanceProviderProps {
  children: ReactNode;
}

export const MaintenanceProvider = ({ children }: MaintenanceProviderProps) => {
  const [isMaintenanceModeActive, setIsMaintenanceModeActive] = useState<boolean>(false);
  const [isLoadingMaintenanceStatus, setIsLoadingMaintenanceStatus] = useState<boolean>(true);

  useEffect(() => {
    const fetchInitialStatus = async () => {
      setIsLoadingMaintenanceStatus(true);
      try {
        const { data, error } = await supabase
          .from('system_flags')
          .select('is_active')
          .eq('flag_name', 'maintenance_mode')
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116: "Searched item was not found"
          console.error('Error fetching initial maintenance status:', error);
          // Keep default false, show error to admin elsewhere or rely on creator to fix
        } else if (data) {
          setIsMaintenanceModeActive(data.is_active);
        } else {
          // Flag not found, default to false. Migration should create this.
          console.warn('Maintenance mode flag not found in system_flags. Defaulting to false.');
          setIsMaintenanceModeActive(false);
        }
      } catch (e) {
        console.error('Unexpected error fetching initial maintenance status:', e);
      } finally {
        setIsLoadingMaintenanceStatus(false);
      }
    };

    fetchInitialStatus();

    // Subscribe to real-time updates on the system_flags table for the maintenance_mode flag
    const channel = supabase
      .channel('public:system_flags:maintenance_mode')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_flags',
          filter: 'flag_name=eq.maintenance_mode'
        },
        (payload) => {
          // console.log('Maintenance mode changed via real-time:', payload.new);
          if (payload.new && typeof (payload.new as any).is_active === 'boolean') {
            setIsMaintenanceModeActive((payload.new as any).is_active);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          // console.log('Subscribed to maintenance_mode updates.');
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('Real-time subscription error for maintenance_mode:', err || status);
        }
      });


    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <MaintenanceContext.Provider value={{ isMaintenanceModeActive, isLoadingMaintenanceStatus }}>
      {children}
    </MaintenanceContext.Provider>
  );
};
