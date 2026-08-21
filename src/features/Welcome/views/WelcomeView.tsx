import { ROUTES } from "@shared/constants";
import { Link } from "react-router";

export default function WelcomeView() {
  return (
    <div className="h-screen flex items-center justify-center bg-slate-950 flex-col gap-4">
      <h1 className="text-white text-xl font-bold">
        RajMines VTS - Rajasthan Mining Fleet Surveillance
      </h1>
      <div className="flex items-center gap-2 justify-center flex-wrap">
        <Link
          className="border px-4 py-2 rounded-lg border-amber-500 text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition"
          to={ROUTES.LIVE_TRACKING}
        >
          Live Tracking Map
        </Link>
        <Link
          className="border px-4 py-2 rounded-lg border-slate-700 text-slate-300 hover:bg-slate-800 transition"
          to={ROUTES.PLAYBACK}
        >
          Route Playback
        </Link>
        <Link
          className="border px-4 py-2 rounded-lg border-slate-700 text-slate-300 hover:bg-slate-800 transition"
          to={ROUTES.GEOFENCES}
        >
          Mining Leases
        </Link>
      </div>
    </div>
  );
}
