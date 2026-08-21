import FullLayout from '@/core/layouts/FullLayout';
import AIS140TerminalView from './views/AIS140TerminalView';

export const AIS140Routes = [
  {
    path: '/ais140',
    Component: FullLayout,
    children: [
      {
        path: '',
        Component: AIS140TerminalView,
      },
    ],
  },
];
