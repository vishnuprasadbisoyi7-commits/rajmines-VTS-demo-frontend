import FullLayout from '@/core/layouts/FullLayout';
import ERavannaView from './views/ERavannaView';

export const ERavannaRoutes = [
  {
    path: '/e-ravanna',
    Component: FullLayout,
    children: [
      {
        path: '',
        Component: ERavannaView,
      },
    ],
  },
];
