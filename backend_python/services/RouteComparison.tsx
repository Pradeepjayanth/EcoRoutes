import React from 'react';

export default function RouteComparison({ data }) {
    const { smartRoute, fastestRoute, ecoRoute } = data;

    return (
        <div className="grid grid-cols-3 gap-4">
            {/* Smart AI Route Card */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-xl hover:border-emerald-500/50 transition-all">
                <div className="flex justify-between items-start mb-3">
                    <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Smart AI Pick</span>
                    <div className="text-2xl font-bold text-emerald-400">{smartRoute.aiScore.humanScore}</div>
                </div>
                <h3 className="text-lg font-semibold mb-1">Optimal Hybrid Path</h3>
                <p className="text-xs text-white/50 mb-4">{smartRoute.totalDistance} km • {smartRoute.estimatedTime} mins</p>

                <div className="space-y-2">
                    {smartRoute.aiScore.explanations.map((exp, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-emerald-200/80">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {exp}
                        </div>
                    ))}
                </div>
            </div>

            {/* Fastest and Eco cards follow similar patterns... */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/5 p-5 rounded-2xl hover:bg-white/10 transition-colors">
                <div className="text-xs font-bold text-red-400 uppercase mb-2">Fastest</div>
                <h3 className="text-lg font-semibold">{fastestRoute.estimatedTime} min journey</h3>
                <p className="text-sm text-white/60">Prioritizes velocity over air quality.</p>
                <div className="mt-4 text-xs bg-red-500/10 text-red-400 p-2 rounded-lg">High vehicle density detected by AI</div>
            </div>

            <div className="bg-white/5 backdrop-blur-lg border border-white/5 p-5 rounded-2xl hover:bg-white/10 transition-colors">
                <div className="text-xs font-bold text-blue-400 uppercase mb-2">Eco-Friendly</div>
                <h3 className="text-lg font-semibold">Avg AQI: {ecoRoute.avgAQI}</h3>
                <p className="text-sm text-white/60">Minimized exposure to PM2.5 particles.</p>
                <div className="mt-4 text-xs bg-blue-500/10 text-blue-400 p-2 rounded-lg">34% less pollution than fastest route</div>
            </div>
        </div>
    );
}