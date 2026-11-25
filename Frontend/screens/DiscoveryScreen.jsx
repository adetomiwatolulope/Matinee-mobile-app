import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { api } from '../api';
import { useTheme } from '../theme/ThemeContext';
import {
  AttributionFooter,
  BrandHeader,
  MovieCard,
  PlayBadge,
  PosterImage,
  PrimaryButton,
  Screen,
  SearchIcon,
  SectionTitle,
  Skeleton,
  SkeletonCard,
  StatePanel,
  StaleNotice,
  useReducedMotion,
} from '../components/ui';

const EMPTY_PAGE = { results: [], attribution: null, meta: null, totalPages: 0, totalResults: 0 };
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function DiscoveryScreen({ token, onOpenMovie, onBack }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const visibleCards = 2;
  const nowPlayingRequest = useRef(0);
  const searchRequest = useRef(0);
  const reducedMotion = useReducedMotion();
  const [nowPlaying, setNowPlaying] = useState(EMPTY_PAGE);
  const [searchResults, setSearchResults] = useState(EMPTY_PAGE);
  const [status, setStatus] = useState('loading');
  const [searchStatus, setSearchStatus] = useState('idle');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [nowPlayingPage, setNowPlayingPage] = useState(1);
  const [searchPage, setSearchPage] = useState(1);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchNonce, setSearchNonce] = useState(0);
  const normalizedQuery = debouncedQuery.trim();
  const isSearching = normalizedQuery.length >= theme.metrics.searchMinLength;

  const loadNowPlaying = useCallback(
    async ({ append = false, page = 1 } = {}) => {
      const currentRequest = ++nowPlayingRequest.current;
      if (append) {
        setLoadingMore(true);
      } else {
        setStatus('loading');
      }
      setLoadMoreError(false);
      try {
        const data = await api(`/movies/now-playing?page=${page}`, { token });
        if (currentRequest !== nowPlayingRequest.current) return;
        setNowPlaying((previous) =>
          append
            ? { ...data, results: [...(previous.results || []), ...(data.results || [])] }
            : data,
        );
        setNowPlayingPage(page);
        setStatus('success');
      } catch (error) {
        if (currentRequest !== nowPlayingRequest.current) return;
        if (append) setLoadMoreError(true);
        else if (error?.status === 429 || error?.status === 503) setStatus('overloaded');
        else setStatus('error');
      } finally {
        if (currentRequest === nowPlayingRequest.current) {
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [token],
  );

  const loadSearchPage = useCallback(
    async ({ append = false, page = 1 } = {}) => {
      const currentRequest = ++searchRequest.current;
      if (append) {
        setLoadingMore(true);
      } else {
        setSearchStatus('loading');
      }
      setLoadMoreError(false);
      try {
        const data = await api(`/movies/search?q=${encodeURIComponent(normalizedQuery)}&page=${page}`, { token });
        if (currentRequest !== searchRequest.current) return;
        setSearchResults((previous) =>
          append
            ? { ...data, results: [...(previous.results || []), ...(data.results || [])] }
            : data,
        );
        setSearchPage(page);
        setSearchStatus('success');
      } catch (error) {
        if (currentRequest !== searchRequest.current) return;
        if (append) setLoadMoreError(true);
        else if (error?.status === 429 || error?.status === 503) setSearchStatus('overloaded');
        else setSearchStatus('error');
      } finally {
        if (currentRequest === searchRequest.current) setLoadingMore(false);
      }
    },
    [normalizedQuery, token],
  );

  useEffect(() => {
    loadNowPlaying();
  }, [loadNowPlaying]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), theme.motion.debounce);
    return () => clearTimeout(timeout);
  }, [query, theme.motion.debounce]);

  useEffect(() => {
    if (!isSearching) {
      searchRequest.current += 1;
      setSearchResults(EMPTY_PAGE);
      setSearchStatus('idle');
      setSearchPage(1);
      setLoadMoreError(false);
      return;
    }
    loadSearchPage({ page: 1 });
  }, [isSearching, loadSearchPage, searchNonce]);

  const displayPage = isSearching ? searchResults : nowPlaying;
  const displayStatus = isSearching ? searchStatus : status;
  const movies = displayPage.results || [];
  const featured = nowPlaying.results?.[0];
  const activePage = isSearching ? searchPage : nowPlayingPage;
  const hasMore = displayPage.totalPages > activePage;
  const retry = isSearching ? () => setSearchNonce((value) => value + 1) : () => loadNowPlaying();

  function handleLoadMore() {
    if (loadingMore || displayStatus !== 'success' || !hasMore) return;
    const nextPage = activePage + 1;
    if (isSearching) loadSearchPage({ append: true, page: nextPage });
    else loadNowPlaying({ append: true, page: nextPage });
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadNowPlaying();
  }

  const listHeader = useMemo(
    () => (
      <View style={styles.header}>
        <BrandHeader
          backAccessibilityLabel="Back to dashboard"
          onBack={onBack}
          title="Discover"
          subtitle="Find films currently showing and explore their details."
        />

        <View style={[styles.searchInput, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surfaceContainerLowest }]}>
          <SearchIcon />
          <TextInput
            accessibilityLabel="Search films"
            autoCapitalize="none"
            clearButtonMode="while-editing"
            onChangeText={setQuery}
            placeholder="Search films"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            returnKeyType="search"
            style={[theme.typography.bodyLarge, { color: theme.colors.onSurface, flex: 1 }]}
            value={query}
          />
        </View>

        {displayPage.meta?.stale && <StaleNotice />}

        {!isSearching && !!featured && (
          <AnimatedTouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`View details for ${featured.title}`}
            entering={FadeIn.duration(reducedMotion ? theme.motion.instant : theme.motion.fast)}
            onPress={() => openMovie(featured)}
            style={styles.featuredCard}
          >
            <View style={styles.posterFrame}>
              <PosterImage
                contentFit="cover"
                decorative
                style={styles.featuredImage}
                title={featured.title}
                uri={featured.backdropUrl || featured.posterUrl}
              />
              <PlayBadge />
            </View>
            <View style={styles.featuredCopy}>
              <Text style={[theme.typography.titleLarge, { color: theme.colors.onSurface }]}>{featured.title}</Text>
              {!!featured.overview && (
                <Text numberOfLines={theme.metrics.featuredOverviewLines} style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant }]}>
                  {featured.overview}
                </Text>
              )}
            </View>
          </AnimatedTouchableOpacity>
        )}

        <SectionTitle>{isSearching ? 'Search results' : 'Now playing'}</SectionTitle>
      </View>
    ),
    [displayPage.meta?.stale, featured, isSearching, onBack, openMovie, query, reducedMotion, styles, theme],
  );

  function openMovie(movie) {
    Haptics.selectionAsync();
    onOpenMovie(movie.tmdbId, movie);
  }

  function renderItem({ item }) {
    const subtitle = item.releaseDate
      ? item.releaseDate.slice(0, 4)
      : typeof item.voteAverage === 'number'
        ? `Rating ${item.voteAverage.toFixed(1)}`
        : 'Details available';

    return (
      <Animated.View
        entering={FadeIn.duration(reducedMotion ? theme.motion.instant : theme.motion.fast)}
        style={styles.movieCell}
      >
        <MovieCard
          movie={item}
          onPress={() => openMovie(item)}
          style={styles.movieCard}
          subtitle={subtitle}
        />
      </Animated.View>
    );
  }

  function renderEmpty() {
    if (displayStatus === 'loading') {
      return (
        <View style={styles.skeletonGrid}>
          {!isSearching && (
            <View style={styles.heroSkeleton}>
              <Skeleton
                borderRadius={theme.spacing.medium}
                height={theme.spacing.extraExtraLarge * 6}
                width={theme.metrics.fullWidth}
              />
              <Skeleton height={theme.spacing.medium} width={theme.spacing.veryLarge * 5} />
            </View>
          )}
          <View style={styles.skeletonRow}>
            {Array.from({ length: visibleCards }, (_, index) => (
              <View key={index} style={styles.skeletonCell}>
                <SkeletonCard />
              </View>
            ))}
          </View>
        </View>
      );
    }
    if (displayStatus === 'overloaded') {
      return (
        <StatePanel
          actionLabel="Try again"
          message="Matinee is busy right now. Please wait a moment and try again."
          onAction={retry}
          title="Too many people are browsing"
        />
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

  const listFooter = (
    <View style={styles.footer}>
      <AttributionFooter attribution={displayPage.attribution} />
      {displayStatus === 'success' && hasMore && (
        <View style={styles.loadMore}>
          {loadingMore ? (
            <ActivityIndicator color={theme.colors.onSurfaceVariant} />
          ) : loadMoreError ? (
            <PrimaryButton label="Retry loading more" onPress={handleLoadMore} variant="secondary" />
          ) : null}
        </View>
      )}
    </View>
  );

  return (
    <Screen>
      <FlatList
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        data={movies}
        key={isSearching ? 'search' : 'now-playing'}
        initialNumToRender={theme.metrics.listInitialBatch}
        keyExtractor={(item) => String(item.tmdbId)}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={listFooter}
        ListHeaderComponent={listHeader}
        maxToRenderPerBatch={theme.metrics.listBatch}
        numColumns={visibleCards}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        removeClippedSubviews
        renderItem={renderItem}
        windowSize={theme.metrics.listWindow}
      />
    </Screen>
  );
}

function useStyles(theme) {
  return useMemo(
    () =>
      StyleSheet.create({
        listContent: {
          flexGrow: 1,
          paddingBottom: theme.spacing.extraLarge,
          paddingHorizontal: theme.spacing.base,
          paddingTop: theme.spacing.large,
          rowGap: theme.spacing.medium,
        },
        header: {
          rowGap: theme.spacing.medium,
        },
        footer: {
          rowGap: theme.spacing.medium,
        },
        columnWrapper: {
          alignItems: 'stretch',
          columnGap: theme.spacing.base,
        },
        searchInput: {
          alignItems: 'center',
          borderWidth: theme.metrics.hairline,
          borderRadius: theme.spacing.extraSmall,
          columnGap: theme.spacing.extraSmall,
          flexDirection: 'row',
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
        posterFrame: {
          position: 'relative',
          width: theme.metrics.fullWidth,
        },
        featuredImage: {
          width: theme.metrics.fullWidth,
          aspectRatio: theme.metrics.backdropAspectRatio,
        },
        featuredCopy: {
          padding: theme.spacing.medium,
          rowGap: theme.spacing.extraExtraSmall,
        },
        movieCell: {
          alignSelf: 'stretch',
          flex: 1,
        },
        movieCard: {
          borderWidth: theme.metrics.hairline,
          borderRadius: theme.spacing.medium,
          flex: 1,
          overflow: 'hidden',
          width: theme.metrics.fullWidth,
        },
        poster: {
          width: theme.metrics.fullWidth,
          borderRadius: theme.spacing.none,
        },
        movieCopy: {
          padding: theme.spacing.medium,
          rowGap: theme.spacing.extraExtraSmall,
        },
        skeletonGrid: {
          rowGap: theme.spacing.medium,
        },
        skeletonRow: {
          columnGap: theme.spacing.base,
          flexDirection: 'row',
        },
        skeletonCell: {
          flex: 1,
        },
        heroSkeleton: {
          rowGap: theme.spacing.extraExtraSmall,
        },
        loadMore: {
          alignItems: 'center',
          minHeight: theme.metrics.touchTarget,
          justifyContent: 'center',
        },
      }),
    [theme],
  );
}
