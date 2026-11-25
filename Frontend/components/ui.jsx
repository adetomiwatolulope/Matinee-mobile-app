import React, { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text as RNText,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
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

export function Text({ variant = 'bodyMedium', tone = 'onSurface', align = 'left', style, children, ...props }) {
  const { theme } = useTheme();
  const typography = theme.typography[variant] || theme.typography.bodyMedium;
  const color = theme.colors[tone] || theme.colors.onSurface;

  return (
    <RNText {...props} style={[typography, { color, textAlign: align }, style]}>
      {children}
    </RNText>
  );
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
        brandHeaderTopRow: {
          alignItems: 'center',
          height: theme.typography.labelLarge.lineHeight,
          justifyContent: 'center',
          position: 'relative',
          width: '100%',
        },
        iconButton: {
          alignItems: 'center',
          borderRadius: theme.spacing.extraSmall,
          justifyContent: 'center',
        },
        brandHeaderBackButton: {
          height: theme.metrics.touchTarget,
          left: -theme.spacing.medium,
          position: 'absolute',
          top: (theme.typography.labelLarge.lineHeight - theme.metrics.touchTarget) / 2,
          width: theme.metrics.touchTarget,
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
        playBadge: {
          alignItems: 'center',
          bottom: theme.spacing.extraSmall,
          height: theme.spacing.extraLarge,
          justifyContent: 'center',
          position: 'absolute',
          right: theme.spacing.extraSmall,
          width: theme.spacing.extraLarge,
        },
        input: {
          borderWidth: theme.metrics.hairline,
          borderRadius: theme.spacing.extraSmall,
          minHeight: theme.metrics.touchTarget,
          paddingHorizontal: theme.spacing.medium,
          paddingVertical: theme.spacing.extraSmall,
        },
        chip: {
          alignItems: 'center',
          borderRadius: theme.spacing.extraLarge,
          borderWidth: theme.metrics.hairline,
          justifyContent: 'center',
          minHeight: theme.metrics.touchTarget,
          paddingHorizontal: theme.spacing.base,
        },
        badge: {
          alignItems: 'center',
          borderRadius: theme.spacing.extraSmall,
          justifyContent: 'center',
          paddingHorizontal: theme.spacing.extraSmall,
          paddingVertical: theme.spacing.extraExtraSmall,
        },
        sheetBackdrop: {
          flex: 1,
          justifyContent: 'flex-end',
        },
        sheet: {
          borderTopLeftRadius: theme.spacing.large,
          borderTopRightRadius: theme.spacing.large,
          padding: theme.spacing.large,
          rowGap: theme.spacing.medium,
        },
        toast: {
          borderWidth: theme.metrics.hairline,
          borderRadius: theme.spacing.extraSmall,
          padding: theme.spacing.medium,
          rowGap: theme.spacing.extraExtraSmall,
        },
        toastRow: {
          alignItems: 'center',
          columnGap: theme.spacing.extraSmall,
          flexDirection: 'row',
        },
        emptyState: {
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing.large,
          rowGap: theme.spacing.medium,
        },
        emptyStateIcon: {
          alignItems: 'center',
          borderRadius: theme.spacing.extraLarge,
          height: theme.spacing.extraExtraLarge,
          justifyContent: 'center',
          width: theme.spacing.extraExtraLarge,
        },
        seatMap: {
          flexGrow: 1,
        },
        seat: {
          alignItems: 'center',
          borderRadius: theme.spacing.extraExtraSmall,
          height: theme.spacing.base,
          justifyContent: 'center',
          width: theme.spacing.base,
        },
        seatContent: {
          columnGap: theme.spacing.extraExtraSmall,
          flexGrow: 1,
          padding: theme.spacing.extraExtraSmall,
          rowGap: theme.spacing.extraExtraSmall,
        },
        posterFrame: {
          position: 'relative',
          width: theme.metrics.fullWidth,
        },
        movieCard: {
          borderRadius: theme.spacing.medium,
          borderWidth: theme.metrics.hairline,
          overflow: 'hidden',
          width: theme.metrics.fullWidth,
        },
        movieCardBody: {
          padding: theme.spacing.extraSmall,
          rowGap: theme.spacing.extraExtraSmall,
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

export function BackButton({ onPress, accessibilityLabel = 'Go back', style }) {
  const { theme } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={theme.spacing.extraSmall}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: theme.colors.surfaceContainerHigh }, style]}
    >
      <Ionicons color={theme.colors.onSurface} name="arrow-back" size={theme.spacing.large} />
    </Pressable>
  );
}

