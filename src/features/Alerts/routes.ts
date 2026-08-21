import FullLayout from '@/core/layouts/FullLayout';
import AlertsHubView from './views/AlertsHubView';

export const AlertsRoutes = [
  {
    path: '/alerts',
    Component: FullLayout,
    children: [
      {
        path: '',
        Component: AlertsHubView,
      },
    ],
  },
];
