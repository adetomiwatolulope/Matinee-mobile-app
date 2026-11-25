import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { BrandHeader, Card, PrimaryButton, Screen } from '../components/ui';

export default function DashboardScreen({ user, onOpenDiscovery, onOpenPayments, onOpenAbout, onOpenGallery, onLogout }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onLongPress={onOpenGallery} style={styles.headerGesture}>
          <BrandHeader title={`Hello, ${user.name}`} subtitle="What would you like to watch?" />
        </Pressable>

        <Card style={styles.card}>
          <Text style={[theme.typography.titleLarge, { color: theme.colors.onSurface }]}>Discover films</Text>
          <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant }]}>
            Browse films currently showing and look up details.
          </Text>
          <PrimaryButton label="Open discovery" onPress={onOpenDiscovery} />
        </Card>

        <Card style={styles.card}>
          <Text style={[theme.typography.titleLarge, { color: theme.colors.onSurface }]}>Checkout & payments</Text>
          <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant }]}>
            Review the server-authorised checkout and payment status flow.
          </Text>
          <PrimaryButton label="Open payments" onPress={onOpenPayments} variant="secondary" />
        </Card>

        <Card style={styles.card}>
          <Text style={[theme.typography.titleLarge, { color: theme.colors.onSurface }]}>Account</Text>
          <InfoRow label="Name" value={user.name} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow
            label="Email status"
            value={user.emailVerified ? 'Verified' : 'Not verified'}
            tone={user.emailVerified ? 'success' : 'error'}
          />
          <PrimaryButton label="About & credits" onPress={onOpenAbout} variant="secondary" />
          <PrimaryButton label="Logout" onPress={onLogout} variant="secondary" />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function InfoRow({ label, value, tone }) {
  const { theme } = useTheme();
  const color = theme.colors.onSurfaceVariant;
  return (
    <View style={{ rowGap: theme.spacing.extraExtraSmall }}>
      <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[theme.typography.bodyLarge, { color }]}>{value}</Text>
    </View>
  );
}

function useStyles(theme) {
  return useMemo(
    () =>
      StyleSheet.create({
        content: {
          flexGrow: 1,
          paddingBottom: theme.spacing.extraLarge,
          paddingHorizontal: theme.spacing.base,
          paddingTop: theme.spacing.large,
          rowGap: theme.spacing.large,
        },
        headerGesture: {
          alignItems: 'center',
        },
        card: {
          rowGap: theme.spacing.medium,
        },
      }),
    [theme],
  );
}
