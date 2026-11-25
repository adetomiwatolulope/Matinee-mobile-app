import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { api } from './api';
import { useTheme } from './theme/ThemeContext';
import {
  canSubmitAuth,
  createIdempotencyKey,
  formatNameInput,
  isEmailFilled,
  isNameValid,
  isVerificationCodeValid,
  MAX_PASSWORD_LENGTH,
  validateAuthInput,
  validateField,
} from './domain/auth';
import AboutScreen from './screens/AboutScreen';
import AuthScreen from './screens/AuthScreen';
import ComponentGalleryScreen from './screens/ComponentGalleryScreen';
import DashboardScreen from './screens/DashboardScreen';
import DiscoveryScreen from './screens/DiscoveryScreen';
import MovieDetailsScreen from './screens/MovieDetailsScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import PaymentScreen from './screens/PaymentScreen';
import VerifyScreen from './screens/VerifyScreen';
import { installAppErrorTracking } from './errorTracking';

installAppErrorTracking();

const EMPTY_FIELD_STATE = { name: '', email: '', password: '' };
const EMPTY_SUCCESS_STATE = { name: false, email: false, password: false };

const ONBOARDING_SLIDES = [
  {
    title: 'Welcome to Matinee',
    body: 'Discover movies and manage your account in one place.',
  },
  {
    title: 'Almost there',
    body: 'Enter the verification code we are sending to your email to finish setting up your account.',
  },
];

