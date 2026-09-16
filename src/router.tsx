import { useRoutes, Navigate } from 'react-router';
import { AuthenticateRoutes } from '@/features/Authenticate/routes';
import { DashboardRoutes } from '@/features/Dashboard/routes';
import { LiveTrackingRoutes } from '@/features/LiveTracking/routes';
import { ListViewRoutes } from '@/features/ListView/routes';
import { RoutePlaybackRoutes } from '@/features/RoutePlayback/routes';
import { AlertsRoutes } from '@/features/Alerts/routes';
import { ERavannaRoutes } from '@/features/ERavanna/routes';
import { GeofenceRoutes } from '@/features/Geofence/routes';
import { AIS140Routes } from '@/features/AIS140Terminal/routes';

export const appRoutes = [
  ...AuthenticateRoutes,
  ...DashboardRoutes,
  ...LiveTrackingRoutes,
  ...ListViewRoutes,
  ...RoutePlaybackRoutes,
  ...AlertsRoutes,
  ...ERavannaRoutes,
  ...GeofenceRoutes,
  ...AIS140Routes,
  {
    path: '/auth',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/sso-control-board',
    element: <Navigate to="/dashboard" replace />,
  },
];

export const AppRouter = () => {
  const element = useRoutes(appRoutes);
  return element;
};
