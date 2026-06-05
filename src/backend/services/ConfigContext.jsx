import React, { createContext, useContext, useState } from 'react';

const DEFAULT_CONFIG = {
    bgLogin: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=2000&auto=format&fit=crop', // Modern Tractor Field
    bgFarmerHome: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000&auto=format&fit=crop', // Wheat Field Sunset
    bgDriverHome: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=2000&auto=format&fit=crop', // Farm Road
    bgOtp: 'https://images.unsplash.com/photo-1592919321303-9e900994f30e?q=80&w=2000&auto=format&fit=crop', // Soil/Agri Check
};

const ConfigContext = createContext(undefined);

export const ConfigProvider = ({ children }) => {
    const [config, setConfig] = useState(DEFAULT_CONFIG);

    const updateConfig = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const resetConfig = () => setConfig(DEFAULT_CONFIG);

    return (
        <ConfigContext.Provider value={{ config, updateConfig, resetConfig }}>
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = () => {
    const context = useContext(ConfigContext);
    if (!context) throw new Error('useConfig must be used within ConfigProvider');
    return context;
};