export default function App() {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const [booting, setBooting] = useState(true);
  const [stage, setStage] = useState('auth');
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [fieldErrors, setFieldErrors] = useState(EMPTY_FIELD_STATE);
  const [fieldSuccess, setFieldSuccess] = useState(EMPTY_SUCCESS_STATE);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const registrationAttemptRef = useRef(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('token');
        if (storedToken) {
          const me = await api('/me', { token: storedToken });
          if (active) {
            setToken(storedToken);
            setUser(me.user);
            setStage('dashboard');
          }
        }
      } catch (_error) {
        await SecureStore.deleteItemAsync('token');
      } finally {
        setTimeout(() => {
          if (active) setBooting(false);
        }, theme.motion.slow * 2);
      }
    })();
    return () => {
      active = false;
    };
  }, [theme.motion.slow]);

  function clearMessages() {
    setError('');
    setInfo('');
  }

  function resetFieldState() {
    setFieldErrors(EMPTY_FIELD_STATE);
    setFieldSuccess(EMPTY_SUCCESS_STATE);
  }

  function handleFieldBlur(key, label, value) {
    const message = validateField(key, label, value, mode);
    setFieldErrors((previous) => ({ ...previous, [key]: message }));
    setFieldSuccess((previous) => ({ ...previous, [key]: !message }));
  }

  function handleNameChange(value) {
    const next = formatNameInput(value);
    setName(next);
    setFieldSuccess((previous) => ({ ...previous, name: false }));
    setFieldErrors((previous) => ({
      ...previous,
      name: next && !isNameValid(next) ? 'Name Must Use Only Letters' : '',
    }));
  }

  function handleEmailChange(value) {
    const next = value.trimEnd().toLowerCase();
    setEmail(next);
    setFieldSuccess((previous) => ({ ...previous, email: false }));
    if (mode === 'register') {
      setFieldErrors((previous) => ({
        ...previous,
        email: next && !isEmailFilled(next, 'register') ? 'Enter A Valid Email Address' : '',
      }));
    } else {
      setFieldErrors((previous) => ({ ...previous, email: '' }));
    }
  }

  function handlePasswordChange(value) {
    const next = value.trimEnd().slice(0, MAX_PASSWORD_LENGTH);
    setPassword(next);
    setFieldSuccess((previous) => ({ ...previous, password: false }));
    setFieldErrors((previous) => ({
      ...previous,
      password: next ? validateField('password', 'Password', next, mode) : '',
    }));
  }

  function toggleMode() {
    setMode((previous) => (previous === 'login' ? 'register' : 'login'));
    registrationAttemptRef.current = null;
    clearMessages();
    resetFieldState();
  }

  function startVerification(forEmail, message) {
    setPendingVerificationEmail(forEmail);
    setVerificationCode('');
    setInfo(message || 'Enter the 6-digit code sent to your email.');
    setError('');
    setStage('verify');
  }

  function backToLogin() {
    setStage('auth');
    setMode('login');
    registrationAttemptRef.current = null;
    setPendingVerificationEmail('');
    setVerificationCode('');
    setPassword('');
    clearMessages();
    resetFieldState();
  }

  async function handleAuth() {
    clearMessages();
    const validated = validateAuthInput(mode, name, email, password);
    if (validated.error) {
      setError(validated.error);
      return;
    }

    setBusy(true);
    try {
      if (mode === 'register') {
        const attemptFingerprint = JSON.stringify([
          validated.trimmedName,
          validated.normalizedEmail,
          validated.trimmedPassword,
        ]);
        if (!registrationAttemptRef.current || registrationAttemptRef.current.fingerprint !== attemptFingerprint) {
          registrationAttemptRef.current = {
            fingerprint: attemptFingerprint,
            key: createIdempotencyKey(),
          };
        }
        const data = await api('/auth/register', {
          method: 'POST',
          headers: { 'Idempotency-Key': registrationAttemptRef.current.key },
          body: JSON.stringify({
            name: validated.trimmedName,
            email: validated.normalizedEmail,
            password: validated.trimmedPassword,
          }),
        });
        registrationAttemptRef.current = null;
        setName(validated.trimmedName);
        setEmail(validated.normalizedEmail);
        setPassword('');
        setPendingVerificationEmail(data.user?.email || validated.normalizedEmail);
        setInfo(data.message || 'A verification code will be sent to your email.');
        setOnboardingStep(0);
        setStage('onboarding');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const data = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: validated.normalizedEmail, password: validated.trimmedPassword }),
        });
        await SecureStore.setItemAsync('token', data.token);
        setToken(data.token);
        setUser(data.user);
        setStage('dashboard');
        setEmail(validated.normalizedEmail);
        setPassword('');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (requestError) {
      if (requestError?.data?.requiresVerification) {
        startVerification(
          requestError.data.email || validated.normalizedEmail,
          requestError.message || 'Enter the 6-digit code sent to your email.',
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setError(requestError.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyCode() {
    const code = verificationCode.trim();
    if (!isVerificationCodeValid(code)) {
      setError('Enter the 6-digit verification code');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const data = await api('/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({ email: pendingVerificationEmail, code }),
      });
      await SecureStore.setItemAsync('token', data.token);
      setToken(data.token);
      setUser(data.user);
      setVerificationCode('');
      clearMessages();
      setStage('dashboard');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (requestError) {
      if (requestError?.data?.requiresResend && requestError?.data?.error) {
        setVerificationCode('');
        setInfo(requestError.data.error);
        setError('');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        setError(requestError.message);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } finally {
      setBusy(false);
    }
  }

  async function resendVerificationCode() {
    setError('');
    setBusy(true);
    try {
      const data = await api('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: pendingVerificationEmail }),
      });
      setInfo(data.message || 'If the account is unverified, a new code will be sent.');
      setVerificationCode('');
    } catch (requestError) {
      setError(requestError.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await SecureStore.deleteItemAsync('token');
    setToken(null);
    setUser(null);
    setSelectedMovieId(null);
    setSelectedMovie(null);
    backToLogin();
  }

  function handleOnboardingNext() {
    const last = onboardingStep === ONBOARDING_SLIDES.length - 1;
    if (last) {
      setStage('verify');
      setInfo('Enter the 6-digit code sent to your email.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setOnboardingStep((step) => step + 1);
      Haptics.selectionAsync();
    }
  }

  function openDiscovery() {
    clearMessages();
    setStage('discovery');
  }

  function openMovie(movieId, initialMovie) {
    setSelectedMovieId(movieId);
    setSelectedMovie(initialMovie || null);
    setStage('movie-details');
  }

  function backToDiscovery() {
    setSelectedMovieId(null);
    setSelectedMovie(null);
    setStage('discovery');
  }

  if (booting) {
    return (
      <SafeAreaView style={styles.splash}>
        <Text accessibilityRole="header" style={styles.splashTitle}>Matinee</Text>
        <ActivityIndicator color={theme.colors.onPrimary} style={styles.splashLoader} />
      </SafeAreaView>
    );
  }

  if (stage === 'about') {
    return <AboutScreen onBack={() => setStage('dashboard')} />;
  }

  if (stage === 'componentGallery') {
    return <ComponentGalleryScreen onBack={() => setStage('dashboard')} />;
  }

  if (stage === 'dashboard' && token && user) {
    return (
      <DashboardScreen
        user={user}
        onOpenDiscovery={openDiscovery}
        onOpenPayments={() => setStage('payments')}
        onOpenAbout={() => setStage('about')}
        onOpenGallery={() => setStage('componentGallery')}
        onLogout={logout}
      />
    );
  }

  if (stage === 'discovery' && token) {
    return <DiscoveryScreen onBack={() => setStage('dashboard')} token={token} onOpenMovie={openMovie} />;
  }

  if (stage === 'movie-details' && token && selectedMovieId !== null) {
    return       <MovieDetailsScreen
        initialMovie={selectedMovie}
        movieId={selectedMovieId}
        onBack={backToDiscovery}
        token={token}
      />;
  }

  if (stage === 'payments' && token && user) {
    return <PaymentScreen onBack={() => setStage('dashboard')} />;
  }

  if (stage === 'onboarding') {
    return (
      <OnboardingScreen
        slides={ONBOARDING_SLIDES}
        step={onboardingStep}
        pendingVerificationEmail={pendingVerificationEmail}
        onNext={handleOnboardingNext}
        onBackToLogin={backToLogin}
      />
    );
  }

  if (stage === 'verify') {
    return (
      <VerifyScreen
        email={pendingVerificationEmail}
        code={verificationCode}
        onCodeChange={(value) => {
          setVerificationCode(value);
          setError('');
        }}
        error={error}
        info={info}
        busy={busy}
        canVerify={!busy && isVerificationCodeValid(verificationCode)}
        onVerify={handleVerifyCode}
        onResend={resendVerificationCode}
        onBackToLogin={backToLogin}
      />
    );
  }

  return (
    <AuthScreen
      mode={mode}
      onToggleMode={toggleMode}
      name={name}
      onNameChange={handleNameChange}
      email={email}
      onEmailChange={handleEmailChange}
      password={password}
      onPasswordChange={handlePasswordChange}
      showPassword={showPassword}
      onTogglePassword={() => setShowPassword((value) => !value)}
      fieldErrors={fieldErrors}
      fieldSuccess={fieldSuccess}
      error={error}
      info={info}
      busy={busy}
      canSubmit={canSubmitAuth({ mode, name, email, password })}
      onBlurField={handleFieldBlur}
      onSubmit={handleAuth}
    />
  );
}

function useStyles(theme) {
  return useMemo(
    () =>
      StyleSheet.create({
        splash: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.primary,
          padding: theme.spacing.large,
        },
        splashTitle: {
          color: theme.colors.onPrimary,
          ...theme.typography.displaySmall,
        },
        splashLoader: {
          marginTop: theme.spacing.base,
        },
      }),
    [theme],
  );
}
