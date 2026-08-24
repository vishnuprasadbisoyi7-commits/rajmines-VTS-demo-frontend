import { ROUTES } from "@shared/constants";
import { Link } from "react-router";

export default function WelcomeView() {
  return (
    <div className="h-screen flex items-center justify-center bg-slate-50 flex-col gap-4">
      <h1 className="text-slate-900 text-xl font-bold">
        RajMines VTS - Rajasthan Mining Fleet Surveillance
      </h1>
      <div className="flex items-center gap-2 justify-center flex-wrap">
        <Link
          className="border px-4 py-2 rounded-lg border-amber-500 bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition shadow-sm"
          to={ROUTES.LIVE_TRACKING}
        >
          Live Tracking Map
        </Link>
        <Link
          className="border px-4 py-2 rounded-lg border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition shadow-xs"
          to={ROUTES.PLAYBACK}
        >
          Route Playback
        </Link>
        <Link
          className="border px-4 py-2 rounded-lg border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition shadow-xs"
          to={ROUTES.GEOFENCES}
        >
          Mining Leases
        </Link>
      </div>
    </div>
  );
}
