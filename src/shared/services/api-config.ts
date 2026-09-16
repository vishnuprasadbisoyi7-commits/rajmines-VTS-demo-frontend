/**
 * API Endpoints Configuration
 * 
 * Maps backend API routes for authentication and password management.
 */

const API_BASE_VTS = '/vts/api';

export const loginUrl = `${API_BASE_VTS}/auth/login`;
export const changePassword = `${API_BASE_VTS}/auth/changePassword`;
export const changeuserpassword = `${API_BASE_VTS}/auth/changeUserPassword`;
export const mobileApiloginforweb = `${API_BASE_VTS}/auth/mobileLogin`;
export const checkDeviceFitmentStatus = `${API_BASE_VTS}/checkDeviceFitmentStatus`;

export const API_CONFIG = {
  loginUrl,
  changePassword,
  changeuserpassword,
  mobileApiloginforweb,
  checkDeviceFitmentStatus,
};
