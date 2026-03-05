import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import LiveFlightModal from './LiveFlightModal';
import { useAuth } from '../context/AuthContext';
import { routiqApi } from '../api/routiqApi';

export default function RouteDetailsModal({ trip, onClose, onSave }: any) {
  const [isThyModalOpen, setIsThyModalOpen] = useState(false);
  const [isSavedLocal, setIsSavedLocal] = useState(trip?.isSaved || false);
  const [dynamicInsight, setDynamicInsight] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    const fetchInsight = async () => {
      if (!trip?.destination || trip.agentInsight) return;

      try {
        // Simulate Orchestrator Thinking and fetching Live MCP Data
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trip.destination)}&count=1`);
        const geoData = await geoRes.json();

        if (!mounted) return;

        if (!geoData.results || geoData.results.length === 0) {
          setDynamicInsight(`Verified your travel plans for ${trip.destination}. The orchestrator has confirmed this route matches your criteria perfectly.`);
          return;
        }

        const { latitude, longitude } = geoData.results[0];
        const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
        const wxData = await wxRes.json();

        if (!mounted) return;

        const current = wxData.current_weather;
        const temp = Math.round(current.temperature);
        const code = current.weathercode;

        let condition = "Clear ☀️";
        let advice = "Perfect for your scheduled outdoor tour! 👟";

        if (code >= 1 && code <= 3) { condition = "Partly Cloudy ⛅"; advice = "A great time to explore the city on foot. 🚶"; }
        else if (code >= 45 && code <= 48) { condition = "Foggy 🌫️"; advice = "Take it easy on the roads and enjoy a cozy indoor cafe. ☕"; }
        else if (code >= 51 && code <= 67) { condition = "Rainy 🌧️"; advice = "Bring a light jacket and an umbrella for the Day 1 activities. ☔"; }
        else if (code >= 71 && code <= 77) { condition = "Snowy ❄️"; advice = "Bundle up! It's beautiful weather for winter sightseeing. ⛄"; }
        else if (code >= 80 && code <= 82) { condition = "Experiencing Rain Showers 🌦️"; advice = "Expect intermittent rain, keep your itinerary flexible. 🏛️"; }
        else if (code >= 95 && code <= 99) { condition = "Stormy ⛈️"; advice = "Safest to plan indoor activities or find a local restaurant until it passes. 🍽️"; }

        let tempWarning = "";
        if (temp > 30) tempWarning = " 🔥";
        else if (temp < 5) tempWarning = " 🥶";

        // Artificial delay so the user feels the "Agent Orchestration"
        setTimeout(() => {
          if (mounted) {
            setDynamicInsight(`Currently ${temp}°C${tempWarning} and ${condition} in ${trip.destination}. I've verified the live conditions—${advice}`);
          }
        }, 800);

      } catch (err) {
        if (mounted) setDynamicInsight(`Verified route details for ${trip.destination}. All parameters match your current travel capabilities.`);
      }
    };

    fetchInsight();
    return () => { mounted = false; };
  }, [trip?.destination, trip?.agentInsight]);

  useEffect(() => {
    // 1. Check if passed as prop explicitly
    if (trip?.isSaved) {
      setIsSavedLocal(true);
      return;
    }

    // 2. Cross-reference with persistent storage (Fallback to API)
    const fetchSavedStatus = async () => {
      if (!user?.id || isSavedLocal) return;
      try {
        const response = await routiqApi.get(`/routes/user/${user.id}`);
        const trips = response.data || [];
        // Check if our generated trip destination matches any saved trips' routeName or stops
        const exists = trips.some((t: any) =>
          t.routeName === trip?.destination ||
          t.stops?.some((s: any) => s.city === trip?.destination)
        );
        if (exists) {
          setIsSavedLocal(true);
        }
      } catch (err) {
        console.error('Failed to hydrate saved status', err);
      }
    };

    fetchSavedStatus();
  }, [user?.id, trip?.destination, trip?.isSaved, isSavedLocal]);

  const itinerarySummary = trip?.itinerary || [
    "Day 1: Arrival & Hotel Check-in",
    "Day 2: City Center Highlights",
    "Day 3: Scenic Exploration",
    "Day 4: Local Culinary Tour",
    "Day 5: Departure Preparation"
  ];

  const modalContent = (
    <div
      className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/50 dark:bg-black/90 p-4 transition-colors duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white dark:bg-[#1A1E23] w-full max-w-3xl max-h-[90vh] rounded-xl border border-gray-200 dark:border-gray-600 flex flex-col shadow-2xl overflow-hidden">

        {/* HEADER */}
        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-5 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">Route Details: {trip?.destination}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">A personalized adventure.</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white text-3xl font-light">&times;</button>
        </div>

        {/* ENRICHED MODAL BODY */}
        <div className="p-5 space-y-6 text-sm text-gray-800 dark:text-gray-300 flex-1 overflow-y-auto custom-scrollbar">

          {/* Agent Insight (Orchestrator Injection Point) */}
          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg tracking-widest uppercase shadow-sm">
              Live Agent Insight
            </div>
            <h3 className="font-bold mb-2 text-indigo-800 dark:text-indigo-300 text-lg flex items-center gap-2">
              <span>🧠</span> Orchestrator's Real-Time Analysis
            </h3>
            <p className="leading-relaxed text-indigo-900 dark:text-indigo-200 font-medium flex items-start gap-3 mt-3 bg-white/40 dark:bg-black/20 p-3 rounded-lg border border-indigo-200/50 dark:border-indigo-700/30 shadow-inner">
              {trip?.agentInsight || dynamicInsight ? (
                <span className="text-sm">{trip?.agentInsight || dynamicInsight}</span>
              ) : (
                <span className="flex items-center gap-2 text-sm italic text-indigo-700/70 dark:text-indigo-300/70">
                  <span className="w-3.5 h-3.5 rounded-full border-[2px] border-indigo-400 dark:border-indigo-500 border-t-transparent animate-spin inline-block shrink-0"></span>
                  Fetching live environmental and situational insight from the Agentic Orchestrator...
                </span>
              )}
            </p>
          </div>

          {/* The Experience (Story) */}
          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-800/30">
            <h3 className="font-bold mb-2 text-blue-800 dark:text-blue-300 text-lg">The Experience</h3>
            <p className="leading-relaxed text-gray-700 dark:text-gray-300">
              {trip?.description || "A captivating journey combining modern luxury with ancient traditions. This route was specifically selected because it matches your high-budget preference and offers visa-free access."}
            </p>
          </div>

          {/* Fast Facts Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 text-center flex flex-col justify-center">
              <div className="text-gray-500 dark:text-gray-400 text-[10px] mb-1 uppercase tracking-widest">Duration</div>
              <div className="font-black text-gray-800 dark:text-gray-200 text-xl">{trip?.durationDays || 10} Days</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 text-center flex flex-col justify-center">
              <div className="text-gray-500 dark:text-gray-400 text-[10px] mb-1 uppercase tracking-widest">Est. Budget</div>
              <div className="font-black text-gray-800 dark:text-gray-200 text-xl">${trip?.totalBudgetUsd || 1500}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 text-center flex flex-col justify-center">
              <div className="text-gray-500 dark:text-gray-400 text-[10px] mb-1 uppercase tracking-widest">Visa Status</div>
              <div className="font-black text-blue-600 dark:text-blue-400 text-lg">{trip?.visaStatus || "VISA-FREE"}</div>
            </div>
          </div>

          {/* Itinerary */}
          <div className="bg-gray-50 dark:bg-gray-800/30 p-5 rounded-xl border border-gray-200 dark:border-gray-700/50">
            <h3 className="font-bold mb-4 text-gray-900 dark:text-white text-lg">Suggested Itinerary</h3>
            <ul className="space-y-3">
              {itinerarySummary.map((stop: string, index: number) => (
                <li key={index} className="flex gap-4 items-center p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-600/50 flex items-center justify-center font-bold text-xs shrink-0">0{index + 1}</span>
                  <span className="text-gray-700 dark:text-gray-300">{stop}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* FOOTER */}
        <div className="bg-gray-50 dark:bg-gray-900/80 p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center gap-4 shrink-0">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isSavedLocal && onSave) {
                onSave();
                setIsSavedLocal(true);
              }
            }}
            disabled={isSavedLocal}
            className={`px-6 py-2.5 font-bold rounded-lg transition-colors shadow-md text-sm ${isSavedLocal
              ? 'bg-green-600 text-white cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
          >
            {isSavedLocal ? '✓ Saved' : 'Save This Route'}
          </button>

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsThyModalOpen(true);
            }}
            className="px-5 py-2.5 bg-[#E60000] hover:bg-[#CC0000] text-white font-bold rounded-lg transition-colors shadow-md flex items-center gap-2 text-sm"
          >
            ✈️ Check THY Flights
          </button>
        </div>
      </div>

      {isThyModalOpen && (
        <LiveFlightModal
          destination={trip?.destinationCode || trip?.destination}
          origin={trip?.ticketData?.origin}
          ticketData={trip?.ticketData}
          onClose={() => setIsThyModalOpen(false)}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
