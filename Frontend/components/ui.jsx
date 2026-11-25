import React, { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  SlideInLeft,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduced(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      if (subscription && typeof subscription.remove === 'function') subscription.remove();
    };
  }, []);

  return reduced;
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        screen: {
          flex: 1,
        },
        screenContent: {
          flex: 1,
        },
        brandHeader: {
          alignItems: 'center',
          rowGap: theme.spacing.extraSmall,
        },
        field: {
          marginBottom: theme.spacing.medium,
          rowGap: theme.spacing.extraExtraSmall,
        },
        message: {
          borderRadius: theme.spacing.extraSmall,
          borderWidth: theme.metrics.hairline,
          marginBottom: theme.spacing.medium,
          padding: theme.spacing.medium,
        },
        button: {
          alignItems: 'center',
          borderWidth: theme.metrics.hairline,
          justifyContent: 'center',
          marginTop: theme.spacing.extraSmall,
        },
        textButton: {
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: theme.spacing.smallLarge,
        },
        card: {
          borderRadius: theme.spacing.medium,
          padding: theme.spacing.large,
          ...theme.effects.softShadow,
        },
        skeleton: {
          overflow: 'hidden',
        },
        posterFallback: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing.base,
        },
        statePanel: {
          alignItems: 'center',
          justifyContent: 'center',
          rowGap: theme.spacing.medium,
        },
        sectionTitle: {
          alignItems: 'flex-start',
          justifyContent: 'center',
          marginTop: theme.spacing.large,
        },
        attribution: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: theme.spacing.large,
          rowGap: theme.spacing.extraExtraSmall,
        },
      }),
    [theme],
  );
}

export function Screen({ children, direction = 'forward', contentStyle }) {
  const { theme, colorScheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const styles = useStyles();
  const entering = reducedMotion
    ? FadeIn.duration(theme.motion.instant)
    : direction === 'back'
      ? SlideInLeft.duration(theme.motion.normal)
      : SlideInRight.duration(theme.motion.normal);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Animated.View style={[styles.screenContent, contentStyle]} entering={entering}>
        {children}
      </Animated.View>
    </SafeAreaView>
  );
}

