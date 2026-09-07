import FullLayout from '@/core/layouts/FullLayout';
import LiveTrackingView from './views/LiveTrackingView';
import { TrackVehicleView } from './views/TrackVehicleView';

export const LiveTrackingRoutes = [
  {
    path: '/map',
    Component: FullLayout,
    children: [
      {
        path: '',
        Component: LiveTrackingView,
      },
      {
        path: 'track/:regNo',
        Component: TrackVehicleView,
      },
    ],
  },
  {
    path: '/live-tracking',
    Component: FullLayout,
    children: [
      {
        path: '',
        Component: LiveTrackingView,
      },
      {
        path: 'track/:regNo',
        Component: TrackVehicleView,
      },
    ],
  },
  {
    path: '/track-vehicle/:regNo',
    Component: FullLayout,
    children: [
      {
        path: '',
        Component: TrackVehicleView,
      },
    ],
  },
  {
    path: '/track/:regNo',
    Component: FullLayout,
    children: [
      {
        path: '',
        Component: TrackVehicleView,
      },
    ],
  },
];

