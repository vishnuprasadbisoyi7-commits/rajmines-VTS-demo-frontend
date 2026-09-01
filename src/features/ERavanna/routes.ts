import FullLayout from '@/core/layouts/FullLayout';
import ERavannaView from './views/ERavannaView';

export const ERavannaRoutes = [
  {
    path: '/trip-reports',
    Component: FullLayout,
    children: [
      {
        path: '',
        Component: ERavannaView,
      },
    ],
  },
  {
    path: '/e-rawanna',
    Component: FullLayout,
    children: [
      {
        path: '',
        Component: ERavannaView,
      },
    ],
  },
];
