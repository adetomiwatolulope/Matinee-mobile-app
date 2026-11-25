import React, { useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as CachedImage } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { BrandHeader, FormField, Message, PrimaryButton, Screen, TextButton } from '../components/ui';
import { passwordRequirementMessage } from '../domain/auth';

const GOOGLE_ICON_URI = 'https://developers.google.com/identity/images/g-logo.png';

export default function AuthScreen({
  mode,
  onToggleMode,
  name,
  onNameChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  showPassword,
  onTogglePassword,
  fieldErrors,
  fieldSuccess,
  error,
  info,
  busy,
  canSubmit,
  onBlurField,
  onSubmit,
}) {
  const { theme } = useTheme();
  const [focusedField, setFocusedField] = useState(null);
  const styles = useStyles(theme);

  function inputStyle(field) {
    const hasError = !!fieldErrors[field];
    const isValid = !!fieldSuccess[field] && !hasError;
    return [
      styles.input,
      {
        backgroundColor: theme.colors.surfaceContainerLowest,
        borderColor: hasError
          ? theme.colors.error
          : focusedField === field
            ? theme.colors.primary
            : isValid
              ? theme.colors.success
              : theme.colors.outlineVariant,
        color: theme.colors.onSurface,
      },
    ];
  }

  function handleTogglePassword() {
    Haptics.selectionAsync();
    onTogglePassword();
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <BrandHeader
          title={mode === 'login' ? 'Welcome back' : 'Create your account'}
          subtitle={mode === 'login' ? 'Sign in to continue to Matinee.' : 'Discover films and manage your bookings in one place.'}
        />

        <View style={styles.form}>
          {mode === 'register' && (
            <FormField label="Name" error={fieldErrors.name}>
              <TextInput
                accessibilityLabel="Name"
                accessibilityHint={fieldErrors.name || 'Enter your full name'}
                accessibilityState={{ invalid: !!fieldErrors.name }}
                autoComplete="name"
                onBlur={() => onBlurField('name', 'Name', name)}
                onChangeText={onNameChange}
                onFocus={() => setFocusedField('name')}
                placeholder="Name"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                style={inputStyle('name')}
                value={name}
              />
            </FormField>
          )}

          <FormField label="Email" error={fieldErrors.email}>
              <TextInput
                accessibilityLabel="Email"
                accessibilityHint={fieldErrors.email || 'Enter your email address'}
                accessibilityState={{ invalid: !!fieldErrors.email }}
                autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onBlur={() => onBlurField('email', 'Email', email)}
              onChangeText={onEmailChange}
              onFocus={() => setFocusedField('email')}
              placeholder="Email"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              style={inputStyle('email')}
              value={email}
            />
          </FormField>

          <FormField label="Password" error={fieldErrors.password}>
            <View style={[inputStyle('password'), styles.passwordContainer]}>
              <TextInput
                accessibilityLabel="Password"
                accessibilityHint={fieldErrors.password || 'Use at least 10 characters with upper and lower case letters, a number, and a special character.'}
                accessibilityState={{ invalid: !!fieldErrors.password }}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                onBlur={() => onBlurField('password', 'Password', password)}
                onChangeText={onPasswordChange}
                onFocus={() => setFocusedField('password')}
                placeholder="Password"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
                value={password}
              />
              {password.length > 0 && (
                <TouchableOpacity
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  accessibilityRole="button"
                  onPress={handleTogglePassword}
                  style={styles.visibilityToggle}
                >
                  <Image
                    accessibilityIgnoresInvertColors
                    source={showPassword ? require('../assets/eye-off.png') : require('../assets/eye.png')}
                    style={styles.visibilityIcon}
                  />
                </TouchableOpacity>
              )}
            </View>
            {password.length > 0 && (
              <Text style={styles.requirementText}>{passwordRequirementMessage(password)}</Text>
            )}
          </FormField>

          {!!error && <Message type="error" text={error} />}
          {!!info && <Message type="success" text={info} />}

          <PrimaryButton
            accessibilityLabel={mode === 'login' ? 'Login' : 'Create account'}
            label={mode === 'login' ? 'Login' : 'Create Account'}
            loading={busy}
            disabled={!canSubmit}
            onPress={onSubmit}
          />

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.outlineVariant }]} />
            <Text style={[theme.typography.labelLarge, { color: theme.colors.onSurfaceVariant }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.outlineVariant }]} />
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Sign in with Google is not available yet"
            accessibilityState={{ disabled: true }}
            disabled
            style={[styles.googleButton, { backgroundColor: theme.colors.disabled, borderColor: theme.colors.outlineVariant }]}
          >
            <CachedImage
              accessible={false}
              cachePolicy="memory-disk"
              contentFit="contain"
              source={{ uri: GOOGLE_ICON_URI }}
              style={styles.googleIcon}
            />
            <Text style={[theme.typography.titleMedium, { color: theme.colors.onDisabled }]}>
              Sign in with Google
            </Text>
          </TouchableOpacity>
          <Text style={[theme.typography.labelSmall, { color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}>
            Coming soon
          </Text>

          <TextButton
            accessibilityLabel={mode === 'login' ? 'Go to registration' : 'Go to login'}
            label={mode === 'login' ? "Don't have an account? Register" : 'Have an account? Login'}
            onPress={onToggleMode}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function useStyles(theme) {
  return useMemo(
    () =>
      StyleSheet.create({
        content: {
          flexGrow: 1,
          justifyContent: 'center',
          padding: theme.spacing.large,
          paddingBottom: theme.spacing.extraLarge,
          rowGap: theme.spacing.large,
        },
        form: {
          rowGap: theme.spacing.extraSmall,
        },
        input: {
          borderWidth: theme.metrics.hairline,
          borderRadius: theme.spacing.extraSmall,
          minHeight: theme.metrics.touchTarget,
          paddingHorizontal: theme.spacing.medium,
          paddingVertical: theme.spacing.medium,
          ...theme.typography.bodyLarge,
        },
        passwordContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: theme.metrics.touchTarget,
          paddingRight: theme.spacing.extraSmall,
          paddingVertical: theme.spacing.none,
        },
        passwordInput: {
          flex: 1,
          color: theme.colors.onSurface,
          minHeight: theme.metrics.touchTarget,
          paddingVertical: theme.spacing.medium,
          ...theme.typography.bodyLarge,
        },
        visibilityToggle: {
          alignItems: 'center',
          justifyContent: 'center',
          width: theme.metrics.touchTarget,
          height: theme.metrics.touchTarget,
        },
        visibilityIcon: {
          width: theme.metrics.icon,
          height: theme.metrics.icon,
        },
        requirementText: {
          color: theme.colors.onSurfaceVariant,
          ...theme.typography.bodySmall,
        },
        dividerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginVertical: theme.spacing.base,
          columnGap: theme.spacing.medium,
        },
        dividerLine: {
          flex: 1,
          height: theme.metrics.hairline,
        },
        googleButton: {
          alignItems: 'center',
          borderWidth: theme.metrics.hairline,
          borderRadius: theme.spacing.extraSmall,
          flexDirection: 'row',
          justifyContent: 'center',
          minHeight: theme.metrics.touchTarget,
          paddingHorizontal: theme.spacing.base,
          paddingVertical: theme.spacing.medium,
          columnGap: theme.spacing.extraSmall,
        },
        googleIcon: {
          width: theme.metrics.icon,
          height: theme.metrics.icon,
        },
      }),
    [theme],
  );
}
