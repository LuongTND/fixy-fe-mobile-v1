import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getWorkerDetails, getWeeklySchedule, WorkerProfile } from '@/services/api/workers';
import { getWorkerReviews } from '@/services/api/reviews';
import { fetchCategories } from '@/services/api/categories';
import { formatDateOnly } from '@/utils/date';
import { formatCurrency } from '@/utils/format';
import { useQuery } from '@tanstack/react-query';

const SAMPLE_REVIEWS = [
  {
    id: 'rev-1',
    reviewerName: '.....99',
    rating: 5,
    date: '21/07/2026',
    comment: 'goooooooooooooood',
    isTranslated: false,
  },
  {
    id: 'rev-2',
    reviewerName: 'charlie_cat',
    rating: 5,
    date: '18/07/2026',
    comment: 'good',
    isTranslated: false,
  },
  {
    id: 'rev-3',
    reviewerName: '.....66',
    rating: 5,
    date: '15/07/2026',
    comment: 'cô ấy ở ngoài dễ thương xinh xắn hơn trong hình nhé, nói chuyện vui vẻ thân thiện, massage rất tốt, 10đ nhé',
    isTranslated: false,
  },
  {
    id: 'rev-4',
    reviewerName: 'từ',
    rating: 5,
    date: '11/07/2026',
    comment: 'tốt',
    isTranslated: false,
  },
];

const KTV_SERVICES = [
  { id: 's1', name: 'Massage Dầu', duration: '60 phút', price: 500000 },
  { id: 's2', name: 'Massage Thái', duration: '60 phút', price: 550000 },
  { id: 's3', name: 'Massage Đá Nóng', duration: '75 phút', price: 600000 },
  { id: 's4', name: 'Combo Cạo mặt + Masa mặt + Ráy tai', duration: '60 phút', price: 450000 },
];

