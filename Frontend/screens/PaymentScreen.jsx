import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Badge, BrandHeader, Button, Card, Message, Screen, Text } from '../components/ui';

const SUMMARY_ROWS = [
  ['Ticket face value', 'Provided by server at checkout'],
  ['Booking fee', 'Awaiting approval'],
  ['Taxes', 'Awaiting approval'],
  ['Provider charges', 'Awaiting approval'],
  ['Amount due', 'Server-calculated'],
];

const STATE_ROWS = [
  ['Payment status', 'Not available'],
  ['Booking status', 'Not available'],
  ['Ticket status', 'Issued after confirmed booking'],
];

export default function PaymentScreen({ onBack }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);

  return (
    <Screen direction="back">
      <ScrollView contentContainerStyle={styles.content}>
        <BrandHeader
          backAccessibilityLabel="Back to dashboard"
          onBack={onBack}
          subtitle="Server-authorised payment flow"
          title="Checkout & payments"
        />

        <Message
          type="info"
          text="Payment success is verified by the server. Returning from a checkout page does not confirm payment."
        />

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text variant="titleLarge" tone="onSurface">
              Checkout status
            </Text>
            <Badge label="Setup pending" tone="warning" />
          </View>
          <Text variant="bodyMedium" tone="onSurfaceVariant">
            Payment initiation is disabled until approved pricing, refund, and hold-expiry policies are available on the server.
          </Text>
          <Button
            accessibilityLabel="Continue to payment, unavailable during setup"
            disabled
            fullWidth
            label="Continue to payment"
            onPress={() => {}}
          />
        </Card>

        <Card style={styles.card}>
          <Text variant="titleLarge" tone="onSurface">
            Order summary
          </Text>
          {SUMMARY_ROWS.map(([label, value]) => (
            <SummaryRow key={label} label={label} value={value} />
          ))}
        </Card>

        <Card style={styles.card}>
          <Text variant="titleLarge" tone="onSurface">
            Payment status
          </Text>
          {STATE_ROWS.map(([label, value]) => (
            <StateRow key={label} label={label} value={value} />
          ))}
          <Message
            type="info"
            text="Status values will come from the server. This screen does not decide whether a payment succeeded."
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function SummaryRow({ label, value }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.outlineVariant }]}>
      <Text variant="bodyMedium" tone="onSurfaceVariant">
        {label}
      </Text>
      <Text variant="bodyMedium" tone="onSurface">
        {value}
      </Text>
    </View>
  );
}

function StateRow({ label, value }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.outlineVariant }]}>
      <Text variant="bodyMedium" tone="onSurfaceVariant">
        {label}
      </Text>
      <Badge label={value} tone="neutral" />
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
        card: {
          rowGap: theme.spacing.medium,
        },
        cardHeader: {
          alignItems: 'flex-start',
          columnGap: theme.spacing.smallLarge,
          flexWrap: 'wrap',
          rowGap: theme.spacing.extraSmall,
        },
        row: {
          borderBottomWidth: theme.metrics.hairline,
          paddingVertical: theme.spacing.extraSmall,
          rowGap: theme.spacing.extraExtraSmall,
        },
      }),
    [theme],
  );
}
