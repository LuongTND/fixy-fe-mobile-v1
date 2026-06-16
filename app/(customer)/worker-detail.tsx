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

import { useQuery } from '@tanstack/react-query';

function formatScheduleDay(day: number): string {
  if (day === 0) return 'Chủ Nhật';
  return `Thứ ${day + 1}`;
}

function formatScheduleTime(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
  return timeStr;
}

function formatScheduleRange(item: { isActive: boolean; startTime: string; endTime: string }) {
  if (!item.isActive) return 'Nghỉ';
  return `${formatScheduleTime(item.startTime)} - ${formatScheduleTime(item.endTime)}`;
}

export default function WorkerDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activePreviewImage, setActivePreviewImage] = React.useState<string | null>(null);

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

  const { data: schedule = [], isLoading: loadingSchedule } = useQuery({
    queryKey: ['workerSchedule', worker?.workerProfileId],
    queryFn: () => getWeeklySchedule(worker?.workerProfileId || ''),
    enabled: !!worker?.workerProfileId,
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
  });

  const reviewsList = React.useMemo(() => {
    const rawList = reviewsData?.items || worker?.reviews || [];
    return rawList.map((rev: any, index: number) => {
      if (rev.customer) {
        return {
          id: rev.id ?? `review-${index}`,
          reviewerName: rev.customer.fullName || 'Khách hàng',
          rating: rev.rating,
          comment: rev.comment,
          date: rev.createdAt || new Date().toISOString(),
        };
      }
      return {
        id: rev.id ?? `${rev.reviewerName ?? 'review'}-${rev.date ?? index}`,
        reviewerName: rev.reviewerName || 'Khách hàng',
        rating: rev.rating,
        comment: rev.comment,
        date: rev.date || new Date().toISOString(),
      };
    });
  }, [reviewsData, worker?.reviews]);

  const reviewsCount = reviewsData?.totalCount || reviewsList.length;

  if (loading || loadingCategories) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF8228" />
      </View>
    );
  }

  if (!worker) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Không tìm thấy thông tin kỹ thuật viên.</Text>
      </View>
    );
  }

  const handleBookNow = () => {
    const defaultCategory = categories.find((c) => c.code === 'dien');
    router.push({
      pathname: '/booking-setup',
      params: {
        workerProfileId: worker.workerProfileId || worker.id,
        workerUserId: worker.id,
        autoMatch: 'false',
        categoryId: worker.specialties[0] || defaultCategory?.id || 'dien',
      },
    } as any);
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={26} color="#1B1C1C" />
        </Pressable>
        <Text style={styles.headerTitle}>Hồ sơ kỹ thuật viên</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <Image source={{ uri: worker.avatarUrl }} style={styles.avatar} />
            <View style={styles.avatarDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.nameText}>{worker.fullName}</Text>
                {worker.isPro && (
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                )}
              </View>
              <View style={styles.ratingRow}>
                <MaterialIcons name="star" size={18} color="#FFB020" />
                <Text style={styles.ratingText}>{worker.rating.toFixed(1)}</Text>
                <Text style={styles.reviewsCountText}>({worker.reviewsCount} đánh giá)</Text>
              </View>
              <Text style={styles.distanceText}>Khoảng cách: {worker.distance}</Text>
            </View>
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{worker.completedJobs}</Text>
              <Text style={styles.statLbl}>Đã hoàn thành</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statVal}>99%</Text>
              <Text style={styles.statLbl}>Tỉ lệ nhận việc</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statVal}>&lt; 15m</Text>
              <Text style={styles.statLbl}>Phản hồi nhanh</Text>
            </View>
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Giới thiệu</Text>
          <Text style={styles.bioText}>{worker.bio}</Text>

          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Kỹ năng chuyên môn</Text>
          <View style={styles.skillsContainer}>
            {worker.specialties.map((spec) => {
              const category = categories.find((c) => c.id === spec || c.code === spec);
              const name =
                category?.name ||
                (spec === 'dien'
                  ? 'Điện gia dụng'
                  : spec === 'nuoc'
                    ? 'Sửa đường nước'
                    : spec === 'dieuhoa'
                      ? 'Điện lạnh - Điều hòa'
                      : spec === 'maygiat'
                        ? 'Sửa máy giặt'
                        : spec === 'xemay'
                          ? 'Sửa xe máy/ô tô'
                          : spec === 'moc'
                            ? 'Mộc & Nội thất'
                            : spec === 'son'
                              ? 'Sơn & Xây trát'
                              : spec === 'vesinh'
                                ? 'Vệ sinh công nghiệp'
                                : spec);
              return (
                <View key={spec} style={styles.skillBadge}>
                  <Text style={styles.skillBadgeText}>{name}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Portfolio Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Hình ảnh hoạt động</Text>
          {worker.portfolioImages && worker.portfolioImages.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.portfolioScroll}>
              {worker.portfolioImages.map((img) => (
                <Pressable key={img.id} onPress={() => setActivePreviewImage(img.url)}>
                  <Image source={{ uri: img.url }} style={styles.portfolioImg} />
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noReviewsText}>Chưa cập nhật hình ảnh hoạt động.</Text>
          )}
        </View>

        {/* Certificates Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Chứng chỉ & Bằng cấp</Text>
          {worker.certificates && worker.certificates.length > 0 ? (
            <View style={styles.certsContainer}>
              {worker.certificates.map((cert) => (
                <View key={cert.id} style={styles.certItem}>
                  <View style={styles.certRow}>
                    <View style={styles.certIconFrame}>
                      <MaterialIcons name="verified" size={24} color="#00677d" />
                    </View>
                    <View style={styles.certInfo}>
                      <Text style={styles.certTitle}>{cert.title}</Text>
                      <Text style={styles.certIssuer}>Cấp bởi: {cert.issuedBy}</Text>
                      {cert.issuedAt && (
                        <Text style={styles.certDate}>
                          Ngày cấp: {new Date(cert.issuedAt).toLocaleDateString('vi-VN')}
                        </Text>
                      )}
                    </View>
                  </View>
                  {cert.imageUrl ? (
                    <Pressable
                      style={styles.viewCertBtn}
                      onPress={() => setActivePreviewImage(cert.imageUrl || null)}>
                      <MaterialIcons name="image" size={16} color="#00677d" />
                      <Text style={styles.viewCertBtnText}>Xem ảnh chứng chỉ</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noReviewsText}>Chưa cập nhật chứng chỉ chuyên môn.</Text>
          )}
        </View>

        {/* Working Schedule Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Lịch làm việc hàng tuần</Text>
          {loadingSchedule ? (
            <ActivityIndicator size="small" color="#FF8228" />
          ) : schedule && schedule.length > 0 ? (
            <View style={styles.scheduleContainer}>
              {schedule.map((item) => (
                <View
                  key={item.id ?? `${item.dayOfWeek}-${item.startTime}-${item.endTime}`}
                  style={styles.scheduleRow}>
                  <Text style={[styles.scheduleDay, !item.isActive && styles.inactiveText]}>
                    {formatScheduleDay(item.dayOfWeek)}
                  </Text>
                  <Text style={[styles.scheduleTime, !item.isActive && styles.inactiveTimeText]}>
                    {formatScheduleRange(item)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noReviewsText}>Không có lịch làm việc cố định.</Text>
          )}
        </View>

        {/* Reviews Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Đánh giá từ khách hàng ({reviewsCount})</Text>

          {reviewsList.length > 0 ? (
            reviewsList.map((rev) => (
              <View key={rev.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{rev.reviewerName}</Text>
                  <View style={styles.reviewerStars}>
                    {[...Array(5)].map((_, i) => (
                      <MaterialIcons
                        key={i}
                        name="star"
                        size={14}
                        color={i < Math.round(rev.rating) ? '#FFB020' : '#DDDDDD'}
                      />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewDate}>
                  {new Date(rev.date).toLocaleDateString('vi-VN')}
                </Text>
                <Text style={styles.reviewComment}>{rev.comment}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noReviewsText}>Chưa có đánh giá nào cho kỹ thuật viên này.</Text>
          )}
        </View>
      </ScrollView>

      {/* Floating Footer bar */}
      <View style={[styles.footerBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.footerPriceCol}>
          <Text style={styles.footerPriceLbl}>Giá khởi điểm</Text>
          <Text style={styles.footerPriceVal}>{worker.basePrice.toLocaleString()}đ</Text>
        </View>
        <Pressable style={styles.bookButton} onPress={handleBookNow}>
          <Text style={styles.bookButtonText}>Đặt lịch với thợ này</Text>
        </Pressable>
      </View>
      {/* Image Preview Modal */}
      <Modal
        visible={activePreviewImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActivePreviewImage(null)}>
        <Pressable style={styles.modalBackground} onPress={() => setActivePreviewImage(null)}>
          <View style={styles.modalContent}>
            {activePreviewImage ? (
              <Image
                source={{ uri: activePreviewImage }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            ) : null}
            <Pressable style={styles.closeModalBtn} onPress={() => setActivePreviewImage(null)}>
              <MaterialIcons name="close" size={28} color="#ffffff" />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fbf9f8',
  },
  header: {
    height: 96,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#DDDDDD',
    zIndex: 10,
  },
  backButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    marginLeft: 6,
    color: '#383838',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    color: '#BA1A1A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#efedec',
  },
  avatarDetails: {
    flex: 1,
    marginLeft: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  nameText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#383838',
  },
  proBadge: {
    backgroundColor: '#FF8228',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 9,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  ratingText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#383838',
  },
  reviewsCountText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
  },
  distanceText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#FF8228',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#f5f3f2',
    paddingTop: 14,
    marginTop: 16,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#383838',
  },
  statLbl: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 10,
    color: '#818A91',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#DDDDDD',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#383838',
    marginBottom: 10,
  },
  bioText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#574237',
    lineHeight: 20,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  skillBadge: {
    backgroundColor: '#FFE6D5',
    borderWidth: 1,
    borderColor: '#FF8228',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skillBadgeText: {
    color: '#FF8228',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
  },
  reviewItem: {
    borderBottomWidth: 1,
    borderColor: '#f5f3f2',
    paddingVertical: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  reviewerName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#383838',
  },
  reviewerStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 10,
    color: '#818A91',
    marginBottom: 6,
  },
  reviewComment: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#574237',
    lineHeight: 16,
  },
  noReviewsText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
    textAlign: 'center',
    paddingVertical: 10,
  },
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderColor: '#DDDDDD',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  footerPriceCol: {
    justifyContent: 'center',
  },
  footerPriceLbl: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
  },
  footerPriceVal: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#FF8228',
    marginTop: 2,
  },
  bookButton: {
    backgroundColor: '#FF8228',
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    shadowColor: '#FF8228',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  bookButtonText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
  scheduleContainer: {
    gap: 8,
    marginTop: 4,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#f5f3f2',
  },
  scheduleDay: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#383838',
  },
  scheduleTime: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#006e20',
  },
  inactiveText: {
    color: '#818A91',
    fontFamily: 'Montserrat_400Regular',
  },
  inactiveTimeText: {
    color: '#ba1a1a',
    fontFamily: 'Montserrat_400Regular',
  },
  certsContainer: {
    gap: 12,
    marginTop: 4,
  },
  certItem: {
    backgroundColor: '#E7F8FC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bce4eb',
    gap: 12,
  },
  certRow: {
    flexDirection: 'row',
    gap: 12,
  },
  viewCertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#00677d',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  viewCertBtnText: {
    color: '#00677d',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalImage: {
    width: '90%',
    height: '80%',
  },
  closeModalBtn: {
    position: 'absolute',
    top: 44,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  certIconFrame: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00677d',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  certInfo: {
    flex: 1,
    gap: 2,
  },
  certTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#004c5c',
  },
  certIssuer: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#574237',
  },
  certDate: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 10,
    color: '#818A91',
  },
  portfolioScroll: {
    gap: 12,
    marginTop: 4,
  },
  portfolioImg: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#efedec',
  },
});
