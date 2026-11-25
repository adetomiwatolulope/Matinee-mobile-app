import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../theme/ThemeContext';
import { BrandHeader, PrimaryButton, Screen, TextButton } from '../components/ui';

export default function OnboardingScreen({ slides, step, pendingVerificationEmail, onNext, onBackToLogin }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const slide = slides[step];
  const last = step === slides.length - 1;

  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={[styles.heroMark, { backgroundColor: theme.colors.primaryContainer }]}>
            <Image
              accessible
              accessibilityLabel="Matinee logo"
              contentFit="contain"
              source={require('../assets/android-icon-foreground.png')}
              style={[styles.heroLogo, { tintColor: theme.colors.primary }]}
            />
          </View>
          <Text style={[theme.typography.labelMedium, { color: theme.colors.primary }]}>MATINEE</Text>
        </View>

        <BrandHeader title={slide.title} subtitle={slide.body} showBrand={false} />

        {last && !!pendingVerificationEmail && (
          <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}>
            We are sending a code to {pendingVerificationEmail}.
          </Text>
        )}

        <View style={styles.progress} accessibilityLabel={`Step ${step + 1} of ${slides.length}`}>
          {slides.map((item, index) => (
            <View
              key={item.title}
              accessibilityRole="progressbar"
              accessibilityState={{ selected: index === step }}
              style={[
                styles.progressDot,
                {
                  backgroundColor: index === step ? theme.colors.primary : theme.colors.surfaceContainerHigh,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            accessibilityLabel={last ? 'Continue to verification' : 'Next onboarding step'}
            label={last ? 'Continue to verification' : 'Next'}
            onPress={onNext}
          />
          <TextButton label="Already have an account? Login" onPress={onBackToLogin} />
        </View>
      </View>
    </Screen>
  );
}

function useStyles(theme) {
  return useMemo(
    () =>
      StyleSheet.create({
        content: {
          flex: 1,
          justifyContent: 'center',
          padding: theme.spacing.large,
          rowGap: theme.spacing.large,
        },
        hero: {
          alignItems: 'center',
          justifyContent: 'center',
          rowGap: theme.spacing.medium,
        },
        heroMark: {
          width: theme.spacing.extraLarge * 3,
          height: theme.spacing.extraLarge * 3,
          borderRadius: theme.spacing.extraLarge,
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing.medium,
        },
        heroLogo: {
          width: theme.spacing.large * 3,
          height: theme.spacing.large * 3,
        },
        progress: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          columnGap: theme.spacing.extraSmall,
        },
        progressDot: {
          width: theme.spacing.medium,
          height: theme.spacing.medium,
          borderRadius: theme.spacing.extraSmall,
        },
        actions: {
          rowGap: theme.spacing.extraSmall,
        },
      }),
    [theme],
  );
}
