import { useRoutes } from 'react-router';
import { LiveTrackingRoutes } from '@/features/LiveTracking/routes';
import { RoutePlaybackRoutes } from '@/features/RoutePlayback/routes';
import { GeofenceRoutes } from '@/features/Geofence/routes';
import { ERavannaRoutes } from '@/features/ERavanna/routes';
import { AlertsRoutes } from '@/features/Alerts/routes';
import { AIS140Routes } from '@/features/AIS140Terminal/routes';

export const appRoutes = [
  ...LiveTrackingRoutes,
  ...RoutePlaybackRoutes,
  ...GeofenceRoutes,
  ...ERavannaRoutes,
  ...AlertsRoutes,
  ...AIS140Routes,
];

export const AppRouter = () => {
  const element = useRoutes(appRoutes);
  return element;
};
