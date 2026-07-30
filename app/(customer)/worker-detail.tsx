import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getWorkerDetails, WorkerProfile } from '@/services/api/workers';
import { getWorkerReviews, Review } from '@/services/api/reviews';
import { fetchCategories } from '@/services/api/categories';
import { formatDateOnly } from '@/utils/date';
import { formatCurrency } from '@/utils/format';
import { useQuery } from '@tanstack/react-query';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BADGE_CONFIG: Record<number, { text: string; color: string }> = {
  0: { text: 'Mới đến', color: '#3B82F6' },
  1: { text: 'Cập nhật', color: '#10B981' },
  2: { text: 'Chất lượng', color: '#EA580C' },
  3: { text: 'Thợ Vàng', color: '#D97706' },
};

const HeroImageCarousel = React.memo(({
  imagesList,
  ktvAvatar,
  badge,
  insets,
  onBack,
}: {
  imagesList: string[];
  ktvAvatar?: string;
  badge: { text: string; color: string };
  insets: any;
  onBack: () => void;
}) => {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const displayImages = React.useMemo(() => {
    if (imagesList && imagesList.length > 0) return imagesList;
    if (ktvAvatar) return [ktvAvatar];
    return [];
  }, [imagesList, ktvAvatar]);

  const handleScroll = React.useCallback(
    (e: any) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      if (SCREEN_WIDTH > 0) {
        const newIndex = Math.round(offsetX / SCREEN_WIDTH);
        if (newIndex >= 0 && newIndex < displayImages.length) {
          setActiveIndex((prev) => (prev !== newIndex ? newIndex : prev));
        }
      }
    },
    [displayImages.length]
  );

  return (
    <View style={styles.heroContainer}>
      {displayImages.length > 1 ? (
        <>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            nestedScrollEnabled={true}
            directionalLockEnabled={true}
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={SCREEN_WIDTH}
            snapToAlignment="center"
            disableIntervalMomentum={true}
            onScroll={handleScroll}
            onMomentumScrollEnd={handleScroll}
            style={{ width: SCREEN_WIDTH, height: 380 }}>
            {displayImages.map((imgUri, index) => (
              <Image
                key={`hero-img-${index}`}
                source={{ uri: imgUri }}
                style={[styles.heroImage, { width: SCREEN_WIDTH, height: 380 }]}
              />
            ))}
          </ScrollView>

          {/* Chevron Navigation Controls for Instant Photo Switching */}
          {activeIndex > 0 ? (
            <Pressable
              style={styles.carouselChevronLeft}
              hitSlop={12}
              onPress={() => {
                const prev = activeIndex - 1;
                setActiveIndex(prev);
                scrollViewRef.current?.scrollTo({ x: prev * SCREEN_WIDTH, animated: true });
              }}>
              <MaterialIcons name="chevron-left" size={24} color="#ffffff" />
            </Pressable>
          ) : null}

          {activeIndex < displayImages.length - 1 ? (
            <Pressable
              style={styles.carouselChevronRight}
              hitSlop={12}
              onPress={() => {
                const next = activeIndex + 1;
                setActiveIndex(next);
                scrollViewRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
              }}>
              <MaterialIcons name="chevron-right" size={24} color="#ffffff" />
            </Pressable>
          ) : null}
        </>
      ) : displayImages.length === 1 ? (
        <Image source={{ uri: displayImages[0] }} style={styles.heroImage} />
      ) : (
        <View style={[styles.heroImage, styles.heroPlaceholder]}>
          <MaterialIcons name="person" size={80} color="#A0AEC0" />
        </View>
      )}

      {/* Floating Actions Header */}
      <View style={[styles.topActionsRow, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable style={styles.floatingCircleBtn} onPress={onBack} hitSlop={12}>
          <MaterialIcons name="chevron-left" size={26} color="#1C2526" />
        </Pressable>
        <View style={styles.topRightActions} pointerEvents="box-none">
          <Pressable style={styles.floatingCircleBtn} hitSlop={12}>
            <MaterialIcons name="favorite-border" size={20} color="#1C2526" />
          </Pressable>
          <Pressable style={styles.floatingCircleBtn} hitSlop={12}>
            <MaterialIcons name="share" size={20} color="#1C2526" />
          </Pressable>
        </View>
      </View>

      {/* Badge & Carousel Page Indicator */}
      <View style={[styles.badgeQualityOverlay, { backgroundColor: badge.color }]} pointerEvents="none">
        <Text style={styles.badgeQualityText}>{badge.text}</Text>
      </View>

      {displayImages.length > 1 ? (
        <View style={styles.pageIndicatorPill} pointerEvents="none">
          <Text style={styles.pageIndicatorText}>
            {activeIndex + 1}/{displayImages.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

export default function WorkerDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showFullBio, setShowFullBio] = React.useState(false);
  const [translatedReviews, setTranslatedReviews] = React.useState<Record<string, boolean>>({});

  const { data: worker = null, isLoading: loading } = useQuery<WorkerProfile | null>({
    queryKey: ['worker', id],
    queryFn: () => getWorkerDetails(id || ''),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });

  const targetWorkerId = worker?.id || worker?.workerProfileId || id || '';

  const { data: reviewsData = null } = useQuery({
    queryKey: ['workerReviews', targetWorkerId],
    queryFn: () => getWorkerReviews(targetWorkerId),
    enabled: !!targetWorkerId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
    staleTime: 1000 * 60 * 15,
  });

  const toggleTranslate = React.useCallback((reviewId: string) => {
    setTranslatedReviews((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  }, []);

  const handleBack = React.useCallback(() => {
    router.back();
  }, []);

  const imagesList = React.useMemo(() => {
    const list: string[] = [];
    if (worker?.avatarUrl) {
      list.push(worker.avatarUrl);
    }
    if (worker?.portfolioImages && worker.portfolioImages.length > 0) {
      worker.portfolioImages.forEach((img) => {
        if (img.url && !list.includes(img.url)) {
          list.push(img.url);
        }
      });
    }
    return list;
  }, [worker]);

  const servicesList = React.useMemo(() => {
    if (!worker?.services || worker.services.length === 0) {
      return categories.slice(0, 4).map((cat) => ({
        id: cat.id,
        categoryId: cat.id,
        name: cat.name,
        duration: '60 phút',
        price: worker?.basePrice || 150000,
      }));
    }

    return worker.services.map((srv, index) => {
      const matchedCat = categories.find((c) => c.id === srv.categoryId);
      const name = matchedCat?.name || `Dịch vụ ${index + 1}`;
      const firstOpt = srv.options?.[0];
      const duration = firstOpt?.durationMinutes ? `${firstOpt.durationMinutes} phút` : '60 phút';
      const price = firstOpt?.price || srv.basePrice || worker?.basePrice || 150000;
      return {
        id: srv.categoryId || `srv-${index}`,
        categoryId: srv.categoryId,
        name,
        duration,
        price,
      };
    });
  }, [worker, categories]);

  const reviewsList: Review[] = reviewsData?.items || [];
  const totalReviewsCount = reviewsData?.totalCount ?? worker?.reviewsCount ?? reviewsList.length;

  const starBreakdown = React.useMemo(() => {
    if (reviewsList.length === 0) {
      return [
        { star: 5, pct: '100%' },
        { star: 4, pct: '0%' },
        { star: 3, pct: '0%' },
        { star: 2, pct: '0%' },
        { star: 1, pct: '0%' },
      ];
    }
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviewsList.forEach((r) => {
      const s = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
      counts[s as 1 | 2 | 3 | 4 | 5] += 1;
    });
    const total = reviewsList.length;
    return [5, 4, 3, 2, 1].map((star) => {
      const cnt = counts[star as 1 | 2 | 3 | 4 | 5];
      const pct = Math.round((cnt / total) * 100);
      return { star, pct: `${pct}%` };
    });
  }, [reviewsList]);

  const ktvName = worker?.fullName || 'Kỹ thuật viên';
  const ktvAvatar = worker?.avatarUrl;
  const ktvRating = typeof worker?.rating === 'number' && worker.rating > 0 ? worker.rating.toFixed(1) : '5.0';
  const badge = BADGE_CONFIG[worker?.badge ?? 0] || BADGE_CONFIG[2];

  const handleBookNow = (selectedCategoryId?: string) => {
    const targetCatId = selectedCategoryId || worker?.services?.[0]?.categoryId || categories[0]?.id || 'dien';
    router.push({
      pathname: '/booking-setup',
      params: {
        workerProfileId: worker?.workerProfileId || worker?.id || id,
        workerUserId: worker?.id || id,
        autoMatch: 'false',
        categoryId: targetCatId,
      },
    } as any);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0F382C" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Hero Image Carousel */}
        <HeroImageCarousel
          imagesList={imagesList}
          ktvAvatar={ktvAvatar}
          badge={badge}
          insets={insets}
          onBack={handleBack}
        />

        {/* Profile Info Header */}
        <View style={styles.profileSection}>
          <Text style={styles.ktvNameTitle}>{ktvName}</Text>
          <View style={styles.subInfoRow}>
            <MaterialIcons name="near-me" size={14} color="#818A91" />
            <Text style={styles.distanceText}>
              {worker?.distance || worker?.city || 'Đà Nẵng'}
            </Text>
            <Text style={styles.dotDivider}>|</Text>
            <MaterialIcons name="star" size={16} color="#F59E0B" />
            <Text style={styles.ratingScore}>{ktvRating}</Text>
            <Text style={styles.reviewsCount}>({totalReviewsCount} đánh giá)</Text>
          </View>

          {/* Fixy Trust Box */}
          <View style={styles.glowCareBox}>
            <View style={styles.glowCareBrand}>
              <View style={styles.glowCheckCircle}>
                <MaterialIcons name="check" size={16} color="#ffffff" />
              </View>
              <Text style={styles.glowCareBrandText}>Fixy</Text>
            </View>

            <View style={styles.glowCareCommitments}>
              <View style={styles.commitmentLine}>
                <MaterialIcons name="check-box" size={18} color="#0F382C" />
                <Text style={styles.commitmentText}>Không mất tiền tip, không phí di chuyển</Text>
              </View>
              <View style={styles.commitmentLine}>
                <MaterialIcons name="check-box" size={18} color="#0F382C" />
                <Text style={styles.commitmentText}>Cam kết chất lượng dịch vụ minh bạch</Text>
              </View>
            </View>
          </View>

          {/* KTV Bio Description */}
          <View style={styles.bioContainer}>
            <Text style={styles.bioText} numberOfLines={showFullBio ? undefined : 3}>
              {worker?.bio || 'Kỹ thuật viên chuyên nghiệp đã được xác thực bởi Fixy.'}
            </Text>

            {worker?.bio && worker.bio.length > 100 ? (
              <Pressable style={styles.expandBioBtn} onPress={() => setShowFullBio(!showFullBio)}>
                <Text style={styles.expandBioText}>{showFullBio ? 'Thu gọn' : 'Hiển thị thêm'}</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Services Section */}
          <View style={styles.servicesSection}>
            <Text style={styles.sectionHeading}>Dịch vụ của tôi</Text>
            <View style={styles.serviceList}>
              {servicesList.map((srv) => (
                <View key={srv.id} style={styles.serviceRowItem}>
                  <View style={styles.serviceRowInfo}>
                    <Text style={styles.serviceNameText}>{srv.name}</Text>
                    <Text style={styles.serviceDurationText}>⏱ {srv.duration} | {formatCurrency(srv.price)}</Text>
                  </View>
                  <Pressable style={styles.selectServiceBtn} onPress={() => handleBookNow(srv.categoryId)}>
                    <MaterialIcons name="add" size={20} color="#0F382C" />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>

          {/* Rating Breakdown Section */}
          <View style={styles.ratingSection}>
            <View style={styles.ratingSummaryCard}>
              <View style={styles.leftScoreBox}>
                <Text style={styles.bigScoreText}>{ktvRating} / 5</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <MaterialIcons key={s} name="star" size={16} color="#F59E0B" />
                  ))}
                </View>
                <Text style={styles.totalReviewsMuted}>({totalReviewsCount} đánh giá)</Text>
              </View>

              {/* Star breakdown bars */}
              <View style={styles.rightBreakdownBars}>
                {starBreakdown.map((item) => (
                  <View key={item.star} style={styles.barRow}>
                    <Text style={styles.starNum}>{item.star}</Text>
                    <MaterialIcons name="star" size={12} color="#F59E0B" />
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: item.pct as any }]} />
                    </View>
                    <Text style={styles.barPctText}>{item.pct}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Review List */}
            <View style={styles.reviewsListContainer}>
              {reviewsList.length > 0 ? (
                reviewsList.map((rev) => {
                  const translated = translatedReviews[rev.id];
                  const reviewerName = rev.customer?.fullName || 'Khách hàng Fixy';
                  return (
                    <View key={rev.id} style={styles.reviewItem}>
                      <View style={styles.reviewerHeader}>
                        {rev.customer?.avatarUrl ? (
                          <Image source={{ uri: rev.customer.avatarUrl }} style={styles.avatarPlaceholderCircle} />
                        ) : (
                          <View style={styles.avatarPlaceholderCircle}>
                            <MaterialIcons name="person" size={20} color="#818A91" />
                          </View>
                        )}
                        <View style={styles.reviewerMeta}>
                          <Text style={styles.reviewerName}>{reviewerName}</Text>
                          <View style={styles.starRowSmall}>
                            {[...Array(Math.min(5, Math.max(1, Math.round(rev.rating || 5))))].map((_, i) => (
                              <MaterialIcons key={i} name="star" size={14} color="#F59E0B" />
                            ))}
                          </View>
                        </View>
                        <Text style={styles.reviewDate}>{rev.createdAt ? formatDateOnly(rev.createdAt) : ''}</Text>
                      </View>

                      <Text style={styles.reviewComment}>
                        {translated ? `[Dịch]: ${rev.comment}` : rev.comment}
                      </Text>

                      {rev.workerReply ? (
                        <View style={styles.workerReplyBox}>
                          <Text style={styles.workerReplyTitle}>Phản hồi từ thợ:</Text>
                          <Text style={styles.workerReplyText}>{rev.workerReply}</Text>
                        </View>
                      ) : null}

                      <Pressable
                        style={styles.translateToggleBtn}
                        onPress={() => toggleTranslate(rev.id)}>
                        <MaterialIcons name="g-translate" size={16} color="#4B5563" />
                        <Text style={styles.translateToggleText}>
                          {translated ? 'Đang hiển thị bản dịch' : 'Đang hiển thị bản gốc '}
                          <Text style={{ fontFamily: 'Montserrat_700Bold', textDecorationLine: 'underline' }}>
                            Dịch
                          </Text>
                        </Text>
                      </Pressable>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyReviewsContainer}>
                  <MaterialIcons name="rate-review" size={32} color="#CBD5E1" />
                  <Text style={styles.emptyReviewsText}>Chưa có đánh giá nào cho thợ này</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Booking Button Bar */}
      <View style={[styles.bottomBarFixed, { paddingBottom: insets.bottom > 0 ? insets.bottom : 14 }]}>
        <Pressable style={styles.primaryBookBtn} onPress={() => handleBookNow()}>
          <Text style={styles.primaryBookBtnText}>Đặt ngay</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FBF9F5',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContainer: {
    height: 380,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  badgeQualityOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: '#E68A2E',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeQualityText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
  },
  pageIndicatorPill: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pageIndicatorText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
  },
  profileSection: {
    padding: 16,
  },
  ktvNameTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 22,
    color: '#1C2526',
    marginBottom: 4,
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  distanceText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: '#818A91',
  },
  dotDivider: {
    color: '#D1D5DB',
  },
  ratingScore: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#1C2526',
  },
  reviewsCount: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
  },
  glowCareBox: {
    backgroundColor: '#F2F7F2',
    borderWidth: 1,
    borderColor: '#C6DFC6',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  glowCareBrand: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 10,
    borderRightWidth: 1,
    borderColor: '#D4E6D4',
  },
  glowCheckCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#486D49',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  glowCareBrandText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 11,
    color: '#0F382C',
  },
  glowCareCommitments: {
    flex: 1,
    gap: 6,
  },
  commitmentLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commitmentText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#0F382C',
  },
  bioContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  bioText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  multilingualText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  expandBioBtn: {
    alignSelf: 'center',
    backgroundColor: '#F4F1EA',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  expandBioText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#1C2526',
  },
  servicesSection: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#0F382C',
    marginBottom: 12,
  },
  serviceList: {
    gap: 10,
  },
  serviceRowItem: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  serviceRowInfo: {
    flex: 1,
  },
  serviceNameText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#1C2526',
    marginBottom: 4,
  },
  serviceDurationText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: '#6B7280',
  },
  selectServiceBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F7F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingSection: {
    marginBottom: 20,
  },
  ratingSummaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  leftScoreBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderColor: '#EFECE6',
    width: '40%',
  },
  bigScoreText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 24,
    color: '#1C2526',
    marginBottom: 4,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 4,
  },
  totalReviewsMuted: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
  },
  rightBreakdownBars: {
    flex: 1,
    paddingLeft: 16,
    gap: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starNum: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#374151',
    width: 10,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#486D49',
  },
  barPctText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 11,
    color: '#6B7280',
    width: 32,
    textAlign: 'right',
  },
  reviewsListContainer: {
    gap: 14,
  },
  reviewItem: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  reviewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  avatarPlaceholderCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerMeta: {
    flex: 1,
  },
  reviewerName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#1C2526',
  },
  starRowSmall: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#9CA3AF',
  },
  reviewComment: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  translateToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  translateToggleText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#4B5563',
  },
  bottomBarFixed: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#EFECE6',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  primaryBookBtn: {
    backgroundColor: '#0F382C',
    paddingVertical: 14,
    borderRadius: 22,
    alignItems: 'center',
  },
  primaryBookBtnText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
  },
  heroPlaceholder: {
    backgroundColor: '#EDF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerReplyBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0F382C',
  },
  workerReplyTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#0F382C',
    marginBottom: 2,
  },
  workerReplyText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#334155',
  },
  emptyReviewsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyReviewsText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#94A3B8',
  },
  carouselChevronLeft: {
    position: 'absolute',
    left: 12,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 5,
  },
  carouselChevronRight: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 5,
  },
});
