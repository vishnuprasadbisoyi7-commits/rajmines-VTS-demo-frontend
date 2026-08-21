import FullLayout from '@/core/layouts/FullLayout';
import GeofenceManagerView from './views/GeofenceManagerView';

export const GeofenceRoutes = [
  {
    path: '/geofences',
    Component: FullLayout,
    children: [
      {
        path: '',
        Component: GeofenceManagerView,
      },
    ],
  },
];
