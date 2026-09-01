import FullLayout from '@/core/layouts/FullLayout';
import ListView from './views/ListView';

export const ListViewRoutes = [
  {
    path: '/list',
    Component: FullLayout,
    children: [
      {
        path: '',
        Component: ListView,
      },
    ],
  },
];
