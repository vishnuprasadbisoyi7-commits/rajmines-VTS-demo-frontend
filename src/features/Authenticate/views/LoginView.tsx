import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '@/shared/context/AuthContext';
import Swal from 'sweetalert2';
import dmgLogo from '@/assets/img/rmines-logo.png';
import govtLogo from '@/assets/img/logo-govt-rajasthan.png';
import '../login.css';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, passwordChangeRequired } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [captchaNum1, setCaptchaNum1] = useState<number>(1);
  const [captchaNum2, setCaptchaNum2] = useState<number>(1);
  const [captchaAnswer, setCaptchaAnswer] = useState<string>('');
  const [userCaptchaAnswer, setUserCaptchaAnswer] = useState<string>('');

  const [touched, setTouched] = useState({
    username: false,
    password: false,
    captcha: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated and no password change required, route to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      if (passwordChangeRequired) {
        navigate('/change-password', { replace: true });
      } else {
        const dest = (location.state as any)?.from?.pathname || '/dashboard';
        navigate(dest, { replace: true });
      }
    }
  }, [isAuthenticated, passwordChangeRequired, navigate, location.state]);

  const generateCaptcha = useCallback(() => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaNum1(num1);
    setCaptchaNum2(num2);
    setCaptchaAnswer((num1 + num2).toString());
    setUserCaptchaAnswer('');
  }, []);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleBlur = (field: 'username' | 'password' | 'captcha') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({
      username: true,
      password: true,
      captcha: true,
    });

    if (!username.trim() || !password.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: 'Please fill all required fields',
        confirmButtonColor: '#20B2AA',
      });
      return;
    }

    if (userCaptchaAnswer.trim() !== captchaAnswer) {
      Swal.fire({
        icon: 'info',
        title: 'Invalid Captcha',
        text: 'Invalid captcha answer. Please solve the calculation again.',
        confirmButtonColor: '#20B2AA',
      });
      generateCaptcha();
      return;
    }

    setIsLoading(true);

    try {
      const loginPayload = {
        userName: username.trim(),
        passWord: password,
        inputCaptcha: userCaptchaAnswer.trim(),
        captcha: captchaAnswer,
      };

      const response = await login(loginPayload);

      if (!response) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Invalid response from server. Please try again.',
          confirmButtonColor: '#20B2AA',
        });
        generateCaptcha();
        setIsLoading(false);
        return;
      }

      if (response.status === 'error' || response.status === 'ERROR') {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: response.message || 'An error occurred. Please try again.',
          confirmButtonColor: '#20B2AA',
        });
        generateCaptcha();
        setIsLoading(false);
        return;
      }

      const responseData = response.data || response;
      const statusCode = responseData.statusCode || response.statusCode;
      const status = (responseData.status || response.status || '').toUpperCase();
      const message = responseData.message || response.message || 'Login failed';

      if (statusCode === 200 && status === 'SUCCESS') {
        const user = responseData.user;
        const checkPassword = responseData.checkPassword;

        // Check if password change is required (first-time user or expired default password)
        const isPwChangeReq = Boolean(
          checkPassword &&
            (checkPassword === true ||
              checkPassword === 'true' ||
              (typeof checkPassword === 'string' && checkPassword.trim().length > 0))
        );

        if (isPwChangeReq) {
          Swal.fire({
            icon: 'warning',
            title: 'Password Change Required',
            text:
              user?.leftDays != null && user.leftDays < 0
                ? 'Your password has expired. Please change your password to continue.'
                : 'You are using the default password. Please change your password to continue.',
            confirmButtonText: 'Change Password',
            confirmButtonColor: '#20B2AA',
            allowOutsideClick: false,
            allowEscapeKey: false,
          }).then(() => {
            navigate('/change-password', { replace: true });
          });
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Welcome!',
            text: `Signed in as ${user?.displayName || username}`,
            timer: 1500,
            showConfirmButton: false,
          });
          const target = (location.state as any)?.from?.pathname || '/dashboard';
          navigate(target, { replace: true });
        }
        return;
      }

      // Handle specific HTTP error status codes
      if (statusCode === 400) {
        Swal.fire({ icon: 'info', title: 'Invalid Request', text: message || 'Invalid captcha or input.', confirmButtonColor: '#20B2AA' });
      } else if (statusCode === 401) {
        Swal.fire({ icon: 'info', title: 'Authentication Failed', text: message || 'Invalid username or password.', confirmButtonColor: '#20B2AA' });
      } else if (statusCode === 403) {
        Swal.fire({ icon: 'info', title: 'Access Denied', text: message || 'Access denied. Please contact department administrator.', confirmButtonColor: '#20B2AA' });
      } else {
        Swal.fire({ icon: 'error', title: 'Login Failed', text: message || 'Login failed.', confirmButtonColor: '#20B2AA' });
      }

      generateCaptcha();
    } catch (err: any) {
      console.error('Login error:', err);
      let errorMsg = 'Login failed. Please verify your credentials.';
      if (err?.error?.message) {
        errorMsg = err.error.message;
      } else if (err?.message) {
        errorMsg = err.message;
      }
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMsg,
        confirmButtonColor: '#20B2AA',
      });
      generateCaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  const usernameInvalid = touched.username && !username.trim();
  const passwordInvalid = touched.password && !password.trim();

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-form-card">
          {/* Logo Section */}
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
              <span className="system-title-text">Login</span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {/* Username */}
            <div className="form-group">
              <div className={`input-wrapper ${usernameInvalid ? 'is-invalid-wrapper' : ''}`}>
                <i className="bi bi-person form-icon"></i>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onBlur={() => handleBlur('username')}
                  className="form-control"
                  placeholder="Username"
                  autoComplete="username"
                />
              </div>
              {usernameInvalid && (
                <div className="invalid-feedback">Username is required</div>
              )}
            </div>

            {/* Password */}
            <div className="form-group">
              <div className={`input-wrapper ${passwordInvalid ? 'is-invalid-wrapper' : ''}`}>
                <i className="bi bi-lock form-icon"></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  className="form-control"
                  placeholder="Password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={togglePasswordVisibility}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
                </button>
              </div>
              {passwordInvalid && (
                <div className="invalid-feedback">Password is required</div>
              )}
            </div>

            {/* Captcha */}
            <div className="form-group captcha-group">
              <div className="captcha-wrapper">
                <input
                  type="text"
                  id="captcha"
                  value={userCaptchaAnswer}
                  onChange={(e) => setUserCaptchaAnswer(e.target.value)}
                  onBlur={() => handleBlur('captcha')}
                  className="captcha-input"
                  placeholder="Enter Answer"
                  required
                />
                <div className="captcha-display">
                  <span className="captcha-text">
                    {captchaNum1} + {captchaNum2}
                  </span>
                  <button
                    type="button"
                    className="captcha-refresh-btn"
                    onClick={generateCaptcha}
                    tabIndex={-1}
                    title="Refresh Captcha"
                  >
                    <i className="bi bi-arrow-clockwise"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" className="btn-login" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Signing in...
                </>
              ) : (
                'Login'
              )}
            </button>

            {/* Action Links Row (Create SSO Account) */}
            <div className="action-links-row">
              <a
                href="https://sso.rajasthan.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="sso-link"
              >
                <i className="bi bi-box-arrow-up-right me-1 text-xs"></i>
                Create SSO Account
              </a>
            </div>

            {/* Contact Us Section */}
            <div className="contact-info">
              <h3 className="contact-title">Contact Us</h3>
              <div className="contact-details">
                <p className="contact-text">
                  Directorate, Mines and Geology Udaipur.(Raj)
                </p>
                <p className="contact-text">
                  <i className="bi bi-telephone-fill contact-icon"></i>
                  Office Tel.-
                  <span className="contact-value">0294- 2415091 (Ext.-201)</span>
                </p>
                <p className="contact-text">
                  <i className="bi bi-envelope-fill contact-icon"></i>
                  Email-
                  <a href="mailto:director.uda.mg@rajasthan.gov.in" className="contact-value">
                    director.uda.mg@rajasthan.gov.in
                  </a>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
