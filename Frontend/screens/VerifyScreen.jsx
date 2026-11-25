import React, { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { BrandHeader, FormField, Message, PrimaryButton, Screen, TextButton } from '../components/ui';

export default function VerifyScreen({
  email,
  code,
  onCodeChange,
  error,
  info,
  busy,
  canVerify,
  onVerify,
  onResend,
  onBackToLogin,
}) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const inputs = useRef([]);

  function updateDigit(index, value) {
    const digits = value.replace(/\D/g, '');
    const next = code.split('');
    while (next.length < theme.metrics.codeLength) next.push('');
    if (!digits) {
      next[index] = '';
      onCodeChange(next.join('').slice(0, theme.metrics.codeLength));
      return;
    }
    digits.split('').forEach((digit, offset) => {
      if (index + offset < theme.metrics.codeLength) next[index + offset] = digit;
    });
    onCodeChange(next.join('').slice(0, theme.metrics.codeLength));
    const focusIndex = Math.min(index + digits.length, theme.metrics.codeLength - 1);
    inputs.current[focusIndex]?.focus();
  }

  function handleKeyPress(index, event) {
    if (event.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BrandHeader
          title="Verify your email"
          subtitle={`Enter the ${theme.metrics.codeLength}-digit code sent to ${email}.`}
        />

        {!!error && <Message type="error" text={error} />}
        {!!info && <Message type="info" text={info} />}

        <FormField label="Verification code">
          <View style={styles.codeRow}>
            {Array.from({ length: theme.metrics.codeLength }).map((_, index) => (
              <TextInput
                key={index}
                ref={(node) => {
                  inputs.current[index] = node;
                }}
                accessibilityLabel={`Verification digit ${index + 1}`}
                accessibilityHint={`Digit ${index + 1} of ${theme.metrics.codeLength}`}
                accessibilityState={{ invalid: !!error }}
                autoComplete="one-time-code"
                keyboardType="number-pad"
                maxLength={theme.metrics.singleCharacter}
                onKeyPress={(event) => handleKeyPress(index, event)}
                onChangeText={(value) => updateDigit(index, value)}
                style={[styles.codeInput, { borderColor: code[index] ? theme.colors.primary : theme.colors.outlineVariant }]}
                value={code[index] || ''}
              />
            ))}
          </View>
        </FormField>

        <View style={styles.actions}>
          <PrimaryButton
            accessibilityLabel="Verify email"
            label="Verify email"
            loading={busy}
            disabled={!canVerify}
            onPress={onVerify}
          />
          <PrimaryButton
            accessibilityLabel="Resend verification code"
            label="Resend verification code"
            loading={busy}
            disabled={busy}
            onPress={onResend}
            variant="secondary"
          />
          <TextButton label="Back to login" onPress={onBackToLogin} />
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
          rowGap: theme.spacing.medium,
        },
        codeRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          columnGap: theme.spacing.extraExtraSmall,
        },
        codeInput: {
          alignItems: 'center',
          borderWidth: theme.metrics.hairline,
          borderRadius: theme.spacing.extraSmall,
          color: theme.colors.onSurface,
          minHeight: theme.metrics.touchTarget,
          minWidth: theme.spacing.veryLarge,
          textAlign: 'center',
          width: theme.spacing.veryLarge,
          padding: theme.spacing.extraSmall,
          ...theme.typography.titleLarge,
        },
        actions: {
          rowGap: theme.spacing.extraSmall,
        },
      }),
    [theme],
  );
}
