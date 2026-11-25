import React, { useMemo } from 'react';
import { Image, Linking, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { BrandHeader, Card, PrimaryButton, Screen } from '../components/ui';

const TMDB_URL = 'https://www.themoviedb.org';
const ATTRIBUTION_NOTICE = 'This product uses the TMDB API but is not endorsed or certified by TMDB.';

export default function AboutScreen({ onBack }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);

  return (
    <Screen direction="back">
      <View style={styles.content}>
        <BrandHeader title="About & credits" subtitle="Sources and notices for the film catalog." />
        <Card style={styles.card}>
          <Text style={[theme.typography.titleLarge, { color: theme.colors.onSurface }]}>Film data</Text>
          <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant }]}>
            Movie information and images are provided by TMDB.
          </Text>
          <Image
            accessible
            accessibilityLabel="TMDB logo"
            resizeMode="contain"
            source={require('../assets/tmdb-logo.png')}
            style={styles.logo}
          />
          <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant }]}>
            {ATTRIBUTION_NOTICE}
          </Text>
          <PrimaryButton
            accessibilityLabel="Visit TMDB website"
            label="Visit TMDB"
            onPress={() => Linking.openURL(TMDB_URL)}
            variant="secondary"
          />
        </Card>
        <PrimaryButton label="Back" onPress={onBack} />
      </View>
    </Screen>
  );
}

function useStyles(theme) {
  return useMemo(
    () =>
      StyleSheet.create({
        content: {
          flexGrow: 1,
          padding: theme.spacing.large,
          rowGap: theme.spacing.large,
        },
        card: {
          rowGap: theme.spacing.medium,
        },
        logo: {
          width: theme.spacing.extraExtraLarge * 5,
          height: theme.spacing.extraExtraLarge * 3,
          alignSelf: 'flex-start',
        },
      }),
    [theme],
  );
}
