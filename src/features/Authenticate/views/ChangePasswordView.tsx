import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/shared/context/AuthContext';
import Swal from 'sweetalert2';
import dmgLogo from '@/assets/img/rmines-logo.png';
import govtLogo from '@/assets/img/logo-govt-rajasthan.png';
import '../login.css';

export const ChangePasswordView: React.FC = () => {
  const navigate = useNavigate();
  const { user, updatePassword, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [touched, setTouched] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password requirements validation
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({
      current: true,
      new: true,
      confirm: true,
    });

    if (!currentPassword.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Required Field',
        text: 'Please enter your current or default password.',
        confirmButtonColor: '#20B2AA',
      });
      return;
    }

    if (!isPasswordValid) {
      Swal.fire({
        icon: 'warning',
        title: 'Weak Password',
        text: 'Your new password does not meet the security complexity requirements.',
        confirmButtonColor: '#20B2AA',
      });
      return;
    }

    if (currentPassword === newPassword) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Password',
        text: 'Your new password cannot be the same as your current password.',
        confirmButtonColor: '#20B2AA',
      });
      return;
    }

    if (!passwordsMatch) {
      Swal.fire({
        icon: 'warning',
        title: 'Mismatch',
        text: 'New password and confirm password do not match.',
        confirmButtonColor: '#20B2AA',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        userName: user?.userName || '',
        oldPassword: currentPassword,
        currentPassword: currentPassword,
        passWord: currentPassword,
        newPassword: newPassword,
        confirmPassword: confirmPassword,
      };

      const success = await updatePassword(payload);

      if (success) {
        await Swal.fire({
          icon: 'success',
          title: 'Password Changed Successfully!',
          text: 'Your account password has been updated. You can now access your dashboard.',
          confirmButtonText: 'Continue to Dashboard',
          confirmButtonColor: '#20B2AA',
        });
        navigate('/dashboard', { replace: true });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Failed to Change Password',
          text: 'Could not change your password. Please verify your current password and try again.',
          confirmButtonColor: '#20B2AA',
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.message || 'An error occurred while changing password.',
        confirmButtonColor: '#20B2AA',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    Swal.fire({
      icon: 'question',
      title: 'Cancel Password Change?',
      text: 'You will be signed out and must change your password on your next login.',
      showCancelButton: true,
      confirmButtonText: 'Sign Out',
      cancelButtonText: 'Stay',
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#78909c',
    }).then((result) => {
      if (result.isConfirmed) {
        logout(true);
        navigate('/login', { replace: true });
      }
    });
  };

  return (
    <div className="login-container">
      <div className="login-wrapper" style={{ maxWidth: '520px' }}>
        <div className="login-form-card">
          {/* Header */}
          <div className="logo-section">
            <div className="logo-header">
              <div className="logo-container">
                <img
                  src={dmgLogo}
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (img && img.src !== govtLogo) {
                      img.src = govtLogo;
                    }
                  }}
                  alt="Department of Mines & Geology, Government of Rajasthan"
                  className="combined-logo"
                />
              </div>
              <div className="title-section">
                <h1 className="main-title">Department of Mines & Geology</h1>
                <h2 className="sub-title">
                  Government of <span className="underline">Rajasthan</span>
                </h2>
              </div>
            </div>
            <div className="separator-line"></div>
            <div className="system-title">
              <span className="system-title-text">Change Password</span>
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-3 mb-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
            <i className="bi bi-shield-lock-fill text-amber-600 text-sm mt-0.5"></i>
            <div>
              <p className="font-semibold mb-0.5">Password Update Mandatory</p>
              <p className="mb-0 text-amber-700">
                You are using a default or expired password. Please set a new secure password to proceed.
              </p>
            </div>
          </div>

          {/* Change Password Form */}
          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {/* Current Password */}
            <div className="form-group">
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Current / Default Password</label>
              <div className={`input-wrapper ${touched.current && !currentPassword ? 'is-invalid-wrapper' : ''}`}>
                <i className="bi bi-key form-icon"></i>
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, current: true }))}
                  className="form-control"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  tabIndex={-1}
                >
                  <i className={showCurrentPassword ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="form-group">
              <label className="text-xs font-semibold text-slate-700 mb-1 block">New Password</label>
              <div className={`input-wrapper ${touched.new && !isPasswordValid ? 'is-invalid-wrapper' : ''}`}>
                <i className="bi bi-lock form-icon"></i>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, new: true }))}
                  className="form-control"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  tabIndex={-1}
                >
                  <i className={showNewPassword ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
                </button>
              </div>
            </div>

            {/* Password Policy Indicators */}
            {newPassword.length > 0 && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md mb-3 text-[11px] space-y-1">
                <span className="font-semibold text-slate-600 block mb-1">Password Requirements:</span>
                <div className="grid grid-cols-2 gap-1 text-slate-600">
                  <span className={hasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                    <i className={`bi ${hasMinLength ? 'bi-check-circle-fill text-emerald-500' : 'bi-circle'} me-1`}></i>
                    At least 8 characters
                  </span>
                  <span className={hasUppercase ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                    <i className={`bi ${hasUppercase ? 'bi-check-circle-fill text-emerald-500' : 'bi-circle'} me-1`}></i>
                    One uppercase letter (A-Z)
                  </span>
                  <span className={hasLowercase ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                    <i className={`bi ${hasLowercase ? 'bi-check-circle-fill text-emerald-500' : 'bi-circle'} me-1`}></i>
                    One lowercase letter (a-z)
                  </span>
                  <span className={hasNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                    <i className={`bi ${hasNumber ? 'bi-check-circle-fill text-emerald-500' : 'bi-circle'} me-1`}></i>
                    One number (0-9)
                  </span>
                  <span className={hasSpecial ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                    <i className={`bi ${hasSpecial ? 'bi-check-circle-fill text-emerald-500' : 'bi-circle'} me-1`}></i>
                    One special symbol (@#$%)
                  </span>
                </div>
              </div>
            )}

            {/* Confirm Password */}
            <div className="form-group">
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Confirm New Password</label>
              <div className={`input-wrapper ${touched.confirm && !passwordsMatch ? 'is-invalid-wrapper' : ''}`}>
                <i className="bi bi-shield-check form-icon"></i>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, confirm: true }))}
                  className="form-control"
                  placeholder="Re-enter new password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  tabIndex={-1}
                >
                  <i className={showConfirmPassword ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
                </button>
              </div>
              {touched.confirm && !passwordsMatch && (
                <div className="invalid-feedback">Passwords do not match</div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex gap-2.5 mt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md text-sm transition"
              >
                Cancel & Logout
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-3 bg-[#20B2AA] hover:bg-[#008080] text-white font-semibold rounded-md text-sm transition shadow-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordView;
