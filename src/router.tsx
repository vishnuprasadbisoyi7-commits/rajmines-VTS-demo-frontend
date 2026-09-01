import { useRoutes } from 'react-router';
import { DashboardRoutes } from '@/features/Dashboard/routes';
import { LiveTrackingRoutes } from '@/features/LiveTracking/routes';
import { ListViewRoutes } from '@/features/ListView/routes';
import { RoutePlaybackRoutes } from '@/features/RoutePlayback/routes';
import { AlertsRoutes } from '@/features/Alerts/routes';
import { ERavannaRoutes } from '@/features/ERavanna/routes';
import { GeofenceRoutes } from '@/features/Geofence/routes';
import { AIS140Routes } from '@/features/AIS140Terminal/routes';

export const appRoutes = [
  ...DashboardRoutes,
  ...LiveTrackingRoutes,
  ...ListViewRoutes,
  ...RoutePlaybackRoutes,
  ...AlertsRoutes,
  ...ERavannaRoutes,
  ...GeofenceRoutes,
  ...AIS140Routes,
];

export const AppRouter = () => {
  const element = useRoutes(appRoutes);
  return element;
};
