import FullLayout from '@/core/layouts/FullLayout';
import RoutePlaybackView from './views/RoutePlaybackView';

export const RoutePlaybackRoutes = [
  {
    path: '/playback',
    Component: FullLayout,
    children: [
      {
        path: '',
        Component: RoutePlaybackView,
      },
    ],
  },
];
