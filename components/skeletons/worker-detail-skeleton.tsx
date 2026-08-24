import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as React from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function WorkerDetailSkeleton() {
  const insets = useSafeAreaInsets();
  const pulseAnim = React.useRef(new Animated.Value(0.35)).current;

  React.useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => pulseLoop.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}>
        {/* Hero Image Skeleton */}
        <View style={styles.heroContainer}>
          <Animated.View style={[styles.heroSkeleton, { opacity: pulseAnim }]} />
          <View style={[styles.topActionsRow, { paddingTop: insets.top + 8 }]}>
            <Pressable style={styles.floatingCircleBtn} onPress={() => router.back()} hitSlop={12}>
              <MaterialIcons name="chevron-left" size={26} color="#1C2526" />
            </Pressable>
          </View>
          <Animated.View style={[styles.badgeSkeleton, { opacity: pulseAnim }]} />
        </View>

        {/* Profile Info Section Skeleton */}
        <View style={styles.profileSection}>
          {/* Worker Name Line */}
          <Animated.View style={[styles.nameSkeleton, { opacity: pulseAnim }]} />

          {/* Location & Rating Line */}
          <Animated.View style={[styles.subInfoSkeleton, { opacity: pulseAnim }]} />

          {/* Fixy Trust Box Skeleton */}
          <Animated.View style={[styles.trustBoxSkeleton, { opacity: pulseAnim }]} />

          {/* Bio Section Skeleton */}
          <View style={styles.cardSkeletonContainer}>
            <View style={styles.cardHeaderSkeletonRow}>
              <Animated.View style={[styles.circleIconSkeleton, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.cardTitleSkeleton, { opacity: pulseAnim }]} />
            </View>
            <Animated.View style={[styles.textLineSkeleton, { width: '95%', opacity: pulseAnim }]} />
            <Animated.View style={[styles.textLineSkeleton, { width: '80%', opacity: pulseAnim }]} />
            <Animated.View style={[styles.textLineSkeleton, { width: '50%', opacity: pulseAnim }]} />
          </View>

          {/* Services Section Skeleton */}
          <View style={styles.sectionMargin}>
            <Animated.View style={[styles.sectionHeadingSkeleton, { opacity: pulseAnim }]} />

            {/* Service Card 1 */}
            <View style={styles.serviceCardSkeleton}>
              <Animated.View style={[styles.serviceTitleSkeleton, { opacity: pulseAnim }]} />
              <View style={styles.pillsRowSkeleton}>
                <Animated.View style={[styles.pillSkeleton, { opacity: pulseAnim }]} />
                <Animated.View style={[styles.pillSkeleton, { opacity: pulseAnim }]} />
              </View>
              <View style={styles.priceRowSkeleton}>
                <Animated.View style={[styles.priceSkeleton, { opacity: pulseAnim }]} />
                <Animated.View style={[styles.bookBtnSkeleton, { opacity: pulseAnim }]} />
              </View>
            </View>

            {/* Service Card 2 */}
            <View style={styles.serviceCardSkeleton}>
              <Animated.View style={[styles.serviceTitleSkeleton, { opacity: pulseAnim }]} />
              <View style={styles.pillsRowSkeleton}>
                <Animated.View style={[styles.pillSkeleton, { opacity: pulseAnim }]} />
              </View>
              <View style={styles.priceRowSkeleton}>
                <Animated.View style={[styles.priceSkeleton, { opacity: pulseAnim }]} />
                <Animated.View style={[styles.bookBtnSkeleton, { opacity: pulseAnim }]} />
              </View>
            </View>
          </View>

          {/* Reviews Section Skeleton */}
          <View style={styles.sectionMargin}>
            <Animated.View style={[styles.reviewSummarySkeleton, { opacity: pulseAnim }]} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FBF9F5',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  heroContainer: {
    height: 380,
    width: '100%',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  heroSkeleton: {
    width: '100%',
    height: '100%',
    backgroundColor: '#CBD5E1',
  },
  topActionsRow: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floatingCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSkeleton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 80,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#94A3B8',
  },
  profileSection: {
    padding: 16,
  },
  nameSkeleton: {
    width: '55%',
    height: 26,
    borderRadius: 6,
    backgroundColor: '#CBD5E1',
    marginBottom: 10,
  },
  subInfoSkeleton: {
    width: '45%',
    height: 16,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    marginBottom: 18,
  },
  trustBoxSkeleton: {
    width: '100%',
    height: 72,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    marginBottom: 18,
  },
  cardSkeletonContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeaderSkeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  circleIconSkeleton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#CBD5E1',
  },
  cardTitleSkeleton: {
    width: 140,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  textLineSkeleton: {
    height: 14,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    marginBottom: 8,
  },
  sectionMargin: {
    marginTop: 8,
    marginBottom: 18,
  },
  sectionHeadingSkeleton: {
    width: 150,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#CBD5E1',
    marginBottom: 14,
  },
  serviceCardSkeleton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  serviceTitleSkeleton: {
    width: '60%',
    height: 18,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
  },
  pillsRowSkeleton: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  pillSkeleton: {
    width: 70,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  priceRowSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceSkeleton: {
    width: 100,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  bookBtnSkeleton: {
    width: 80,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F382C',
    opacity: 0.25,
  },
  reviewSummarySkeleton: {
    width: '100%',
    height: 120,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
});
