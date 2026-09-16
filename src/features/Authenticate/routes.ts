import type { RouteObject } from 'react-router';
import LoginView from './views/LoginView';
import ChangePasswordView from './views/ChangePasswordView';

export const AuthenticateRoutes: RouteObject[] = [
  {
    path: '/login',
    Component: LoginView,
  },
  {
    path: '/change-password',
    Component: ChangePasswordView,
  },
];