export function BrandHeader({ title, subtitle, showBrand = true, onBack, backAccessibilityLabel }) {
  const { theme } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.brandHeader}>
      <View style={styles.brandHeaderTopRow}>
        {!!onBack && (
          <BackButton
            accessibilityLabel={backAccessibilityLabel || 'Go back'}
            onPress={onBack}
            style={styles.brandHeaderBackButton}
          />
        )}
        {showBrand && <RNText style={[theme.typography.labelLarge, { color: theme.colors.onSurfaceVariant }]}>MATINEE</RNText>}
      </View>
      <RNText
        accessibilityRole="header"
        style={[theme.typography.headlineLarge, { color: theme.colors.onBackground, textAlign: 'center' }]}
      >
        {title}
      </RNText>
      {!!subtitle && (
        <RNText style={[theme.typography.bodyLarge, { color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}>
          {subtitle}
        </RNText>
      )}
    </View>
  );
}

export function FormField({ label, error, children }) {
  const { theme } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <RNText style={[theme.typography.labelLarge, { color: theme.colors.onSurface }]}>{label}</RNText>
      {children}
      {!!error && (
        <RNText accessibilityRole="alert" style={[theme.typography.bodySmall, { color: theme.colors.onSurfaceVariant }]}>
          {error}
        </RNText>
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
      foreground: theme.colors.onSurfaceVariant,
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
      <RNText style={[theme.typography.bodyMedium, { color: tone.foreground }]}>{tone.prefix}{text}</RNText>
    </View>
  );
}

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  fullWidth = false,
  accessibilityLabel,
}) {
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
    if (isDisabled) return;
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
          width: fullWidth ? theme.metrics.fullWidth : undefined,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Text variant="titleMedium" style={{ color: foreground, textAlign: 'center' }}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export const PrimaryButton = Button;

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
      <RNText style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}>
        {label}
      </RNText>
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
      accessible={false}
      importantForAccessibility="no-hide-descendants"
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
        width={theme.metrics.fullWidth}
        height={theme.spacing.veryLarge * 6}
        borderRadius={theme.spacing.medium}
      />
      <Skeleton width={theme.spacing.veryLarge * 3} height={theme.spacing.medium} />
    </View>
  );
}

export function PosterImage({ uri, title, style, contentFit = 'cover', decorative = false, sharedTransitionTag }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const reducedMotion = useReducedMotion();
  const fallback = (
    <View
      accessible={!decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
      style={[styles.posterFallback, { backgroundColor: theme.colors.surfaceContainer }]}
    >
      <RNText
        accessibilityRole="text"
        style={[theme.typography.titleLarge, { color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}
      >
        {title}
      </RNText>
    </View>
  );

  const frameStyle = [
    { aspectRatio: theme.metrics.posterAspectRatio, overflow: 'hidden' },
    style,
  ];

  if (!uri) return <View style={frameStyle}>{fallback}</View>;

  const transitionTag = !reducedMotion ? sharedTransitionTag : undefined;

  return (
    <View style={frameStyle}>
      <View style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants">
        {fallback}
      </View>
      <Animated.View style={StyleSheet.absoluteFill} sharedTransitionTag={transitionTag}>
        <Image
          accessible={!decorative}
          accessibilityLabel={decorative ? undefined : `Poster for ${title}`}
          cachePolicy="memory-disk"
          contentFit={contentFit}
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          transition={theme.motion.image}
        />
      </Animated.View>
    </View>
  );
}

export function PlayBadge() {
  const { theme } = useTheme();
  const styles = useStyles();

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.playBadge,
        {
          backgroundColor: theme.colors.primary,
          borderRadius: theme.spacing.extraLarge,
        },
        theme.effects.mediumShadow,
      ]}
    >
      <Ionicons
        accessible={false}
        color={theme.colors.onPrimary}
        importantForAccessibility="no-hide-descendants"
        name="play"
        size={theme.spacing.smallLarge}
      />
    </View>
  );
}

export function SearchIcon() {
  const { theme } = useTheme();

  return (
    <Ionicons
      accessible={false}
      color={theme.colors.onSurfaceVariant}
      importantForAccessibility="no-hide-descendants"
      name="search-outline"
      size={theme.metrics.icon}
    />
  );
}

