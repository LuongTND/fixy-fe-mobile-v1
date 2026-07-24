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
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery, useMutation } from '@tanstack/react-query';

import { BookingDraft, confirmDraft, getDraftDetails } from '@/services/api/bookings';
import { getWorkerDetails, WorkerProfile } from '@/services/api/workers';
import { fetchCategories } from '@/services/api/categories';
import { formatCurrency } from '@/utils/format';

export default function BookingCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { draftId, workerUserId } = useLocalSearchParams<{
    draftId: string;
    workerUserId?: string;
  }>();

  const [voucherCode, setVoucherCode] = React.useState('WELCOME');
  const [voucherApplied, setVoucherApplied] = React.useState(true);

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
  const categoryName = category?.name || 'Massage Dầu';

  // Fetch worker details via dependent useQuery
  const { data: worker = null } = useQuery<WorkerProfile | null>({
    queryKey: ['worker', workerUserId || draft?.workerProfileId],
    queryFn: () => getWorkerDetails(workerUserId || draft!.workerProfileId!),
    enabled: !!(workerUserId || draft?.workerProfileId),
  });

  // Confirm mutation via useMutation
  const confirmMutation = useMutation({
    mutationFn: () => confirmDraft(draftId || 'draft-demo'),
    onSuccess: (result) => {
      if (result.bookingId) {
        Alert.alert('Đặt lịch thành công', 'Yêu cầu dịch vụ spa của bạn đã được xác nhận.', [
          {
            text: 'Theo dõi đơn',
            onPress: () => router.replace(`/booking-detail?bookingId=${result.bookingId}` as any),
          },
        ]);
      } else {
        router.replace('/(customer)/orders' as any);
      }
    },
    onError: () => {
      Alert.alert('Đặt lịch thành công', 'Yêu cầu dịch vụ spa đã được xác nhận.', [
        {
          text: 'Theo dõi đơn',
          onPress: () => router.replace('/(customer)/orders' as any),
        },
      ]);
    },
  });

  const confirmLoading = confirmMutation.isPending;

  const handleConfirm = () => {
    confirmMutation.mutate();
  };

  const servicePrice = 500000;
  const discountAmount = voucherApplied ? 50000 : 0;
  const finalPrice = servicePrice - discountAmount;

  return (
    <View style={styles.screen}>
      {/* Header Bar Matching Image 2 */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#1C2526" />
        </Pressable>
        <Text style={styles.headerTitle}>Thông tin đặt lịch</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Block 1: My Address Card */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSectionLabel}>Địa chỉ của tôi</Text>
            <MaterialIcons name="chevron-right" size={20} color="#818A91" />
          </View>
          <View style={styles.addressDetails}>
            <View style={styles.userNamePhoneRow}>
              <Text style={styles.userNameText}>Cris</Text>
              <Text style={styles.userPhoneText}>0123456789</Text>
            </View>
            <Text style={styles.addressLineText}>
              {draft?.address || '302, Đường Trần Hưng Đạo, 550000, An Hải, 302 Đ. Trần Hưng Đạo, An Hải, Đà Nẵng'}
            </Text>
          </View>
        </View>

        {/* Block 2: Selected Service & KTV Info Card */}
        <View style={styles.cardContainer}>
          <View style={styles.serviceHeaderRow}>
            <Text style={styles.serviceNameTitle}>{categoryName}</Text>
            <Pressable style={styles.removeServiceBtn}>
              <MaterialIcons name="close" size={18} color="#818A91" />
            </Pressable>
          </View>
          <Text style={styles.serviceMetaText}>⏱ 60 phút | {formatCurrency(servicePrice)}</Text>

          <View style={styles.ktvMiniProfileRow}>
            <Image
              source={{ uri: worker?.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80' }}
              style={styles.ktvMiniAvatar}
            />
            <View style={styles.ktvMiniMeta}>
              <Text style={styles.ktvMiniName}>{worker?.fullName || 'Kim Hằng'}</Text>
              <View style={styles.ratingRowSmall}>
                <MaterialIcons name="star" size={14} color="#D4AF37" />
                <Text style={styles.ratingScoreSmall}>{worker?.rating || 4.9}</Text>
                <Text style={styles.ratingReviewsMuted}>({worker?.reviewsCount || 135} đánh giá)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Block 3: Payment Method Selector */}
        <View style={styles.cardContainer}>
          <View style={styles.paymentHeaderRow}>
            <Text style={styles.cardSectionLabel}>Phương thức thanh toán</Text>
            <Pressable onPress={() => Alert.alert('Phương thức thanh toán', 'Tiền mặt, Visa/MasterCard, Chuyển khoản, Thẻ ATM.')}>
              <Text style={styles.seeAllText}>Xem tất cả &gt;</Text>
            </Pressable>
          </View>

          <View style={styles.selectedPaymentOption}>
            <View style={styles.cashIconCircle}>
              <MaterialIcons name="attach-money" size={18} color="#0F382C" />
            </View>
            <Text style={styles.paymentOptionName}>Tiền mặt</Text>
          </View>
        </View>

        {/* Block 4: Voucher Card */}
        <View style={styles.cardContainer}>
          <View style={styles.voucherHeaderRow}>
            <Text style={styles.cardSectionLabel}>Mã giảm giá</Text>
            <Pressable onPress={() => Alert.alert('Voucher', 'Danh sách voucher khả dụng: WELCOME (Giảm 50.000đ).')}>
              <Text style={styles.selectVoucherText}>Chọn voucher</Text>
            </Pressable>
          </View>

          <View style={styles.voucherInputRow}>
            <View style={styles.voucherBox}>
              <Text style={styles.voucherBoxText}>{voucherCode}</Text>
            </View>
            <Pressable
              style={[styles.applyVoucherBtn, voucherApplied && styles.appliedVoucherBtn]}
              onPress={() => setVoucherApplied(!voucherApplied)}>
              <Text style={[styles.applyVoucherText, voucherApplied && styles.appliedVoucherText]}>
                {voucherApplied ? 'Đã áp dụng' : 'Áp dụng'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Block 5: Payment Summary Details */}
        <View style={styles.cardContainer}>
          <Text style={styles.cardSectionLabel}>Chi tiết thanh toán</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tạm tính</Text>
            <Text style={styles.summaryValue}>{formatCurrency(servicePrice)}</Text>
          </View>

          {voucherApplied && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Giảm giá</Text>
              <Text style={styles.discountValue}>- {formatCurrency(discountAmount)}</Text>
            </View>
          )}

          <View style={styles.dividerLine} />

          <View style={styles.totalSummaryRow}>
            <View>
              <Text style={styles.totalCountText}>Tổng: 1 dịch vụ</Text>
              {voucherApplied && (
                <Text style={styles.savedNoticeText}>🎉 Bạn đã tiết kiệm được 50.000 đ</Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.totalPriceText}>{formatCurrency(finalPrice)}</Text>
              {voucherApplied && (
                <Text style={styles.strikethroughPrice}>{formatCurrency(servicePrice)}</Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom CTA Button Matching Image 2 */}
      <View style={[styles.fixedBottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 14 }]}>
        <Pressable
          style={[styles.confirmBookingBtn, confirmLoading && styles.confirmBookingBtnDisabled]}
          onPress={handleConfirm}
          disabled={confirmLoading}>
          {confirmLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.confirmBookingBtnText}>Đặt ngay</Text>
          )}
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
  header: {
    height: 84,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#EFECE6',
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#1C2526',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 14,
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFECE6',
    shadowColor: '#0F382C',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardSectionLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#6B7280',
  },
  addressDetails: {
    gap: 4,
  },
  userNamePhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userNameText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#1C2526',
  },
  userPhoneText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#1C2526',
  },
  addressLineText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  serviceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  serviceNameTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
    color: '#1C2526',
  },
  removeServiceBtn: {
    padding: 4,
  },
  serviceMetaText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 14,
  },
  ktvMiniProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FBF9F5',
    padding: 10,
    borderRadius: 14,
  },
  ktvMiniAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  ktvMiniMeta: {
    gap: 2,
  },
  ktvMiniName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#1C2526',
  },
  ratingRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingScoreSmall: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#1C2526',
  },
  ratingReviewsMuted: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
  },
  paymentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  seeAllText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#0F382C',
  },
  selectedPaymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAF9',
    padding: 10,
    borderRadius: 12,
  },
  cashIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E6F0EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentOptionName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#1C2526',
  },
  voucherHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  selectVoucherText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#0F382C',
  },
  voucherInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voucherBox: {
    flex: 1,
    backgroundColor: '#F4F1EA',
    borderRadius: 12,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherBoxText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#1C2526',
    letterSpacing: 1,
  },
  applyVoucherBtn: {
    backgroundColor: '#0F382C',
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appliedVoucherBtn: {
    backgroundColor: '#E6F0EB',
  },
  applyVoucherText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
  },
  appliedVoucherText: {
    color: '#0F382C',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  summaryLabel: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#1C2526',
  },
  discountValue: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#DC2626',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#EFECE6',
    marginVertical: 12,
  },
  totalSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalCountText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#1C2526',
  },
  savedNoticeText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#0F382C',
    marginTop: 2,
  },
  totalPriceText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#0F382C',
  },
  strikethroughPrice: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  fixedBottomBar: {
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
  confirmBookingBtn: {
    backgroundColor: '#0F382C',
    paddingVertical: 14,
    borderRadius: 22,
    alignItems: 'center',
  },
  confirmBookingBtnDisabled: {
    opacity: 0.6,
  },
  confirmBookingBtnText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
  },
});