export default function WorkerDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activePreviewImage, setActivePreviewImage] = React.useState<string | null>(null);
  const [showFullBio, setShowFullBio] = React.useState(false);
  const [translatedReviews, setTranslatedReviews] = React.useState<Record<string, boolean>>({});

  const { data: worker = null, isLoading: loading } = useQuery<WorkerProfile | null>({
    queryKey: ['worker', id],
    queryFn: () => getWorkerDetails(id || ''),
    enabled: !!id,
  });

  const { data: reviewsData = null } = useQuery({
    queryKey: ['workerReviews', worker?.workerProfileId],
    queryFn: () => getWorkerReviews(worker?.workerProfileId || ''),
    enabled: !!worker?.workerProfileId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
  });

  const toggleTranslate = (reviewId: string) => {
    setTranslatedReviews((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  const ktvName = worker?.fullName || 'Kim Hằng';
  const ktvAvatar = worker?.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80';
  const ktvRating = worker?.rating || 4.9;
  const ktvReviewsCount = worker?.reviewsCount || 135;

  const handleBookNow = () => {
    const defaultCategory = categories.find((c) => c.code === 'dien');
    router.push({
      pathname: '/booking-setup',
      params: {
        workerProfileId: worker?.workerProfileId || worker?.id || 'ktv-1',
        workerUserId: worker?.id || 'ktv-1',
        autoMatch: 'false',
        categoryId: worker?.specialties?.[0] || defaultCategory?.id || 'dien',
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Image Carousel Matching Image 5 */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: ktvAvatar }} style={styles.heroImage} />

          {/* Floating Actions Header */}
          <View style={[styles.topActionsRow, { paddingTop: insets.top + 8 }]}>
            <Pressable style={styles.floatingCircleBtn} onPress={() => router.back()}>
              <MaterialIcons name="chevron-left" size={26} color="#1C2526" />
            </Pressable>
            <View style={styles.topRightActions}>
              <Pressable style={styles.floatingCircleBtn}>
                <MaterialIcons name="favorite-border" size={20} color="#1C2526" />
              </Pressable>
              <Pressable style={styles.floatingCircleBtn}>
                <MaterialIcons name="share" size={20} color="#1C2526" />
              </Pressable>
            </View>
          </View>

          {/* Badge & Carousel Page Indicator */}
          <View style={styles.badgeQualityOverlay}>
            <Text style={styles.badgeQualityText}>Chất lượng</Text>
          </View>

          <View style={styles.pageIndicatorPill}>
            <Text style={styles.pageIndicatorText}>1/7</Text>
          </View>
        </View>

        {/* Profile Info Header */}
        <View style={styles.profileSection}>
          <Text style={styles.ktvNameTitle}>{ktvName}</Text>
          <View style={styles.subInfoRow}>
            <MaterialIcons name="near-me" size={14} color="#818A91" />
            <Text style={styles.distanceText}>100m</Text>
            <Text style={styles.dotDivider}>|</Text>
            <MaterialIcons name="star" size={16} color="#D4AF37" />
            <Text style={styles.ratingScore}>{ktvRating}</Text>
            <Text style={styles.reviewsCount}>({ktvReviewsCount} đánh giá)</Text>
          </View>

          {/* GlowCare Trust Box Matching Image 5 */}
          <View style={styles.glowCareBox}>
            <View style={styles.glowCareBrand}>
              <View style={styles.glowCheckCircle}>
                <MaterialIcons name="check" size={16} color="#ffffff" />
              </View>
              <Text style={styles.glowCareBrandText}>GlowCare</Text>
            </View>

            <View style={styles.glowCareCommitments}>
              <View style={styles.commitmentLine}>
                <MaterialIcons name="check-box" size={18} color="#0F382C" />
                <Text style={styles.commitmentText}>Không mất tiền tip, không phí di chuyển</Text>
              </View>
              <View style={styles.commitmentLine}>
                <MaterialIcons name="check-box" size={18} color="#0F382C" />
                <Text style={styles.commitmentText}>Không cung cấp nhạy cảm</Text>
              </View>
            </View>
          </View>

          {/* KTV Bio Description */}
          <View style={styles.bioContainer}>
            <Text style={styles.bioText} numberOfLines={showFullBio ? undefined : 3}>
              {worker?.bio ||
                'Kinh nghiệm 5 năm làm việc, các bài massage dầu, thái, đá nóng, Giác hơi, combo cạo mặt, masa mặt, lấy Ráy tai, Giác hơi lửa, tẩy tế bào chết toàn thân.'}
            </Text>

            <Text style={styles.multilingualText}>
              5년 경력, 오일 마사지, 타이 마사지, 핫스톤 마사지, 흡입, 얼굴...
            </Text>

            <Pressable style={styles.expandBioBtn} onPress={() => setShowFullBio(!showFullBio)}>
              <Text style={styles.expandBioText}>{showFullBio ? 'Thu gọn' : 'Hiển thị thêm'}</Text>
            </Pressable>
          </View>

          {/* Services Section */}
          <View style={styles.servicesSection}>
            <Text style={styles.sectionHeading}>Dịch vụ của tôi</Text>
            <View style={styles.serviceList}>
              {KTV_SERVICES.map((srv) => (
                <View key={srv.id} style={styles.serviceRowItem}>
                  <View style={styles.serviceRowInfo}>
                    <Text style={styles.serviceNameText}>{srv.name}</Text>
                    <Text style={styles.serviceDurationText}>⏱ {srv.duration} | {formatCurrency(srv.price)}</Text>
                  </View>
                  <Pressable style={styles.selectServiceBtn} onPress={handleBookNow}>
                    <MaterialIcons name="add" size={20} color="#0F382C" />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>

          {/* Rating Breakdown Section Matching Image 4 */}
          <View style={styles.ratingSection}>
            <View style={styles.ratingSummaryCard}>
              <View style={styles.leftScoreBox}>
                <Text style={styles.bigScoreText}>{ktvRating} / 5</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <MaterialIcons key={s} name="star" size={16} color="#D4AF37" />
                  ))}
                </View>
                <Text style={styles.totalReviewsMuted}>({ktvReviewsCount} đánh giá)</Text>
              </View>

              {/* Star breakdown bars */}
              <View style={styles.rightBreakdownBars}>
                {[
                  { star: 5, pct: '98%' },
                  { star: 4, pct: '0%' },
                  { star: 3, pct: '0%' },
                  { star: 2, pct: '0%' },
                  { star: 1, pct: '2%' },
                ].map((item) => (
                  <View key={item.star} style={styles.barRow}>
                    <Text style={styles.starNum}>{item.star}</Text>
                    <MaterialIcons name="star" size={12} color="#D4AF37" />
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: item.pct as any }]} />
                    </View>
                    <Text style={styles.barPctText}>{item.pct}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Review List Matching Image 4 */}
            <View style={styles.reviewsListContainer}>
              {SAMPLE_REVIEWS.map((rev) => {
                const translated = translatedReviews[rev.id];
                return (
                  <View key={rev.id} style={styles.reviewItem}>
                    <View style={styles.reviewerHeader}>
                      <View style={styles.avatarPlaceholderCircle}>
                        <MaterialIcons name="person" size={20} color="#818A91" />
                      </View>
                      <View style={styles.reviewerMeta}>
                        <Text style={styles.reviewerName}>{rev.reviewerName}</Text>
                        <View style={styles.starRowSmall}>
                          {[...Array(rev.rating)].map((_, i) => (
                            <MaterialIcons key={i} name="star" size={14} color="#D4AF37" />
                          ))}
                        </View>
                      </View>
                      <Text style={styles.reviewDate}>{rev.date}</Text>
                    </View>

                    <Text style={styles.reviewComment}>
                      {translated ? `[Dịch]: ${rev.comment}` : rev.comment}
                    </Text>

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
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Booking Button Bar */}
      <View style={[styles.bottomBarFixed, { paddingBottom: insets.bottom > 0 ? insets.bottom : 14 }]}>
        <Pressable style={styles.primaryBookBtn} onPress={handleBookNow}>
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
});