export function Input({
  label,
  error,
  helper,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  disabled = false,
  accessibilityLabel,
  ...props
}) {
  const { theme } = useTheme();
  const styles = useStyles();

  return (
    <FormField label={label} error={error}>
      <TextInput
        {...props}
        accessibilityLabel={accessibilityLabel || label}
        accessibilityState={{ disabled: !!disabled, invalid: !!error }}
        editable={!disabled}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        secureTextEntry={secureTextEntry}
        style={[
          theme.typography.bodyLarge,
          styles.input,
          {
            backgroundColor: theme.colors.surfaceContainerLowest,
            borderColor: error ? theme.colors.error : theme.colors.outlineVariant,
            color: theme.colors.onSurface,
          },
        ]}
        value={value}
      />
      {!!helper && !error && (
        <Text variant="bodySmall" tone="onSurfaceVariant">
          {helper}
        </Text>
      )}
    </FormField>
  );
}

export function Chip({ label, selected = false, disabled = false, onPress }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const background = disabled
    ? theme.colors.disabled
    : selected
      ? theme.colors.primaryContainer
      : theme.colors.surfaceContainerLow;
  const borderColor = disabled ? theme.colors.disabled : selected ? theme.colors.primary : theme.colors.outlineVariant;
  const foreground = disabled
    ? theme.colors.onDisabled
    : selected
      ? theme.colors.onPrimaryContainer
      : theme.colors.onSurfaceVariant;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      disabled={!!disabled}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: background, borderColor }]}
    >
      <Text variant="labelLarge" style={{ color: foreground, textAlign: 'center' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function Badge({ label, tone = 'neutral' }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const tones = {
    neutral: {
      background: theme.colors.surfaceContainerHighest,
      foreground: theme.colors.onSurfaceVariant,
    },
    primary: {
      background: theme.colors.primaryContainer,
      foreground: theme.colors.onPrimaryContainer,
    },
    success: {
      background: theme.colors.successContainer,
      foreground: theme.colors.onSuccessContainer,
    },
    warning: {
      background: theme.colors.warningContainer,
      foreground: theme.colors.onWarningContainer,
    },
    error: {
      background: theme.colors.errorContainer,
      foreground: theme.colors.onErrorContainer,
    },
  };
  const palette = tones[tone] || tones.neutral;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[styles.badge, { backgroundColor: palette.background }]}
    >
      <Text variant="labelSmall" style={{ color: palette.foreground, textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  );
}

export function BottomSheet({ visible, title, children, onClose, actionLabel, onAction }) {
  const { theme } = useTheme();
  const styles = useStyles();

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose}>
      <Pressable
        accessibilityLabel="Close bottom sheet"
        onPress={onClose}
        style={[styles.sheetBackdrop, { backgroundColor: theme.colors.skeleton }]}
      >
        <View
          accessible
          accessibilityRole="alert"
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              borderWidth: theme.metrics.hairline,
            },
          ]}
        >
          <Text variant="titleLarge" tone="onSurface">
            {title}
          </Text>
          {children}
          {!!actionLabel && <Button label={actionLabel} onPress={onAction} fullWidth />}
          <Button label="Close" onPress={onClose} variant="secondary" fullWidth />
        </View>
      </Pressable>
    </Modal>
  );
}

