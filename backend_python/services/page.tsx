'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import MapView from '@/components/Map';
import RouteComparison from '@/components/RouteComparison';

export default function EcoRouteDashboard() {
    const [routes, setRoutes] = useState(null);
    const [loading, setLoading] = useState(false);

    return (
        <main className="relative h-screen w-full bg-[#0a0a0c] text-white overflow-hidden font-sans">
            {/* Glassmorphic Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 grid grid-cols-[400px_1fr] h-full p-4 gap-4">
                {/* Left Control Panel */}
                <Sidebar onFindRoutes={(data) => setRoutes(data)} setLoading={setLoading} />

                {/* Right Map & Analysis Area */}
                <section className="relative rounded-3xl overflow-hidden border border-white/5 shadow-2xl bg-black/40 backdrop-blur-md">
                    <MapView routes={routes} />

                    {/* Overlay Comparison Panel */}
                    <AnimatePresence>
                        {routes && (
                            <motion.div
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 100, opacity: 0 }}
                                className="absolute bottom-6 left-6 right-6 z-20"
                            >
                                <RouteComparison data={routes} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Loading Indicator */}
                    {loading && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-emerald-400 font-medium animate-pulse">AI Orchestrating Optimal Routes...</p>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}