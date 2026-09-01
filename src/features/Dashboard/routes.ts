import FullLayout from '@/core/layouts/FullLayout';
import DashboardView from './views/DashboardView';

export const DashboardRoutes = [
  {
    path: '/',
    Component: FullLayout,
    children: [
      {
        path: '',
        Component: DashboardView,
      },
      {
        path: 'dashboard',
        Component: DashboardView,
      },
    ],
  },
];