export function BrandHeader({ title, subtitle, showBrand = true }) {
  const { theme } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.brandHeader}>
      {showBrand && <Text style={[theme.typography.labelLarge, { color: theme.colors.primary }]}>MATINEE</Text>}
      <Text
        accessibilityRole="header"
        style={[theme.typography.headlineLarge, { color: theme.colors.onBackground, textAlign: 'center' }]}
      >
        {title}
      </Text>
      {!!subtitle && (
        <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

export function FormField({ label, error, children }) {
  const { theme } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text style={[theme.typography.labelLarge, { color: theme.colors.onSurface }]}>{label}</Text>
      {children}
      {!!error && (
        <Text accessibilityRole="alert" style={[theme.typography.bodySmall, { color: theme.colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

export function Message({ type, text }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const map = {
    error: {
      background: theme.colors.errorContainer,
      foreground: theme.colors.onErrorContainer,
      prefix: 'Error: ',
    },
    success: {
      background: theme.colors.successContainer,
      foreground: theme.colors.onSuccessContainer,
      prefix: 'Success: ',
    },
    info: {
      background: theme.colors.infoContainer,
      foreground: theme.colors.onInfoContainer,
      prefix: 'Info: ',
    },
  };
  const tone = map[type] || map.info;

  return (
    <View
      accessibilityRole="alert"
      style={[styles.message, { backgroundColor: tone.background, borderColor: tone.foreground }]}
    >
      <Text style={[theme.typography.bodyMedium, { color: tone.foreground }]}>{tone.prefix}{text}</Text>
    </View>
  );
}

export function PrimaryButton({ label, onPress, loading, disabled, variant = 'primary', accessibilityLabel }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const secondary = variant === 'secondary';
  const isDisabled = disabled || loading;
  const background = isDisabled
    ? theme.colors.disabled
    : secondary
      ? theme.colors.surfaceContainerHigh
      : theme.colors.primary;
  const foreground = isDisabled
    ? theme.colors.onDisabled
    : secondary
      ? theme.colors.onSurface
      : theme.colors.onPrimary;

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={!!isDisabled}
      onPress={handlePress}
      style={[
        styles.button,
        {
          backgroundColor: background,
          borderColor: secondary ? theme.colors.outlineVariant : background,
          minHeight: theme.metrics.touchTarget,
          borderRadius: theme.spacing.extraSmall,
          paddingHorizontal: theme.spacing.base,
          paddingVertical: theme.spacing.medium,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Text style={[theme.typography.titleMedium, { color: foreground, textAlign: 'center' }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

export function TextButton({ label, onPress, accessibilityLabel }) {
  const { theme } = useTheme();
  const styles = useStyles();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      onPress={onPress}
      style={[styles.textButton, { minHeight: theme.metrics.touchTarget }]}
    >
      <Text style={[theme.typography.bodyMedium, { color: theme.colors.primary, textAlign: 'center' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function Card({ children, style }) {
  const { theme } = useTheme();
  const styles = useStyles();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceContainerLowest,
          borderColor: theme.colors.outlineVariant,
          borderWidth: theme.metrics.hairline,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Skeleton({ width, height, borderRadius }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const reducedMotion = useReducedMotion();
  const translate = useSharedValue(-1);

  useEffect(() => {
    if (reducedMotion) return undefined;
    translate.value = withRepeat(
      withSequence(
        withTiming(0, { duration: theme.motion.shimmer }),
        withTiming(1, { duration: theme.motion.shimmer }),
      ),
      -1,
      false,
    );
    return undefined;
  }, [reducedMotion, theme.motion.shimmer, translate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: `${translate.value * theme.metrics.shimmerScale + theme.metrics.shimmerStartOffset}%`,
      },
    ],
  }));

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: borderRadius ?? theme.spacing.extraSmall,
          backgroundColor: theme.colors.skeleton,
        },
      ]}
    >
      {!reducedMotion && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            animatedStyle,
            {
              backgroundColor: theme.colors.skeletonHighlight,
              width: theme.metrics.shimmerWidth,
            },
          ]}
        />
      )}
    </View>
  );
}

export function SkeletonCard() {
  const { theme } = useTheme();
  return (
    <View style={{ rowGap: theme.spacing.extraSmall }}>
      <Skeleton
        width={theme.spacing.veryLarge * 4}
        height={theme.spacing.veryLarge * 6}
        borderRadius={theme.spacing.medium}
      />
      <Skeleton width={theme.spacing.veryLarge * 3} height={theme.spacing.medium} />
    </View>
  );
}

export function PosterImage({ uri, title, style, contentFit = 'cover' }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const fallback = (
    <View style={[styles.posterFallback, { backgroundColor: theme.colors.surfaceContainer }]}>
      <Text
        accessibilityRole="text"
        style={[theme.typography.titleLarge, { color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}
      >
        {title}
      </Text>
    </View>
  );

  if (!uri) return <View style={[{ aspectRatio: theme.metrics.posterAspectRatio }, style]}>{fallback}</View>;

  return (
    <Image
      accessible
      accessibilityLabel={`Poster for ${title}`}
      cachePolicy="memory-disk"
      contentFit={contentFit}
      placeholder={fallback}
      source={{ uri }}
      style={[{ aspectRatio: theme.metrics.posterAspectRatio }, style]}
      transition={theme.motion.image}
    />
  );
}

export function StatePanel({ title, message, actionLabel, onAction }) {
  const { theme } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.statePanel, { padding: theme.spacing.large }]}>
      <View
        style={[
          {
            backgroundColor: theme.colors.primaryContainer,
            borderRadius: theme.spacing.medium,
            width: theme.spacing.extraExtraLarge,
            height: theme.spacing.extraExtraLarge,
          },
        ]}
      />
      <Text style={[theme.typography.titleLarge, { color: theme.colors.onSurface, textAlign: 'center' }]}>
        {title}
      </Text>
      <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}>
        {message}
      </Text>
      {!!actionLabel && <PrimaryButton label={actionLabel} onPress={onAction} variant="secondary" />}
    </View>
  );
}

export function SectionTitle({ children, action }) {
  const { theme } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.sectionTitle}>
      <Text style={[theme.typography.titleLarge, { color: theme.colors.onSurface }]}>{children}</Text>
      {action}
    </View>
  );
}

export function AttributionFooter({ attribution }) {
  const { theme } = useTheme();
  const styles = useStyles();
  if (!attribution) return null;

  function openAttribution() {
    if (typeof attribution.link === 'string' && attribution.link.startsWith('https://')) {
      Linking.openURL(attribution.link);
    }
  }

  return (
    <TouchableOpacity
      accessibilityRole="link"
      accessibilityLabel="TMDB attribution"
      onPress={openAttribution}
      style={styles.attribution}
    >
      <Text style={[theme.typography.labelSmall, { color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}>
        {attribution.notice}
      </Text>
      <Text style={[theme.typography.labelMedium, { color: theme.colors.primary, textAlign: 'center' }]}>
        {attribution.name}
      </Text>
    </TouchableOpacity>
  );
}

export function StaleNotice() {
  return <Message type="info" text="Showing recently saved results. Fresh results are temporarily unavailable." />;
}
