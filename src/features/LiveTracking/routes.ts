import FullLayout from '@/core/layouts/FullLayout';
import LiveTrackingView from './views/LiveTrackingView';

export const LiveTrackingRoutes = [
  {
    path: '/',
    Component: FullLayout,
    children: [
      {
        path: '',
        Component: LiveTrackingView,
      },
      {
        path: 'live-tracking',
        Component: LiveTrackingView,
      },
    ],
  },
];
