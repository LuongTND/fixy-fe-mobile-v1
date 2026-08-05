import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getSpaPartnerDetail,
  SpaPartnerDetail,
  SpaPartnerServiceDto,
} from '@/services/api/spa-partners';
import { formatCurrency } from '@/utils/format';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_DETAIL_COVER = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80';

function getInitials(name: string): string {
  if (!name) return 'SP';
  const words = name.trim().split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function SpaDetailScreen() {
  const insets = useSafeAreaInsets();
  const { spaId } = useLocalSearchParams<{ spaId: string }>();

  const [customerLocation, setCustomerLocation] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [likedReviews, setLikedReviews] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setCustomerLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      }
    })();
  }, []);

  const {
    data: spa,
    isLoading,
  } = useQuery<SpaPartnerDetail | null>({
    queryKey: ['spa-partner-detail', spaId, customerLocation?.lat],
    queryFn: () =>
      getSpaPartnerDetail(spaId!, customerLocation?.lat, customerLocation?.lng),
    enabled: !!spaId,
    staleTime: 2 * 60 * 1000,
  });

  const toggleLikeReview = (reviewId: string) => {
    setLikedReviews((prev) => ({ ...prev, [reviewId]: !prev[reviewId] }));
  };

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0F382C" />
        <Text style={styles.loadingText}>Đang tải thông tin spa...</Text>
      </View>
    );
  }

  if (!spa) {
    return (
      <View style={[styles.screen, styles.emptyContainer]}>
        <MaterialIcons name="storefront" size={48} color="#CBD5E1" />
        <Text style={styles.emptyTitle}>Không tìm thấy thông tin spa</Text>
        <Pressable style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryBtnText}>Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  // Group services by category
  const servicesByCategory = (spa.allServices || []).reduce((acc, svc) => {
    const catName = svc.categoryName || 'Dịch vụ khác';
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(svc);
    return acc;
  }, {} as Record<string, SpaPartnerServiceDto[]>);

  const coverUri = spa.coverImageUrl || DEFAULT_DETAIL_COVER;
  const viewCount = spa.totalReviews * 43 + 120;

  return (
    <View style={styles.screen}>
      {/* Back Button Header Bar Overlay */}
      <View style={[styles.headerOverlay, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color="#0F382C" />
        </Pressable>
        <Text style={styles.headerTitleText} numberOfLines={1}>
          {spa.name}
        </Text>
        <Pressable style={styles.shareBackButton}>
          <MaterialIcons name="share" size={20} color="#0F382C" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Large Hero Image Banner with Photo Counter Pill */}
        <View style={styles.heroImageContainer}>
          <Image source={{ uri: coverUri }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.photoCountBadge}>
            <Text style={styles.photoCountText}>1/5</Text>
          </View>
        </View>

        {/* Spa Name & Rating Bar */}
        <View style={styles.mainInfoSection}>
          <Text style={styles.spaMainTitle}>{spa.name}</Text>
          <View style={styles.ratingViewsRow}>
            <Text style={styles.ratingNumberText}>{spa.ratingAvg.toFixed(1)}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <MaterialIcons
                  key={star}
                  name="star"
                  size={14}
                  color={star <= Math.round(spa.ratingAvg) ? '#F59E0B' : '#E2E8F0'}
                />
              ))}
            </View>
            <Text style={styles.dotDivider}>|</Text>
            <MaterialIcons name="visibility" size={14} color="#818A91" />
            <Text style={styles.viewsText}>{viewCount} lượt xem</Text>
          </View>
        </View>

        {/* Card 1: Ưu đãi dành cho bạn */}
        {spa.activePromotions.length > 0 && (
          <View style={styles.infoSectionCard}>
            <Text style={styles.cardSectionTitle}>🔥 Ưu đãi dành cho bạn</Text>
            {spa.activePromotions.map((promo) => (
              <View key={promo.id} style={styles.promoInnerCard}>
                <View style={styles.promoTextContainer}>
                  <Text style={styles.promoTitle}>{promo.description || promo.title}</Text>
                  {promo.isCurrentlyOffPeak && (
                    <Text style={styles.offPeakSubtitle}>⚡ Đang áp dụng khung giờ thấp điểm</Text>
                  )}
                </View>
                <View style={styles.promoDiscountPill}>
                  <Text style={styles.promoDiscountText}>-{promo.discountPercent}%</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Card 2: Địa điểm */}
        <View style={styles.infoSectionCard}>
          <Text style={styles.cardSectionTitle}>📍 Địa điểm</Text>
          <View style={styles.locationDetailRow}>
            <MaterialIcons name="place" size={20} color="#0F382C" />
            <View style={styles.locationTextWrapper}>
              <Text style={styles.locationAddressText}>{spa.address}</Text>
              {spa.distanceKm != null && (
                <Text style={styles.locationDistanceText}>Cách bạn khoảng {spa.distanceKm} km</Text>
              )}
            </View>
          </View>
        </View>

        {/* Card 3: Giờ mở cửa */}
        <View style={styles.infoSectionCard}>
          <View style={styles.hoursHeaderRow}>
            <View style={styles.hoursTitleWrapper}>
              <MaterialIcons name="access-time" size={18} color="#0F382C" />
              <Text style={styles.cardSectionTitleNoMargin}>Giờ mở cửa</Text>
            </View>
            <Text style={styles.hoursValueText}>{spa.openingHours || '08:00 – 22:00'}</Text>
          </View>
        </View>

        {/* Bảng Dịch Vụ Spa */}
        {Object.keys(servicesByCategory).length > 0 && (
          <View style={styles.infoSectionCard}>
            <Text style={styles.cardSectionTitle}>💆‍♀️ Bảng Dịch Vụ</Text>
            {Object.entries(servicesByCategory).map(([catName, services]) => (
              <View key={catName} style={styles.serviceCategoryGroup}>
                <Text style={styles.serviceCategoryLabel}>{catName}</Text>
                {services.map((svc) => (
                  <View key={svc.id} style={styles.serviceItemRow}>
                    <View style={styles.serviceLeft}>
                      <Text style={styles.serviceNameText}>{svc.name}</Text>
                      {svc.description && (
                        <Text style={styles.serviceDescText} numberOfLines={2}>
                          {svc.description}
                        </Text>
                      )}
                      <Text style={styles.serviceDurationText}>🕐 {svc.durationMinutes} phút</Text>
                    </View>
                    <View style={styles.serviceRight}>
                      {svc.discountedPrice != null && svc.discountedPrice < svc.price ? (
                        <>
                          <Text style={styles.serviceOldPrice}>{formatCurrency(svc.price)}</Text>
                          <Text style={styles.servicePrice}>{formatCurrency(svc.discountedPrice)}</Text>
                        </>
                      ) : (
                        <Text style={styles.servicePrice}>{formatCurrency(svc.price)}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Card 4: Đánh giá khách hàng (Inspired by Reference Image 4) */}
        <View style={styles.infoSectionCard}>
          <Text style={styles.cardSectionTitle}>⭐ Đánh Giá Khách Hàng</Text>

          {/* Overall Rating Green Box */}
          <View style={styles.overallRatingBox}>
            <View style={styles.ratingScoreGreenBadge}>
              <Text style={styles.ratingScoreNumber}>{spa.ratingAvg.toFixed(1)}</Text>
              <Text style={styles.ratingScoreSubtext}>trên 5</Text>
            </View>

            <View style={styles.ratingScoreRightInfo}>
              <Text style={styles.ratingScoreTitle}>Xuất sắc</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <MaterialIcons
                    key={star}
                    name="star"
                    size={16}
                    color={star <= Math.round(spa.ratingAvg) ? '#F59E0B' : '#E2E8F0'}
                  />
                ))}
              </View>
              <Text style={styles.ratingScoreCountText}>{spa.totalReviews * 12 + 45} đánh giá</Text>
            </View>
          </View>

          {/* Add Review Button */}
          <Pressable style={styles.addReviewBtn}>
            <MaterialIcons name="rate-review" size={18} color="#0F382C" />
            <Text style={styles.addReviewBtnText}>Thêm đánh giá của bạn</Text>
            <MaterialIcons name="chevron-right" size={18} color="#0F382C" />
          </Pressable>

          {/* Review List */}
          {spa.recentReviews && spa.recentReviews.length > 0 && (
            <View style={styles.reviewsList}>
              {spa.recentReviews.map((review) => {
                const isLiked = !!likedReviews[review.id];
                return (
                  <View key={review.id} style={styles.reviewItem}>
                    <View style={styles.reviewerHeader}>
                      {review.customerAvatar ? (
                        <Image source={{ uri: review.customerAvatar }} style={styles.reviewerAvatar} />
                      ) : (
                        <View style={styles.reviewerAvatarInitials}>
                          <Text style={styles.reviewerInitialsText}>
                            {getInitials(review.customerName)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.reviewerInfo}>
                        <Text style={styles.reviewerName}>{review.customerName}</Text>
                        <View style={styles.reviewerStarsRow}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <MaterialIcons
                              key={star}
                              name="star"
                              size={12}
                              color={star <= review.rating ? '#F59E0B' : '#E2E8F0'}
                            />
                          ))}
                        </View>
                      </View>
                    </View>

                    {review.comment && <Text style={styles.reviewCommentText}>{review.comment}</Text>}

                    {/* Review Actions (Like / Share) */}
                    <View style={styles.reviewActionsRow}>
                      <Pressable style={styles.reviewActionBtn} onPress={() => toggleLikeReview(review.id)}>
                        <MaterialIcons
                          name={isLiked ? 'thumb-up' : 'thumb-up-off-alt'}
                          size={15}
                          color={isLiked ? '#0F382C' : '#64748B'}
                        />
                        <Text style={[styles.reviewActionText, isLiked && styles.reviewActionTextActive]}>
                          {isLiked ? 'Đã thích' : 'Thích'}
                        </Text>
                      </Pressable>
                      <Pressable style={styles.reviewActionBtn}>
                        <MaterialIcons name="share" size={15} color="#64748B" />
                        <Text style={styles.reviewActionText}>Chia sẻ</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Action Bar (Inspired by Reference Images 3 & 4) */}
      <View style={[styles.fixedBottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable style={styles.secondarySoftBtn}>
          <Text style={styles.secondarySoftBtnText}>Báo cáo</Text>
        </Pressable>

        <Pressable style={styles.secondaryGrayBtn}>
          <MaterialIcons name="phone" size={18} color="#475569" />
          <Text style={styles.secondaryGrayBtnText}>Gọi</Text>
        </Pressable>

        <Pressable style={styles.primaryGreenBtn}>
          <MaterialIcons name="chat" size={18} color="#FFFFFF" />
          <Text style={styles.primaryGreenBtnText}>Chat để đặt lịch</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9F8F5',
  },
  headerOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE6',
    zIndex: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F4F1EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleText: {
    flex: 1,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#0F382C',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  shareBackButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F4F1EA',
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: {
    paddingBottom: 100,
  },

  // Hero Cover Image
  heroImageContainer: {
    height: 240,
    width: '100%',
    position: 'relative',
    backgroundColor: '#E6F0EB',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoCountText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
  },

  // Main Info Section
  mainInfoSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE6',
  },
  spaMainTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 20,
    color: '#1C2526',
    marginBottom: 6,
  },
  ratingViewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingNumberText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#F59E0B',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  dotDivider: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  viewsText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
  },

  // Info Section Cards
  infoSectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFECE6',
    elevation: 2,
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  cardSectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#1C2526',
    marginBottom: 12,
  },
  cardSectionTitleNoMargin: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#1C2526',
  },

  // Promo Card
  promoInnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  promoTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  promoTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#991B1B',
  },
  offPeakSubtitle: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 11,
    color: '#D97706',
    marginTop: 3,
  },
  promoDiscountPill: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  promoDiscountText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },

  // Location Card
  locationDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  locationTextWrapper: {
    flex: 1,
  },
  locationAddressText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: '#1C2526',
    lineHeight: 19,
  },
  locationDistanceText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    marginTop: 3,
  },

  // Hours Card
  hoursHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hoursTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hoursValueText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#0F382C',
  },

  // Service Category Group
  serviceCategoryGroup: {
    marginBottom: 14,
  },
  serviceCategoryLabel: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#80491E',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  serviceItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F1EA',
  },
  serviceLeft: {
    flex: 1,
    marginRight: 10,
  },
  serviceNameText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#1C2526',
  },
  serviceDescText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    marginTop: 2,
  },
  serviceDurationText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  serviceRight: {
    alignItems: 'flex-end',
  },
  serviceOldPrice: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  servicePrice: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#0F382C',
  },

  // Overall Rating Box (Inspired by Reference Image 4)
  overallRatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
    gap: 16,
    marginBottom: 12,
  },
  ratingScoreGreenBadge: {
    width: 80,
    height: 75,
    borderRadius: 14,
    backgroundColor: '#E6F0EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingScoreNumber: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 26,
    color: '#0F382C',
  },
  ratingScoreSubtext: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#0F382C',
  },
  ratingScoreRightInfo: {
    flex: 1,
  },
  ratingScoreTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#0F382C',
    marginBottom: 2,
  },
  ratingScoreCountText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    marginTop: 3,
  },

  // Add Review Button
  addReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E6F0EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  addReviewBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#0F382C',
    flex: 1,
    marginLeft: 8,
  },

  // Reviews List
  reviewsList: {
    gap: 14,
  },
  reviewItem: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F4F1EA',
  },
  reviewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  reviewerAvatarInitials: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F0EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  reviewerInitialsText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#0F382C',
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#1C2526',
  },
  reviewerStarsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  reviewCommentText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
    marginBottom: 8,
  },
  reviewActionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  reviewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewActionText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#64748B',
  },
  reviewActionTextActive: {
    color: '#0F382C',
    fontFamily: 'Montserrat_700Bold',
  },

  // Fixed Bottom Bar
  fixedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#EFECE6',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  secondarySoftBtn: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
  },
  secondarySoftBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#DC2626',
  },
  secondaryGrayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F4F1EA',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
  },
  secondaryGrayBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#475569',
  },
  primaryGreenBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0F382C',
    paddingVertical: 13,
    borderRadius: 16,
  },
  primaryGreenBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },

  // Loading & Empty
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: '#818A91',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  emptyTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#1C2526',
    marginTop: 12,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#0F382C',
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 14,
  },
  retryBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
});
