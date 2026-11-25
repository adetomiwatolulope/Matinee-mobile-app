import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { useTheme } from '../theme/ThemeContext';
import {
  AttributionFooter,
  PosterImage,
  PrimaryButton,
  Screen,
  Skeleton,
  StatePanel,
} from '../components/ui';

export default function MovieDetailsScreen({ token, movieId, initialMovie, onBack }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const [movie, setMovie] = useState(initialMovie || null);
  const [status, setStatus] = useState(initialMovie ? 'success' : 'loading');

  const loadDetails = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await api(`/movies/${encodeURIComponent(movieId)}`, { token });
      setMovie(data);
      setStatus('success');
    } catch (_error) {
      setStatus('error');
    }
  }, [movieId, token]);

  useEffect(() => {
    if (!initialMovie) loadDetails();
  }, [initialMovie, loadDetails]);

  const genres = useMemo(() => (movie?.genres || []).map((genre) => genre.name).filter(Boolean).join(', '), [movie]);

  return (
    <Screen direction="back">
      <ScrollView contentContainerStyle={styles.content}>
        <PrimaryButton accessibilityLabel="Back to discovery" label="Back to discovery" onPress={onBack} variant="secondary" />

        {status === 'loading' && (
          <View style={styles.loading}>
            <Skeleton width={theme.metrics.fullWidth} height={theme.spacing.extraExtraLarge * 6} borderRadius={theme.spacing.medium} />
            <Skeleton width={theme.spacing.veryLarge * 6} height={theme.spacing.extraExtraLarge * 9} borderRadius={theme.spacing.medium} />
            <Skeleton width={theme.metrics.fullWidth} height={theme.spacing.medium} />
          </View>
        )}

        {status === 'error' && (
          <StatePanel
            actionLabel="Try again"
            message="The film details could not be loaded."
            onAction={loadDetails}
            title="We couldn't load this film"
          />
        )}

        {status === 'success' && !!movie && (
          <View style={styles.details}>
            <PosterImage
              contentFit="cover"
              style={[styles.backdrop, { aspectRatio: theme.metrics.backdropAspectRatio }]}
              title={movie.title}
              uri={movie.backdropUrl || movie.posterUrl}
            />
            <View style={styles.posterRow}>
              <PosterImage style={styles.poster} title={movie.title} uri={movie.posterUrl} />
              <View style={styles.posterCopy}>
                <Text accessibilityRole="header" style={[theme.typography.headlineSmall, { color: theme.colors.onSurface }]}>
                  {movie.title}
                </Text>
                {!!movie.tagline && (
                  <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant }]}>
                    {movie.tagline}
                  </Text>
                )}
                <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>
                  {movie.releaseDate ? movie.releaseDate.slice(0, 4) : 'Release date unavailable'}
                </Text>
                {typeof movie.voteAverage === 'number' && (
                  <Text style={[theme.typography.labelMedium, { color: theme.colors.primary }]}>
                    Rating {movie.voteAverage.toFixed(1)}
                  </Text>
                )}
                {typeof movie.runtime === 'number' && (
                  <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>
                    {movie.runtime} min
                  </Text>
                )}
              </View>
            </View>

            {!!genres && (
              <Text style={[theme.typography.labelLarge, { color: theme.colors.onSurface }]}>{genres}</Text>
            )}

            {!!movie.overview && (
              <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurface }]}>{movie.overview}</Text>
            )}

            <AttributionFooter attribution={movie.attribution} />
          </View>
        )}
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
          padding: theme.spacing.large,
          paddingBottom: theme.spacing.extraLarge,
          rowGap: theme.spacing.large,
        },
        loading: {
          rowGap: theme.spacing.medium,
        },
        details: {
          rowGap: theme.spacing.medium,
        },
        backdrop: {
          width: theme.metrics.fullWidth,
          borderRadius: theme.spacing.medium,
        },
        posterRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          columnGap: theme.spacing.medium,
        },
        poster: {
          width: theme.spacing.extraExtraLarge * 3,
          borderRadius: theme.spacing.medium,
        },
        posterCopy: {
          flex: 1,
          rowGap: theme.spacing.extraExtraSmall,
        },
      }),
    [theme],
  );
}
