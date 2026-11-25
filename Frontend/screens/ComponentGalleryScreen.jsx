import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import {
  Badge,
  BottomSheet,
  BrandHeader,
  Button,
  Card,
  Chip,
  EmptyState,
  Input,
  MovieCard,
  Screen,
  SeatMap,
  Skeleton,
  Text,
  Toast,
} from '../components/ui';

const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
const SEATS_PER_ROW = 15;

function createSeats() {
  return ROW_LABELS.flatMap((row, rowIndex) =>
    Array.from({ length: SEATS_PER_ROW }, (_, columnIndex) => {
      const index = rowIndex * SEATS_PER_ROW + columnIndex;
      const status = index % 41 === 0 ? 'wheelchair' : index % 37 === 0 ? 'sold' : index % 29 === 0 ? 'held' : 'available';
      const label = `${row}${columnIndex + 1}`;
      return {
        id: label,
        label,
        status,
        wheelchairAccessible: status === 'wheelchair',
      };
    }),
  );
}

const GALLERY_MOVIE = {
  tmdbId: 1,
  title: 'Gallery Film',
  posterUrl: null,
  rating: 4.8,
};

export default function ComponentGalleryScreen({ onBack }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const seats = useMemo(createSeats, []);
  const [chipSelected, setChipSelected] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [secureValue, setSecureValue] = useState('gallery');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(true);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);

  function toggleSeat(seat) {
    setSelectedSeatIds((previous) =>
      previous.includes(seat.id) ? previous.filter((id) => id !== seat.id) : [...previous, seat.id],
    );
  }

  return (
    <Screen direction="back" contentStyle={styles.screenContent}>
      <ScrollView contentContainerStyle={styles.content}>
        <BrandHeader title="Component Gallery" subtitle="Hidden Requirement 3 style guide" />

        <Button label="Back to dashboard" onPress={onBack} variant="secondary" />

        <GallerySection title="Text">
          {Object.keys(theme.typography).map((variant) => (
            <Text key={variant} variant={variant} tone="onSurface">
              {variant}
            </Text>
          ))}
        </GallerySection>

        <GallerySection title="Button">
          <Button label="Primary" onPress={() => setToastVisible(true)} />
          <Button label="Secondary" onPress={() => setToastVisible(true)} variant="secondary" />
          <Button label="Loading" loading onPress={() => {}} />
          <Button label="Disabled" disabled onPress={() => {}} />
          <Button label="Full width" fullWidth onPress={() => {}} />
        </GallerySection>

        <GallerySection title="Card">
          <Card>
            <Text variant="titleMedium" tone="onSurface">
              Card content
            </Text>
            <Text variant="bodyMedium" tone="onSurfaceVariant">
              Tokens only, no raw visual values.
            </Text>
          </Card>
        </GallerySection>

        <GallerySection title="MovieCard">
          <MovieCard movie={GALLERY_MOVIE} onPress={() => setToastVisible(true)} />
        </GallerySection>

        <GallerySection title="Input">
          <Input label="Default" onChangeText={setInputValue} placeholder="Type here" value={inputValue} />
          <Input
            error="Enter a valid value"
            label="Error"
            onChangeText={setInputValue}
            placeholder="Type here"
            value={inputValue}
          />
          <Input
            helper="Helper text appears when there is no error."
            label="Helper"
            onChangeText={setInputValue}
            placeholder="Type here"
            value={inputValue}
          />
          <Input label="Secure" onChangeText={setSecureValue} secureTextEntry value={secureValue} />
          <Input disabled label="Disabled" placeholder="Unavailable" value="" />
        </GallerySection>

        <GallerySection title="Chip">
          <View style={styles.row}>
            <Chip label="Unselected" onPress={() => setChipSelected(false)} selected={false} />
            <Chip label="Selected" onPress={() => setChipSelected(true)} selected={chipSelected} />
            <Chip disabled label="Disabled" />
          </View>
        </GallerySection>

        <GallerySection title="Badge">
          <View style={styles.row}>
            <Badge label="Neutral" />
            <Badge label="Primary" tone="primary" />
            <Badge label="Success" tone="success" />
            <Badge label="Warning" tone="warning" />
            <Badge label="Error" tone="error" />
          </View>
        </GallerySection>

        <GallerySection title="BottomSheet">
          <Button label="Open bottom sheet" onPress={() => setSheetVisible(true)} variant="secondary" />
          <BottomSheet
            actionLabel="Confirm"
            onAction={() => setSheetVisible(false)}
            onClose={() => setSheetVisible(false)}
            title="Bottom sheet"
            visible={sheetVisible}
          >
            <Text variant="bodyMedium" tone="onSurfaceVariant">
              Sheet content uses semantic tokens.
            </Text>
          </BottomSheet>
        </GallerySection>

        <GallerySection title="Skeleton">
          <Skeleton borderRadius={theme.spacing.extraSmall} height={theme.spacing.medium} width={theme.metrics.fullWidth} />
          <Skeleton borderRadius={theme.spacing.extraLarge} height={theme.spacing.extraExtraLarge} width={theme.spacing.extraExtraLarge} />
        </GallerySection>

        <GallerySection title="Toast">
          <Toast message="Informational toast" onDismiss={() => setToastVisible(false)} tone="info" visible={toastVisible} />
          <Toast message="Success toast" tone="success" visible />
          <Toast actionLabel="Retry" message="Error toast with action" onAction={() => {}} tone="error" visible />
        </GallerySection>

        <GallerySection title="EmptyState">
          <EmptyState message="Nothing to show yet." title="No results" />
          <EmptyState actionLabel="Reload" message="An action is available." onAction={() => {}} title="Try again" />
        </GallerySection>

        <GallerySection title={`SeatMap (${seats.length} seats)`}>
          <View style={styles.seatMapFrame}>
            <SeatMap onSeatPress={toggleSeat} seats={seats} selectedSeatIds={selectedSeatIds} />
          </View>
          <Text variant="bodySmall" tone="onSurfaceVariant">
            Selected: {selectedSeatIds.length}
          </Text>
        </GallerySection>
      </ScrollView>
    </Screen>
  );
}

function GallerySection({ title, children }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);

  return (
    <View style={styles.section}>
      <Text variant="titleLarge" tone="onSurface">
        {title}
      </Text>
      {children}
    </View>
  );
}

function useStyles(theme) {
  return useMemo(
    () =>
      StyleSheet.create({
        screenContent: {
          flex: 1,
        },
        content: {
          padding: theme.spacing.large,
          rowGap: theme.spacing.large,
        },
        section: {
          rowGap: theme.spacing.medium,
        },
        row: {
          columnGap: theme.spacing.extraSmall,
          flexDirection: 'row',
          flexWrap: 'wrap',
          rowGap: theme.spacing.extraSmall,
        },
        seatMapFrame: {
          borderColor: theme.colors.outlineVariant,
          borderRadius: theme.spacing.medium,
          borderWidth: theme.metrics.hairline,
          height: theme.spacing.extraExtraLarge * 9,
          padding: theme.spacing.extraExtraSmall,
        },
      }),
    [theme],
  );
}
