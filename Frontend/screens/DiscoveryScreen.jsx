import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { api } from '../api';
import { useTheme } from '../theme/ThemeContext';
import {
  AttributionFooter,
  BrandHeader,
  PosterImage,
  Screen,
  SectionTitle,
  SkeletonCard,
  StatePanel,
  StaleNotice,
} from '../components/ui';

const EMPTY_PAGE = { results: [], attribution: null, meta: null, totalPages: 0, totalResults: 0 };

export default function DiscoveryScreen({ token, onOpenMovie }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const { width } = useWindowDimensions();
  const requestId = useRef(0);
  const [nowPlaying, setNowPlaying] = useState(EMPTY_PAGE);
  const [searchResults, setSearchResults] = useState(EMPTY_PAGE);
  const [status, setStatus] = useState('loading');
  const [searchStatus, setSearchStatus] = useState('idle');
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchNonce, setSearchNonce] = useState(0);
  const normalizedQuery = debouncedQuery.trim();
  const isSearching = normalizedQuery.length >= theme.metrics.searchMinLength;

  const loadNowPlaying = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setStatus('loading');
    try {
      const data = await api('/movies/now-playing?page=1', { token });
      if (currentRequest !== requestId.current) return;
      setNowPlaying(data);
      setStatus('success');
    } catch (_error) {
      if (currentRequest !== requestId.current) return;
      setStatus('error');
    }
  }, [token]);

  useEffect(() => {
    loadNowPlaying();
  }, [loadNowPlaying]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), theme.motion.debounce);
    return () => clearTimeout(timeout);
  }, [query, theme.motion.debounce]);

  useEffect(() => {
    if (!isSearching) {
      setSearchResults(EMPTY_PAGE);
      setSearchStatus('idle');
      return undefined;
    }
    const currentRequest = ++requestId.current;
    setSearchStatus('loading');
    api(`/movies/search?q=${encodeURIComponent(normalizedQuery)}&page=1`, { token })
      .then((data) => {
        if (currentRequest !== requestId.current) return;
        setSearchResults(data);
        setSearchStatus('success');
      })
      .catch(() => {
        if (currentRequest !== requestId.current) return;
        setSearchStatus('error');
      });
    return undefined;
  }, [isSearching, normalizedQuery, searchNonce, token]);

  const displayPage = isSearching ? searchResults : nowPlaying;
  const displayStatus = isSearching ? searchStatus : status;
  const movies = displayPage.results || [];
  const featured = nowPlaying.results?.[0];
  const columns = width >= theme.metrics.widePhoneBreakpoint ? 2 : 1;
  const retry = isSearching ? () => setSearchNonce((value) => value + 1) : loadNowPlaying;

  async function handleRefresh() {
    setRefreshing(true);
    await loadNowPlaying();
    setRefreshing(false);
  }

  const listHeader = useMemo(
    () => (
      <View style={styles.header}>
        <BrandHeader
          title="Discover"
          subtitle="Find films currently showing and explore their details."
        />

        <View style={[styles.searchInput, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surfaceContainerLowest }]}>
          <TextInput
            accessibilityLabel="Search films"
            autoCapitalize="none"
            clearButtonMode="while-editing"
            onChangeText={setQuery}
            placeholder="Search films"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            returnKeyType="search"
            style={[theme.typography.bodyLarge, { color: theme.colors.onSurface }]}
            value={query}
          />
        </View>

        {displayPage.meta?.stale && <StaleNotice />}

        {!isSearching && !!featured && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`View details for ${featured.title}`}
            onPress={() => openMovie(featured)}
            style={styles.featuredCard}
          >
            <PosterImage
              contentFit="cover"
              style={styles.featuredImage}
              title={featured.title}
              uri={featured.backdropUrl || featured.posterUrl}
            />
            <View style={styles.featuredCopy}>
              <Text style={[theme.typography.titleLarge, { color: theme.colors.onSurface }]}>{featured.title}</Text>
              {!!featured.overview && (
                <Text numberOfLines={theme.metrics.featuredOverviewLines} style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant }]}>
                  {featured.overview}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}

        <SectionTitle>{isSearching ? 'Search results' : 'Now playing'}</SectionTitle>
      </View>
    ),
    [displayPage.meta?.stale, featured, isSearching, openMovie, query, styles, theme],
  );

  function openMovie(movie) {
    Haptics.selectionAsync();
    onOpenMovie(movie.tmdbId, movie);
  }

  function renderItem({ item }) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`View details for ${item.title}`}
        onPress={() => openMovie(item)}
        style={[styles.movieCard, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant }]}
      >
        <PosterImage style={styles.poster} title={item.title} uri={item.posterUrl} />
        <View style={styles.movieCopy}>
          <Text numberOfLines={2} style={[theme.typography.titleMedium, { color: theme.colors.onSurface }]}>
            {item.title}
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.onSurfaceVariant }]}>
            {item.releaseDate ? item.releaseDate.slice(0, 4) : 'Release date unavailable'}
          </Text>
          {typeof item.voteAverage === 'number' && (
            <Text style={[theme.typography.labelMedium, { color: theme.colors.primary }]}>
              Rating {item.voteAverage.toFixed(1)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  function renderEmpty() {
    if (displayStatus === 'loading') {
      return (
        <View style={styles.skeletonGrid}>
          {Array.from({ length: theme.metrics.listInitialBatch }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </View>
      );
    }
    if (displayStatus === 'error') {
      return (
        <StatePanel
          actionLabel="Try again"
          message={isSearching ? 'The search could not be completed. Please try again.' : 'The film catalog is temporarily unavailable.'}
          onAction={retry}
          title="We couldn't load films"
        />
      );
    }
    if (isSearching && normalizedQuery.length < theme.metrics.searchMinLength) {
      return (
        <StatePanel
          message="Type at least a couple of characters to search the film catalog."
          title="Search films"
        />
      );
    }
    return (
      <StatePanel
        message={isSearching ? 'No films matched your search.' : 'There are no films to show right now.'}
        title={isSearching ? 'No matches' : 'Nothing here yet'}
      />
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        {isSearching && displayStatus === 'loading' ? (
          <ScrollView contentContainerStyle={styles.loadingContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
            {listHeader}
            {renderEmpty()}
          </ScrollView>
        ) : (
          <FlatList
            columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
            contentContainerStyle={styles.listContent}
            data={movies}
            key={columns}
            initialNumToRender={theme.metrics.listInitialBatch}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={<AttributionFooter attribution={displayPage.attribution} />}
            ListHeaderComponent={listHeader}
            maxToRenderPerBatch={theme.metrics.listBatch}
            numColumns={columns}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            removeClippedSubviews
            renderItem={renderItem}
            windowSize={theme.metrics.listWindow}
          />
        )}
      </View>
    </Screen>
  );
}

function useStyles(theme) {
  return useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        loadingContent: {
          paddingBottom: theme.spacing.extraLarge,
          rowGap: theme.spacing.large,
        },
        listContent: {
          flexGrow: 1,
          padding: theme.spacing.large,
          paddingBottom: theme.spacing.extraLarge,
        },
        header: {
          rowGap: theme.spacing.medium,
        },
        searchInput: {
          borderWidth: theme.metrics.hairline,
          borderRadius: theme.spacing.extraSmall,
          minHeight: theme.metrics.touchTarget,
          paddingHorizontal: theme.spacing.medium,
          justifyContent: 'center',
        },
        featuredCard: {
          borderWidth: theme.metrics.hairline,
          borderColor: theme.colors.outlineVariant,
          borderRadius: theme.spacing.medium,
          overflow: 'hidden',
        },
        featuredImage: {
          width: theme.metrics.fullWidth,
          aspectRatio: theme.metrics.backdropAspectRatio,
        },
        featuredCopy: {
          padding: theme.spacing.medium,
          rowGap: theme.spacing.extraExtraSmall,
        },
        movieCard: {
          borderWidth: theme.metrics.hairline,
          borderRadius: theme.spacing.medium,
          flex: 1,
          overflow: 'hidden',
        },
        poster: {
          width: theme.metrics.fullWidth,
          borderRadius: theme.spacing.none,
        },
        movieCopy: {
          padding: theme.spacing.medium,
          rowGap: theme.spacing.extraExtraSmall,
        },
        columnWrapper: {
          columnGap: theme.spacing.medium,
        },
        skeletonGrid: {
          rowGap: theme.spacing.medium,
        },
      }),
    [theme],
  );
}
