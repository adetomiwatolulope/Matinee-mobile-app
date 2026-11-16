import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { colors, spacing, typography, effects } from './designTokens';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.183:3001';

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [stage, setStage] = useState('onboarding'); // onboarding | auth | dashboard
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('register'); // register | login
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [verifyVisible, setVerifyVisible] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [code, setCode] = useState('');

  const onboardingSlides = [
    { title: 'Welcome to Mantinee', body: 'Discover movies and manage your account in one place.' },
    { title: 'Create your account', body: 'Register and verify your email to get started.' },
  ];

  const canSubmit =
    mode === 'register'
      ? !!(name.trim() && email.trim() && password && password.length >= 8)
      : !!(email.trim() && password);

  useEffect(() => {
    (async () => {
      try {
        const t = await SecureStore.getItemAsync('token');
        if (t) {
          const me = await api('/me', { headers: { Authorization: `Bearer ${t}` } });
          setToken(t);
          setUser(me.user);
          setStage('dashboard');
        }
      } catch (_e) {
        await SecureStore.deleteItemAsync('token');
      } finally {
        setTimeout(() => setBooting(false), 600);
      }
    })();
  }, []);

  function openVerifyModal(forEmail, message) {
    setVerifyEmail(forEmail);
    setCode('');
    setInfo(message || 'Enter the 6-digit code sent to your email.');
    setError('');
    setVerifyVisible(true);
  }

  async function handleAuth() {
    setError('');
    setInfo('');
    if (mode === 'register' && !name.trim()) return setError('Name is required');
    if (!email.trim()) return setError('Email is required');
    if (!password) return setError('Password is required');
    if (mode === 'register' && password.length < 8) return setError('Password must be at least 8 characters');
    setBusy(true);
    try {
      if (mode === 'register') {
        const data = await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        });
        setPassword('');
        openVerifyModal(data.user?.email || email.trim().toLowerCase(), data.message || 'Verification code sent to email');
      } else {
        const data = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        await SecureStore.setItemAsync('token', data.token);
        setToken(data.token);
        setUser(data.user);
        setStage('dashboard');
        setPassword('');
      }
    } catch (e) {
      if (e?.data?.requiresVerification) {
        openVerifyModal(e.data.email || email.trim().toLowerCase(), e.message || 'Please verify your email.');
      } else {
        setError(e.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setError('');
    if (!code.trim()) return setError('Enter the 6-digit code');
    setBusy(true);
    try {
      const data = await api('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email: verifyEmail, code: code.trim() }),
      });
      await SecureStore.setItemAsync('token', data.token);
      setToken(data.token);
      setUser(data.user);
      setVerifyVisible(false);
      setStage('dashboard');
      setName('');
      setEmail('');
      setPassword('');
      setCode('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setError('');
    setBusy(true);
    try {
      const data = await api('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: verifyEmail }),
      });
      setInfo(data.message || 'Verification code resent');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await SecureStore.deleteItemAsync('token');
    setToken(null);
    setUser(null);
    setStage('auth');
    setMode('login');
    setInfo('');
    setError('');
  }

  if (booting) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashTitle} accessibilityRole="header">Mantinee</Text>
        <ActivityIndicator size="large" color={colors.onPrimary} style={{ marginTop: spacing.base }} />
        <StatusBar style="light" />
      </View>
    );
  }

  if (stage === 'dashboard' && token && user) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.headline} accessibilityRole="header">Dashboard</Text>
            <View style={styles.infoBox}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.bodyText}>{user.name}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.bodyText}>{user.email}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.label}>Email status</Text>
              <Text style={[styles.bodyText, user.emailVerified ? styles.statusSuccess : styles.statusError]}>
                {user.emailVerified ? 'Verified' : 'Not verified'}
              </Text>
            </View>
            <PrimaryButton label="Logout" onPress={logout} variant="secondary" />
          </View>
        </ScrollView>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  if (stage === 'onboarding') {
    const slide = onboardingSlides[onboardingStep];
    const last = onboardingStep === onboardingSlides.length - 1;
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.onboardContainer}>
          <Text style={styles.kicker}>Onboarding</Text>
          <Text style={styles.headline} accessibilityRole="header">{slide.title}</Text>
          <Text style={styles.bodyText}>{slide.body}</Text>
          <PrimaryButton
            label={last ? 'Create account' : 'Next'}
            onPress={() => {
              if (last) {
                setStage('auth');
                setMode('register');
              } else {
                setOnboardingStep((s) => s + 1);
              }
            }}
          />
          <TouchableOpacity onPress={() => { setStage('auth'); setMode('login'); }} accessibilityRole="button">
            <Text style={styles.link}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.headline} accessibilityRole="header">{mode === 'login' ? 'Login' : 'Create account'}</Text>
        {mode === 'register' && (
          <Field label="Name">
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor={colors.onSurfaceVariant}
              value={name}
              onChangeText={setName}
              accessibilityLabel="Name"
            />
          </Field>
        )}
        <Field label="Email">
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.onSurfaceVariant}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            accessibilityLabel="Email"
          />
        </Field>
        <Field label="Password">
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.onSurfaceVariant}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            accessibilityLabel="Password"
          />
        </Field>

        {!!error && <Message type="error" text={error} />}
        {!!info && !verifyVisible && <Message type="success" text={info} />}

        <PrimaryButton
          label={mode === 'login' ? 'Login' : 'Create account'}
          onPress={handleAuth}
          loading={busy}
          disabled={busy || !canSubmit}
        />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.googleButton} accessibilityRole="button" accessibilityLabel="Sign in with Google">
          <Image
            source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
            style={styles.googleIcon}
            accessibilityIgnoresInvertColors
          />
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setInfo(''); }}
          accessibilityRole="button"
        >
          <Text style={styles.link}>{mode === 'login' ? "Don't have an account? Register" : 'Have an account? Login'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={verifyVisible} transparent animationType="slide" onRequestClose={() => setVerifyVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.titleLarge} accessibilityRole="header">Verify your email</Text>
            <Text style={styles.bodyText}>We sent a 6-digit code to {verifyEmail}.</Text>
            <Field label="Verification code">
              <TextInput
                style={styles.input}
                placeholder="6-digit code"
                placeholderTextColor={colors.onSurfaceVariant}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                accessibilityLabel="6-digit verification code"
              />
            </Field>
            {!!error && <Message type="error" text={error} />}
            {!!info && <Message type="info" text={info} />}
            <PrimaryButton label="Verify" onPress={verifyCode} loading={busy} disabled={busy} />
            <PrimaryButton label="Resend code" onPress={resendCode} loading={busy} disabled={busy} variant="secondary" />
            <TouchableOpacity onPress={() => setVerifyVisible(false)} accessibilityRole="button">
              <Text style={styles.link}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

function Field({ label, children }) {
  return (
    <View style={{ marginBottom: spacing.medium }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Message({ type, text }) {
  const map = {
    error: { bg: colors.errorContainer, fg: colors.onErrorContainer, prefix: 'Error: ' },
    success: { bg: colors.successContainer, fg: colors.onSuccessContainer, prefix: 'Success: ' },
    info: { bg: colors.infoContainer, fg: colors.onInfoContainer, prefix: 'Info: ' },
  };
  const s = map[type] || map.info;
  return (
    <View style={[styles.message, { backgroundColor: s.bg }]} accessibilityRole="alert">
      <Text style={[styles.messageText, { color: s.fg }]}>{s.prefix}{text}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress, loading, disabled, variant = 'primary' }) {
  const secondary = variant === 'secondary';
  return (
    <TouchableOpacity
      style={[styles.button, secondary ? styles.buttonSecondary : styles.buttonPrimary, (disabled || loading) && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: !!loading }}
    >
      {loading ? <ActivityIndicator color={secondary ? colors.onNeutral : colors.onPrimary} /> : <Text style={[styles.buttonText, secondary ? styles.buttonTextSecondary : styles.buttonTextPrimary]}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.large,
  },
  splashTitle: {
    ...typography.displaySmall,
    color: colors.onPrimary,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.large,
    paddingBottom: spacing.extraLarge,
  },
  onboardContainer: {
    flex: 1,
    padding: spacing.large,
    justifyContent: 'center',
  },
  kicker: {
    ...typography.labelLarge,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.extraSmall,
    textAlign: 'center',
  },
  headline: {
    ...typography.headlineLarge,
    color: colors.onSurface,
    marginBottom: spacing.base,
    textAlign: 'center',
  },
  titleLarge: {
    ...typography.titleLarge,
    color: colors.onSurface,
    marginBottom: spacing.extraSmall,
    textAlign: 'center',
  },
  bodyText: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    marginBottom: spacing.extraSmall,
    textAlign: 'center',
  },
  label: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
  },
  fieldLabel: {
    ...typography.labelLarge,
    color: colors.onSurface,
    marginBottom: spacing.extraExtraSmall,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.medium,
    padding: spacing.large,
    ...effects.softShadow,
  },
  infoBox: {
    marginBottom: spacing.medium,
  },
  statusSuccess: { color: colors.success },
  statusError: { color: colors.error },
  input: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    borderRadius: spacing.extraSmall,
    padding: spacing.medium,
    color: colors.onSurface,
    ...typography.bodyLarge,
  },
  button: {
    paddingVertical: spacing.medium,
    paddingHorizontal: spacing.base,
    borderRadius: spacing.extraSmall,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.extraSmall,
    minHeight: 48,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.neutralContainer,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.titleMedium,
  },
  buttonTextPrimary: {
    color: colors.onPrimary,
  },
  buttonTextSecondary: {
    color: colors.onNeutralContainer,
  },
  link: {
    ...typography.bodyMedium,
    marginTop: spacing.base,
    color: colors.secondary,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.base,
    marginBottom: spacing.base,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surfaceVariant,
  },
  dividerText: {
    ...typography.labelLarge,
    color: colors.onSurfaceVariant,
    marginHorizontal: spacing.medium,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    borderRadius: spacing.extraSmall,
    paddingVertical: spacing.medium,
    paddingHorizontal: spacing.base,
    minHeight: 48,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: spacing.extraSmall,
  },
  googleButtonText: {
    ...typography.titleMedium,
    color: colors.onSurface,
  },
  message: {
    borderRadius: spacing.extraSmall,
    padding: spacing.medium,
    marginBottom: spacing.medium,
  },
  messageText: {
    ...typography.bodyMedium,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,26,26,0.5)',
    justifyContent: 'center',
    padding: spacing.large,
  },
  modalCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.medium,
    padding: spacing.large,
    ...effects.mediumShadow,
  },
});