export function Toast({ visible, message, tone = 'info', actionLabel, onAction, onDismiss }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const tones = {
    info: {
      background: theme.colors.infoContainer,
      border: theme.colors.info,
      foreground: theme.colors.onInfoContainer,
    },
    success: {
      background: theme.colors.successContainer,
      border: theme.colors.success,
      foreground: theme.colors.onSuccessContainer,
    },
    error: {
      background: theme.colors.errorContainer,
      border: theme.colors.error,
      foreground: theme.colors.onErrorContainer,
    },
  };
  const palette = tones[tone] || tones.info;

  if (!visible) return null;

  return (
    <View
      accessibilityRole="alert"
      style={[styles.toast, { backgroundColor: palette.background, borderColor: palette.border }]}
    >
      <View style={styles.toastRow}>
        <Text variant="bodyMedium" style={{ color: palette.foreground, flex: 1 }}>
          {message}
        </Text>
        {!!onDismiss && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification"
            onPress={onDismiss}
            style={{ minHeight: theme.metrics.touchTarget, justifyContent: 'center' }}
          >
            <Text variant="labelLarge" style={{ color: palette.foreground }}>
              Dismiss
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {!!actionLabel && <Button label={actionLabel} onPress={onAction} variant="secondary" />}
    </View>
  );
}

export function EmptyState({ title, message, actionLabel, onAction }) {
  const { theme } = useTheme();
  const styles = useStyles();

  return (
    <View style={[styles.emptyState, { padding: theme.spacing.large }]}>
      <View style={[styles.emptyStateIcon, { backgroundColor: theme.colors.primaryContainer }]}>
        <Ionicons
          accessible={false}
          color={theme.colors.onPrimaryContainer}
          importantForAccessibility="no-hide-descendants"
          name="film-outline"
          size={theme.spacing.base}
        />
      </View>
      <Text variant="titleLarge" align="center" tone="onSurface">
        {title}
      </Text>
      <Text variant="bodyMedium" align="center" tone="onSurfaceVariant">
        {message}
      </Text>
      {!!actionLabel && <Button label={actionLabel} onPress={onAction} variant="secondary" />}
    </View>
  );
}

export const StatePanel = EmptyState;

export function MovieCard({ movie, onPress, showPlayBadge = true, subtitle, style }) {
  const { theme } = useTheme();
  const styles = useStyles();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`View details for ${movie.title}`}
      accessibilityHint="Open movie details"
      onPress={onPress}
      style={[
        styles.movieCard,
        {
          backgroundColor: theme.colors.surfaceContainerLowest,
          borderColor: theme.colors.outlineVariant,
        },
        style,
      ]}
    >
      <View style={styles.posterFrame}>
        <PosterImage
          decorative
          sharedTransitionTag={`movie-poster-${movie.tmdbId}`}
          title={movie.title}
          uri={movie.posterUrl}
        />
        {!!showPlayBadge && <PlayBadge />}
      </View>
      <View style={styles.movieCardBody}>
        <Text variant="titleMedium" numberOfLines={2} tone="onSurface">
          {movie.title}
        </Text>
        <Text variant="bodySmall" tone="onSurfaceVariant">
          {subtitle || (typeof movie.rating === 'number' ? `Rating ${movie.rating.toFixed(1)}` : 'Details available')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function SeatMap({ seats, selectedSeatIds = [], onSeatPress, columns = 15 }) {
  const { theme } = useTheme();
  const styles = useStyles();

  const palette = {
    available: {
      background: theme.colors.surfaceContainerLowest,
      border: theme.colors.outlineVariant,
      foreground: theme.colors.onSurfaceVariant,
    },
    selected: {
      background: theme.colors.primary,
      border: theme.colors.primary,
      foreground: theme.colors.onPrimary,
    },
    held: {
      background: theme.colors.warningContainer,
      border: theme.colors.warning,
      foreground: theme.colors.onWarningContainer,
    },
    sold: {
      background: theme.colors.disabled,
      border: theme.colors.outline,
      foreground: theme.colors.onDisabled,
    },
    wheelchair: {
      background: theme.colors.tertiaryContainer,
      border: theme.colors.tertiary,
      foreground: theme.colors.onTertiaryContainer,
    },
  };

  function renderSeat({ item }) {
    const selected = selectedSeatIds.includes(item.id);
    const status = selected ? 'selected' : item.status || 'available';
    const colors = palette[status] || palette.available;
    const canPress = status === 'available' || status === 'selected' || status === 'wheelchair';

    return (
      <Pressable
        accessibilityLabel={`Seat ${item.label}, ${status}${item.wheelchairAccessible ? ', wheelchair accessible' : ''}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canPress, selected }}
        disabled={!canPress}
        hitSlop={theme.spacing.extraExtraSmall}
        onPress={() => onSeatPress && onSeatPress(item)}
        style={[styles.seat, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: theme.metrics.hairline }]}
      >
        <Text variant="labelSmall" style={{ color: colors.foreground, textAlign: 'center' }}>
          {item.label}
        </Text>
      </Pressable>
    );
  }

  return (
    <FlatList
      columnGap={theme.spacing.extraExtraSmall}
      contentContainerStyle={styles.seatContent}
      data={seats}
      extraData={selectedSeatIds}
      initialNumToRender={theme.metrics.listInitialBatch}
      keyExtractor={(item) => item.id}
      maxToRenderPerBatch={theme.metrics.listBatch}
      numColumns={columns}
      removeClippedSubviews
      renderItem={renderSeat}
      rowGap={theme.spacing.extraExtraSmall}
      style={styles.seatMap}
      windowSize={theme.metrics.listWindow}
    />
  );
}

export function SectionTitle({ children, action }) {
  const { theme } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.sectionTitle}>
      <RNText style={[theme.typography.titleLarge, { color: theme.colors.onSurface }]}>{children}</RNText>
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
      accessibilityHint="Open the TMDB website"
      accessibilityState={{ disabled: false }}
      onPress={openAttribution}
      style={[styles.attribution, { minHeight: theme.metrics.touchTarget }]}
    >
      <RNText style={[theme.typography.labelSmall, { color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}>
        {attribution.notice}
      </RNText>
      <RNText style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}>
        {attribution.name}
      </RNText>
    </TouchableOpacity>
  );
}

export function StaleNotice() {
  return <Message type="info" text="Showing recently saved results. Fresh results are temporarily unavailable." />;
}
