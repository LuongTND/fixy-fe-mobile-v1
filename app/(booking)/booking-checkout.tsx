import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery, useMutation } from '@tanstack/react-query';

import { BookingDraft, confirmDraft, getDraftDetails } from '@/services/api/bookings';
import { getWorkerDetails, WorkerProfile } from '@/services/api/workers';
import { fetchCategories } from '@/services/api/categories';

export default function BookingCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { draftId, workerUserId } = useLocalSearchParams<{
    draftId: string;
    workerUserId?: string;
  }>();

  // Fetch draft details via useQuery
  const { data: draft = null, isLoading: loading } = useQuery<BookingDraft | null>({
    queryKey: ['draft', draftId],
    queryFn: () => getDraftDetails(draftId),
    enabled: !!draftId,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
  });

  const category = categories.find(
    (c) => c.id === draft?.categoryId || c.code === draft?.categoryId
  );
  const categoryName =
    category?.name ||
    (draft?.categoryId === 'dien'
      ? 'Điện – Điện tử'
      : draft?.categoryId === 'nuoc'
        ? 'Nước – Ống nước'
        : draft?.categoryId === 'dieuhoa'
          ? 'Bảo dưỡng Điều hòa'
          : draft?.categoryId === 'maygiat'
            ? 'Sửa Máy giặt'
            : draft?.categoryId === 'xemay'
              ? 'Sửa Xe máy – Ô tô'
              : draft?.categoryId === 'moc'
                ? 'Mộc – Nội thất'
                : draft?.categoryId === 'son'
                  ? 'Sơn – Trần nhà'
                  : draft?.categoryId === 'vesinh'
                    ? 'Dọn dẹp Vệ sinh'
                    : 'Dịch vụ sửa chữa');

  // Fetch worker details via dependent useQuery
  const { data: worker = null } = useQuery<WorkerProfile | null>({
    queryKey: ['worker', workerUserId || draft?.workerProfileId],
    queryFn: () => getWorkerDetails(workerUserId || draft!.workerProfileId!),
    enabled: !!(workerUserId || draft?.workerProfileId),
  });

  // Confirm mutation via useMutation
  const confirmMutation = useMutation({
    mutationFn: () => confirmDraft(draftId),
    onSuccess: (result) => {
      if (result.bookingId) {
        Alert.alert('Đặt lịch thành công', 'Yêu cầu của bạn đã được gửi đi.', [
          {
            text: 'Theo dõi đơn',
            onPress: () => router.replace(`/booking-detail?bookingId=${result.bookingId}` as any),
          },
        ]);
      } else {
        throw new Error('No bookingId returned');
      }
    },
    onError: (error) => {
      console.error('Error confirming booking draft:', error);
      Alert.alert('Lỗi', 'Không thể xác nhận đặt lịch. Vui lòng thử lại.');
    },
  });

  const confirmLoading = confirmMutation.isPending;

  const handleConfirm = () => {
    if (!draftId) return;
    confirmMutation.mutate();
  };

  if (loading || categoriesLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF8228" />
      </View>
    );
  }

  if (!draft) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Bản nháp đặt lịch không tồn tại hoặc đã hết hạn.</Text>
      </View>
    );
  }

  const basePrice = worker?.basePrice ?? 120000;
  const travelPrice = 30000;
  const totalPrice = basePrice + travelPrice;

  // Format scheduledAt string
  const formatScheduleTime = (timeStr?: string, type?: number) => {
    if (type === 0 || !timeStr) return 'Ngay bây giờ';
    try {
      const date = new Date(timeStr);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} - ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    } catch {
      return timeStr;
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={26} color="#1B1C1C" />
        </Pressable>
        <Text style={styles.headerTitle}>Xác nhận đặt lịch</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Step Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Chi tiết yêu cầu sửa chữa</Text>

          <View style={styles.detailRow}>
            <MaterialIcons name="work-outline" size={20} color="#818A91" />
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Loại dịch vụ</Text>
              <Text style={styles.detailValue}>{categoryName}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="access-time" size={20} color="#818A91" />
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Thời gian thực hiện</Text>
              <Text style={styles.detailValue}>
                {formatScheduleTime(draft.scheduledAt, draft.scheduledType)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="place" size={20} color="#818A91" />
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Địa chỉ làm việc</Text>
              <Text style={styles.detailValue}>{draft.address}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="error-outline" size={20} color="#818A91" />
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Mô tả sự cố</Text>
              <Text style={styles.detailValue}>{draft.description}</Text>
            </View>
          </View>
        </View>

        {/* Worker allocation Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Phương thức kết nối thợ</Text>

          {draft.autoMatch ? (
            <View style={styles.autoMatchRow}>
              <View style={styles.autoMatchIconBox}>
                <MaterialIcons name="bolt" size={24} color="#FF8228" />
              </View>
              <View style={styles.autoMatchInfoCol}>
                <Text style={styles.autoMatchTitle}>Kết nối nhanh (Tự động)</Text>
                <Text style={styles.autoMatchDesc}>
                  Hệ thống đang phát tìm thợ gần bạn nhất để nhận lịch sớm nhất.
                </Text>
              </View>
            </View>
          ) : worker ? (
            <View style={styles.workerRow}>
              <Image source={{ uri: worker.avatarUrl }} style={styles.workerAvatar} />
              <View style={styles.workerInfoCol}>
                <Text style={styles.workerName}>{worker.fullName}</Text>
                <View style={styles.workerRating}>
                  <MaterialIcons name="star" size={14} color="#FFB020" />
                  <Text style={styles.workerRatingVal}>{worker.rating.toFixed(1)}</Text>
                  <Text style={styles.workerJobsText}>• {worker.completedJobs} đơn thành công</Text>
                </View>
              </View>
            </View>
          ) : (
            <Text style={styles.errorText}>Không load được thông tin thợ chỉ định.</Text>
          )}
        </View>

        {/* Cost summary card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Chi phí ước tính</Text>

          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Giá nhân công cơ bản</Text>
            <Text style={styles.costValue}>{basePrice.toLocaleString()}đ</Text>
          </View>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Phí di chuyển lắp đặt</Text>
            <Text style={styles.costValue}>{travelPrice.toLocaleString()}đ</Text>
          </View>
          <View style={styles.costDivider} />
          <View style={[styles.costRow, { marginTop: 6 }]}>
            <Text style={styles.costTotalLabel}>Tổng số tiền (Ước lượng)</Text>
            <Text style={styles.costTotalValue}>{totalPrice.toLocaleString()}đ</Text>
          </View>

          <View style={styles.infoAlert}>
            <MaterialIcons name="info-outline" size={16} color="#0070E9" />
            <Text style={styles.infoAlertText}>
              Lưu ý: Giá trên là ước lượng cơ bản của thợ. Tổng chi phí thực tế có thể thay đổi sau
              khi khảo sát thực tế và thương lượng (nếu phát sinh vật tư).
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer action bar */}
      <View style={[styles.footerBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable
          style={[styles.confirmButton, confirmLoading && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={confirmLoading}>
          {confirmLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.confirmButtonText}>Xác nhận đặt lịch</Text>
          )}
        </Pressable>
      </View>
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
    fontSize: 14,
    color: '#BA1A1A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 16,
    marginBottom: 16,
  },
  infoCardTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#383838',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderColor: '#f5f3f2',
    paddingBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  detailTextCol: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#383838',
    lineHeight: 18,
  },
  autoMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFE6D5',
    borderWidth: 1,
    borderColor: '#FF8228',
    padding: 12,
    borderRadius: 10,
  },
  autoMatchIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoMatchInfoCol: {
    flex: 1,
  },
  autoMatchTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#622a00',
  },
  autoMatchDesc: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#9a4600',
    marginTop: 2,
    lineHeight: 14,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbf9f8',
    borderWidth: 1,
    borderColor: '#efedec',
    padding: 12,
    borderRadius: 10,
  },
  workerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#efedec',
  },
  workerInfoCol: {
    marginLeft: 12,
    flex: 1,
  },
  workerName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#383838',
  },
  workerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  workerRatingVal: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#383838',
  },
  workerJobsText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  costLabel: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
  },
  costValue: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#383838',
  },
  costDivider: {
    height: 1,
    backgroundColor: '#f5f3f2',
    marginVertical: 4,
  },
  costTotalLabel: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#383838',
  },
  costTotalValue: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#FF8228',
  },
  infoAlert: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#E7F2FC',
    borderWidth: 1,
    borderColor: '#0070E9',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  infoAlertText: {
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#0070E9',
    lineHeight: 16,
  },
  walletBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFE6D5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  walletLabel: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#9a4600',
  },
  walletValue: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#FF8228',
    marginTop: 2,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paymentMethodButton: {
    width: '48%',
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  paymentMethodButtonActive: {
    borderColor: '#FF8228',
    backgroundColor: '#FFF3EA',
  },
  paymentMethodText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#818A91',
  },
  paymentMethodTextActive: {
    color: '#FF8228',
  },
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
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
  confirmButton: {
    backgroundColor: '#FF8228',
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF8228',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  confirmButtonDisabled: {
    backgroundColor: '#EAE5E3',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
  },
});
