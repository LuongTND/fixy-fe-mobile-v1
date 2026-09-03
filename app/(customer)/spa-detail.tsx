import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocationStore } from '@/store/store';
import {
  getSpaPartnerDetail,
  getNearbySpaPartners,
  getSpaPartnerReviews,
  createSpaPartnerReview,
  SpaPartner,
  SpaPartnerDetail,
  SpaPartnerServiceDto,
  SpaPartnerReviewDto,
} from '@/services/api/spa-partners';
import { formatDateTime } from '@/utils/date';
import { formatCurrency } from '@/utils/format';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_DETAIL_COVER: string | null = null;

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
  const queryClient = useQueryClient();

  const { userLocation: customerLocation, fetchUserLocation } = useLocationStore();

  const [likedReviews, setLikedReviews] = React.useState<Record<string, boolean>>({});

  // Review Modal State (createSpaPartnerReview)
  const [showReviewModal, setShowReviewModal] = React.useState(false);
  const [ratingValue, setRatingValue] = React.useState(5);
  const [commentText, setCommentText] = React.useState('');
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false);

  // All Reviews Modal State (getSpaPartnerReviews)
  const [showAllReviewsModal, setShowAllReviewsModal] = React.useState(false);
  const [selectedRatingFilter, setSelectedRatingFilter] = React.useState<number | undefined>(undefined);
  const [reviewSearchTerm, setReviewSearchTerm] = React.useState('');

  React.useEffect(() => {
    fetchUserLocation();
  }, [fetchUserLocation]);

  const { data: spa, isLoading } = useQuery<SpaPartnerDetail | null>({
    queryKey: ['spa-partner-detail', spaId, customerLocation?.lat],
    queryFn: () => getSpaPartnerDetail(spaId!, customerLocation?.lat, customerLocation?.lng),
    enabled: !!spaId,
    staleTime: 2 * 60 * 1000,
  });

  // Query Nearby Spas (getNearbySpaPartners)
  const { data: nearbySpas = [] } = useQuery<SpaPartner[]>({
    queryKey: ['spa-nearby', customerLocation?.lat, customerLocation?.lng],
    queryFn: () =>
      getNearbySpaPartners(
        customerLocation?.lat || 10.7769,
        customerLocation?.lng || 106.7009,
        10,
        6
      ),
    staleTime: 5 * 60 * 1000,
  });

  const otherNearbySpas = (nearbySpas || []).filter((s) => s.id !== spaId);

  // Query All Reviews (getSpaPartnerReviews)
  const { data: allReviewsData, isLoading: loadingAllReviews } = useQuery({
    queryKey: ['spa-reviews', spaId, selectedRatingFilter, reviewSearchTerm],
    queryFn: () =>
      getSpaPartnerReviews(spaId!, {
        pageNumber: 1,
        pageSize: 20,
        searchTerm: reviewSearchTerm,
        minRating: selectedRatingFilter,
      }),
    enabled: !!spaId && showAllReviewsModal,
  });

  const toggleLikeReview = (reviewId: string) => {
    setLikedReviews((prev) => ({ ...prev, [reviewId]: !prev[reviewId] }));
  };

  const handleOpenReviewModal = () => {
    setRatingValue(5);
    setCommentText('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!spaId) return;
    if (!commentText.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung đánh giá của bạn.');
      return;
    }
    setIsSubmittingReview(true);
    try {
      await createSpaPartnerReview(spaId, {
        rating: ratingValue,
        comment: commentText.trim(),
      });
      setIsSubmittingReview(false);
      setShowReviewModal(false);
      setCommentText('');
      setRatingValue(5);
      Alert.alert('Thành công', 'Cảm ơn bạn đã gửi đánh giá cho đối tác Spa!');
      queryClient.invalidateQueries({ queryKey: ['spa-partner-detail', spaId] });
      queryClient.invalidateQueries({ queryKey: ['spa-reviews', spaId] });
    } catch {
      setIsSubmittingReview(false);
      Alert.alert('Lỗi', 'Không thể gửi đánh giá, vui lòng thử lại.');
    }
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
  const servicesByCategory = (spa.allServices || []).reduce(
    (acc, svc) => {
      const catName = svc.categoryName || 'Dịch vụ khác';
      if (!acc[catName]) acc[catName] = [];
      acc[catName].push(svc);
      return acc;
    },
    {} as Record<string, SpaPartnerServiceDto[]>
  );

  const coverUri = spa.coverImageUrl || DEFAULT_DETAIL_COVER;
  const hasCover = !!coverUri;
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
          {hasCover ? (
            <Image source={{ uri: coverUri }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View
              style={[
                styles.heroImage,
                { backgroundColor: '#E8E2D8', alignItems: 'center', justifyContent: 'center' },
              ]}>
              <MaterialIcons name="spa" size={56} color="#C4B9A8" />
            </View>
          )}
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
                          <Text style={styles.servicePrice}>
                            {formatCurrency(svc.discountedPrice)}
                          </Text>
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
          <Pressable style={styles.addReviewBtn} onPress={handleOpenReviewModal}>
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
                        <Image
                          source={{ uri: review.customerAvatar }}
                          style={styles.reviewerAvatar}
                        />
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

                    {review.comment && (
                      <Text style={styles.reviewCommentText}>{review.comment}</Text>
                    )}

                    {/* Review Actions (Like / Share) */}
                    <View style={styles.reviewActionsRow}>
                      <Pressable
                        style={styles.reviewActionBtn}
                        onPress={() => toggleLikeReview(review.id)}>
                        <MaterialIcons
                          name={isLiked ? 'thumb-up' : 'thumb-up-off-alt'}
                          size={15}
                          color={isLiked ? '#0F382C' : '#64748B'}
                        />
                        <Text
                          style={[
                            styles.reviewActionText,
                            isLiked && styles.reviewActionTextActive,
                          ]}>
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

          {/* View All Reviews Button */}
          <Pressable
            style={styles.viewAllReviewsBtn}
            onPress={() => setShowAllReviewsModal(true)}>
            <Text style={styles.viewAllReviewsBtnText}>
              Xem tất cả đánh giá ({allReviewsData?.totalCount || spa.totalReviews || 5})
            </Text>
            <MaterialIcons name="chevron-right" size={18} color="#0F382C" />
          </Pressable>
        </View>

        {/* Nearby Spas Recommendation Card */}
        {otherNearbySpas.length > 0 && (
          <View style={styles.nearbySectionCard}>
            <View style={styles.nearbyHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="near-me" size={20} color="#0F382C" />
                <Text style={styles.nearbySectionTitle}>Cơ Sở Spa Lân Cận</Text>
              </View>
              <Text style={styles.nearbySectionSubtitle}>Bán kính 10km</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.nearbyScrollList}>
              {otherNearbySpas.map((nearby) => (
                <Pressable
                  key={nearby.id}
                  style={styles.nearbyCard}
                  onPress={() =>
                    router.push({
                      pathname: '/(customer)/spa-detail',
                      params: { spaId: nearby.id },
                    } as any)
                  }>
                  <Image
                    source={{
                      uri:
                        nearby.coverImageUrl ||
                        nearby.logoUrl ||
                        'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400',
                    }}
                    style={styles.nearbyCardImage}
                  />
                  <View style={styles.nearbyCardBadge}>
                    <MaterialIcons name="place" size={11} color="#FFFFFF" />
                    <Text style={styles.nearbyCardBadgeText}>
                      {nearby.distanceKm !== null ? `${nearby.distanceKm} km` : 'Gần bạn'}
                    </Text>
                  </View>
                  <View style={styles.nearbyCardBody}>
                    <Text style={styles.nearbyCardName} numberOfLines={1}>
                      {nearby.name}
                    </Text>
                    <View style={styles.nearbyCardRatingRow}>
                      <MaterialIcons name="star" size={13} color="#F59E0B" />
                      <Text style={styles.nearbyCardRatingVal}>{nearby.ratingAvg.toFixed(1)}</Text>
                      <Text style={styles.nearbyCardRatingCount}>({nearby.totalReviews})</Text>
                    </View>
                    <Text style={styles.nearbyCardAddress} numberOfLines={1}>
                      {nearby.address}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

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

      {/* ────────────────── WRITE REVIEW MODAL ────────────────── */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReviewModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowReviewModal(false)} />
          <View style={styles.reviewModalContainer}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Đánh giá Spa</Text>
              <Pressable onPress={() => setShowReviewModal(false)} hitSlop={8}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <Text style={styles.modalSpaName} numberOfLines={1}>
              {spa.name}
            </Text>

            {/* Interactive Star Picker */}
            <View style={styles.starPickerRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setRatingValue(star)}
                  style={styles.starPickerBtn}>
                  <MaterialIcons
                    name={star <= ratingValue ? 'star' : 'star-outline'}
                    size={36}
                    color={star <= ratingValue ? '#F59E0B' : '#CBD5E1'}
                  />
                </Pressable>
              ))}
            </View>
            <Text style={styles.starRatingLabel}>
              {ratingValue === 5
                ? '⭐️⭐️⭐️⭐️⭐️ Rất tuyệt vời!'
                : ratingValue === 4
                ? '⭐️⭐️⭐️⭐️ Hài lòng'
                : ratingValue === 3
                ? '⭐️⭐️⭐️ Bình thường'
                : ratingValue === 2
                ? '⭐️⭐️ Tạm được'
                : '⭐️ Kém'}
            </Text>

            {/* Comment Input */}
            <TextInput
              style={styles.reviewInput}
              multiline
              numberOfLines={4}
              placeholder="Chia sẻ trải nghiệm của bạn về không gian, kỹ thuật viên, chất lượng dịch vụ..."
              placeholderTextColor="#94A3B8"
              value={commentText}
              onChangeText={setCommentText}
              textAlignVertical="top"
            />

            {/* Buttons */}
            <View style={styles.modalActionsRow}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setShowReviewModal(false)}
                disabled={isSubmittingReview}>
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSubmitBtn, isSubmittingReview && { opacity: 0.7 }]}
                onPress={handleSubmitReview}
                disabled={isSubmittingReview}>
                {isSubmittingReview ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={16} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Gửi đánh giá</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ────────────────── ALL REVIEWS MODAL ────────────────── */}
      <Modal
        visible={showAllReviewsModal}
        animationType="slide"
        onRequestClose={() => setShowAllReviewsModal(false)}>
        <View style={[styles.allReviewsScreen, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.allReviewsHeader}>
            <Pressable
              style={styles.allReviewsBackBtn}
              onPress={() => setShowAllReviewsModal(false)}>
              <MaterialIcons name="arrow-back" size={22} color="#0F382C" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.allReviewsHeaderTitle}>Tất cả đánh giá</Text>
              <Text style={styles.allReviewsHeaderSubtitle} numberOfLines={1}>
                {spa.name}
              </Text>
            </View>
            <Pressable
              style={styles.writeReviewMiniBtn}
              onPress={() => {
                setShowAllReviewsModal(false);
                setShowReviewModal(true);
              }}>
              <MaterialIcons name="rate-review" size={16} color="#0F382C" />
              <Text style={styles.writeReviewMiniText}>Viết</Text>
            </Pressable>
          </View>

          {/* Search bar inside reviews */}
          <View style={styles.reviewSearchBox}>
            <MaterialIcons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.reviewSearchInput}
              placeholder="Tìm theo nội dung hoặc tên khách hàng..."
              placeholderTextColor="#94A3B8"
              value={reviewSearchTerm}
              onChangeText={setReviewSearchTerm}
            />
            {reviewSearchTerm.length > 0 && (
              <Pressable onPress={() => setReviewSearchTerm('')}>
                <MaterialIcons name="cancel" size={16} color="#94A3B8" />
              </Pressable>
            )}
          </View>

          {/* Rating filter chips */}
          <View style={styles.ratingFilterChipsRow}>
            {[
              { label: 'Tất cả', value: undefined },
              { label: '5 sao ⭐️', value: 5 },
              { label: '4 sao ⭐️', value: 4 },
              { label: '3 sao ⭐️', value: 3 },
            ].map((chip, idx) => {
              const isActive = selectedRatingFilter === chip.value;
              return (
                <Pressable
                  key={idx}
                  style={[styles.ratingFilterChip, isActive && styles.ratingFilterChipActive]}
                  onPress={() => setSelectedRatingFilter(chip.value)}>
                  <Text
                    style={[
                      styles.ratingFilterChipText,
                      isActive && styles.ratingFilterChipTextActive,
                    ]}>
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Reviews List */}
          {loadingAllReviews ? (
            <View style={styles.allReviewsLoading}>
              <ActivityIndicator size="large" color="#0F382C" />
              <Text style={styles.loadingText}>Đang tải đánh giá...</Text>
            </View>
          ) : (allReviewsData?.items || []).length === 0 ? (
            <View style={styles.allReviewsEmpty}>
              <MaterialIcons name="sentiment-dissatisfied" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Chưa có đánh giá nào phù hợp</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 24) }}
              showsVerticalScrollIndicator={false}>
              {(allReviewsData?.items || []).map((review) => {
                const isLiked = !!likedReviews[review.id];
                return (
                  <View key={review.id} style={styles.reviewItem}>
                    <View style={styles.reviewerHeader}>
                      {review.customerAvatar ? (
                        <Image
                          source={{ uri: review.customerAvatar }}
                          style={styles.reviewerAvatar}
                        />
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
                          <Text style={styles.reviewDateText}>
                            • {formatDateTime(review.createdDate)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {review.comment && (
                      <Text style={styles.reviewCommentText}>{review.comment}</Text>
                    )}
                    <View style={styles.reviewActionsRow}>
                      <Pressable
                        style={styles.reviewActionBtn}
                        onPress={() => toggleLikeReview(review.id)}>
                        <MaterialIcons
                          name={isLiked ? 'thumb-up' : 'thumb-up-off-alt'}
                          size={15}
                          color={isLiked ? '#0F382C' : '#64748B'}
                        />
                        <Text
                          style={[
                            styles.reviewActionText,
                            isLiked && styles.reviewActionTextActive,
                          ]}>
                          {isLiked ? 'Đã thích' : 'Thích'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>
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

  // View all reviews button
  viewAllReviewsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 14,
    gap: 4,
  },
  viewAllReviewsBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#0F382C',
  },

  // Nearby Spas Section
  nearbySectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  nearbyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  nearbySectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#0F382C',
  },
  nearbySectionSubtitle: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#64748B',
  },
  nearbyScrollList: {
    gap: 12,
    paddingRight: 10,
  },
  nearbyCard: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  nearbyCardImage: {
    width: '100%',
    height: 110,
    backgroundColor: '#E2E8F0',
  },
  nearbyCardBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 56, 44, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  nearbyCardBadgeText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  nearbyCardBody: {
    padding: 10,
  },
  nearbyCardName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#1C2526',
    marginBottom: 4,
  },
  nearbyCardRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  nearbyCardRatingVal: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#1C2526',
  },
  nearbyCardRatingCount: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
  },
  nearbyCardAddress: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#64748B',
  },

  // Write Review Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  reviewModalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#0F382C',
  },
  modalSpaName: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  starPickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  starPickerBtn: {
    padding: 4,
  },
  starRatingLabel: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#0F382C',
    textAlign: 'center',
    marginBottom: 16,
  },
  reviewInput: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: '#1C2526',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    height: 100,
    marginBottom: 18,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#64748B',
  },
  modalSubmitBtn: {
    flex: 2,
    backgroundColor: '#0F382C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  modalSubmitBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },

  // All Reviews Screen / Modal
  allReviewsScreen: {
    flex: 1,
    backgroundColor: '#F7F6F2',
  },
  allReviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  allReviewsBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  allReviewsHeaderTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#0F382C',
  },
  allReviewsHeaderSubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#64748B',
  },
  writeReviewMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F0EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  writeReviewMiniText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#0F382C',
  },
  reviewSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  reviewSearchInput: {
    flex: 1,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: '#1C2526',
  },
  ratingFilterChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  ratingFilterChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ratingFilterChipActive: {
    backgroundColor: '#0F382C',
    borderColor: '#0F382C',
  },
  ratingFilterChipText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#64748B',
  },
  ratingFilterChipTextActive: {
    color: '#FFFFFF',
  },
  allReviewsLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  allReviewsEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  reviewDateText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 4,
  },
});
