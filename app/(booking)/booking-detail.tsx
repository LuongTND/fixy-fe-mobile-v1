import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SvgCssUri } from 'react-native-svg/css';

import VNPayWebView from '@/components/VNPayWebView';
import {
  Booking,
  BookingStatus,
  BookingTracking,
  getWallet,
  getBookingDetails,
  getBookingTracking,
  isTerminalBookingStatus,
  PaymentMethod,
  payBookingWithWallet,
  startBookingPayment,
  WalletOverview,
  respondBookingProposal,
  cancelBooking,
} from '@/services/api/bookings';
import { verifyVnpayCallback } from '@/services/api/payment';
import { applyVoucher, getEligibleVouchers } from '@/services/api/vouchers';
import { getBookingReview, Review } from '@/services/api/reviews';
import { getMediaUrl } from '@/services/api/media';
import { fetchCategories } from '@/services/api/categories';
import { formatDateTime, formatDateOnly, formatTime } from '@/utils/date';
import { formatCurrency } from '@/utils/format';
import {
  EligibleVoucher,
  formatVoucherIneligibleReason,
  getVoucherDiscount,
} from '@/services/api/voucher-utils';
import { getDistanceAndDuration } from '@/services/api/goong';

// Map status enum values to string keys and styles
const STATUS_MAP: Record<
  number,
  { label: string; style: any; icon: React.ComponentProps<typeof MaterialIcons>['name'] }
> = {
  [BookingStatus.Pending]: {
    label: 'Chờ KTV xác nhận',
    style: { color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
    icon: 'hourglass-empty',
  },
  [BookingStatus.Matching]: {
    label: 'Đang kết nối KTV',
    style: { color: '#EA580C', bg: '#FFEDD5', border: '#FED7AA' },
    icon: 'sync',
  },
  [BookingStatus.Confirmed]: {
    label: 'KTV đã nhận lịch',
    style: { color: '#059669', bg: '#D1FAE5', border: '#A7F3D0' },
    icon: 'assignment-turned-in',
  },
  [BookingStatus.Traveling]: {
    label: 'KTV đang di chuyển',
    style: { color: '#2563EB', bg: '#DBEAFE', border: '#BFDBFE' },
    icon: 'directions-car',
  },
  [BookingStatus.Arrived]: {
    label: 'KTV đã đến nơi',
    style: { color: '#4F46E5', bg: '#EEF2FF', border: '#E0E7FF' },
    icon: 'hail',
  },
  [BookingStatus.InProgress]: {
    label: 'Đang thực hiện',
    style: { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
    icon: 'build',
  },
  [BookingStatus.Completed]: {
    label: 'Hoàn thành',
    style: { color: '#059669', bg: '#D1FAE5', border: '#A7F3D0' },
    icon: 'check-circle',
  },
  [BookingStatus.Cancelled]: {
    label: 'Đã hủy',
    style: { color: '#475569', bg: '#F1F5F9', border: '#E2E8F0' },
    icon: 'cancel',
  },
  [BookingStatus.Disputed]: {
    label: 'Tranh chấp',
    style: { color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
    icon: 'report-problem',
  },
  [BookingStatus.PendingPayment]: {
    label: 'Chờ thanh toán',
    style: { color: '#E11D48', bg: '#FFE4E6', border: '#FECDD3' },
    icon: 'payment',
  },
};

function getCategoryLabel(categoryId: string): string {
  switch (categoryId) {
    case 'facial':
      return 'Chăm sóc da mặt';
    case 'massage':
      return 'Massage toàn thân';
    case 'spa':
      return 'Spa trị liệu';
    default:
      return 'Dịch vụ Spa';
  }
}

const VNPAY_LOGO_URI = Image.resolveAssetSource(require('../../assets/vnpay.svg')).uri;

export default function BookingDetailScreen() {
  const insets = useSafeAreaInsets();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const queryClient = useQueryClient();

  // Queries
  const { data: booking = null, isLoading: bookingLoading } = useQuery<Booking | null>({
    queryKey: ['booking', bookingId],
    queryFn: () => getBookingDetails(bookingId || ''),
    enabled: !!bookingId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return isTerminalBookingStatus(Number(data.status)) ? false : 5000;
    },
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
  });

  const category = categories.find(
    (c) => c.id === booking?.categoryId || c.code === booking?.categoryId
  );
  const categoryName = category?.name || (booking ? getCategoryLabel(booking.categoryId) : '');

  const { data: tracking = null } = useQuery<BookingTracking | null>({
    queryKey: ['bookingTracking', bookingId],
    queryFn: () => getBookingTracking(bookingId || ''),
    enabled:
      !!bookingId &&
      booking !== null &&
      Number(booking.status) >= BookingStatus.Traveling &&
      Number(booking.status) <= BookingStatus.InProgress,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return 5000;
    },
  });

  const originLat =
    tracking?.workerLat ??
    (tracking as any)?.WorkerLat ??
    (tracking as any)?.lat ??
    (tracking as any)?.latitude;
  const originLng =
    tracking?.workerLng ??
    (tracking as any)?.WorkerLng ??
    (tracking as any)?.lng ??
    (tracking as any)?.longitude;

  const destLat = booking?.lat ? Number(booking.lat) : 16.074988;
  const destLng = booking?.lng ? Number(booking.lng) : 108.228981;

  const { data: etaData = null } = useQuery({
    queryKey: ['bookingGoongEta', originLat, originLng, destLat, destLng],
    queryFn: () =>
      getDistanceAndDuration(
        { lat: Number(originLat), lng: Number(originLng) },
        { lat: destLat, lng: destLng },
        'motorcycle'
      ),
    enabled:
      originLat !== undefined &&
      originLat !== null &&
      originLng !== undefined &&
      originLng !== null &&
      !isNaN(Number(originLat)) &&
      !isNaN(Number(originLng)) &&
      booking !== null &&
      Number(booking.status) >= BookingStatus.Traveling &&
      Number(booking.status) <= BookingStatus.InProgress,
    staleTime: 1000 * 30,
  });

  const { data: wallet = null } = useQuery<WalletOverview | null>({
    queryKey: ['wallet'],
    queryFn: getWallet,
    enabled: booking !== null && Number(booking.status) === BookingStatus.PendingPayment,
  });

  const { data: eligibleVouchers = [], isLoading: loadingEligible } = useQuery<EligibleVoucher[]>({
    queryKey: ['eligibleVouchers', bookingId],
    queryFn: () => getEligibleVouchers(bookingId || ''),
    enabled:
      !!bookingId && booking !== null && Number(booking.status) === BookingStatus.PendingPayment,
  });

  const { data: bookingReview = null } = useQuery<Review | null>({
    queryKey: ['bookingReview', bookingId],
    queryFn: () => getBookingReview(bookingId || ''),
    enabled: !!bookingId && booking !== null && Number(booking.status) === BookingStatus.Completed,
  });

  // Local UI States
  const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState<PaymentMethod>(
    PaymentMethod.Wallet
  );
  const [voucherCode, setVoucherCode] = React.useState('');
  const [selectedVoucher, setSelectedVoucher] = React.useState<EligibleVoucher | null>(null);
  const [voucherError, setVoucherError] = React.useState('');
  const [voucherModalOpen, setVoucherModalOpen] = React.useState(false);
  const [activePreviewImage, setActivePreviewImage] = React.useState<string | null>(null);
  const [vnpayPaymentUrl, setVnpayPaymentUrl] = React.useState<string | null>(null);
  const [showVnpayWebView, setShowVnpayWebView] = React.useState(false);
  const [isVerifyingVnpay, setIsVerifyingVnpay] = React.useState(false);
  const bookingStatus = booking?.status;

  // Clear voucher state if status changes from PendingPayment
  React.useEffect(() => {
    if (bookingStatus !== undefined && Number(bookingStatus) !== BookingStatus.PendingPayment) {
      setSelectedVoucher(null);
      setVoucherCode('');
      setVoucherError('');
    }
  }, [bookingStatus]);

  // Mutations

  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => {
      return cancelBooking(bookingId || '', reason);
    },
    onSuccess: (updatedBooking) => {
      if (updatedBooking && updatedBooking.id) {
        queryClient.setQueryData(['booking', bookingId], updatedBooking);
      }
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      Alert.alert('Đã hủy', 'Đơn đặt lịch của bạn đã được hủy thành công.');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Không thể hủy đơn đặt lịch. Vui lòng thử lại.';
      Alert.alert('Lỗi', msg);
    },
  });

  const respondProposalMutation = useMutation({
    mutationFn: async (payload: { accept: boolean; rejectReason?: string }) => {
      return respondBookingProposal(bookingId || '', payload);
    },
    onSuccess: (updatedBooking) => {
      if (updatedBooking && updatedBooking.id) {
        queryClient.setQueryData(['booking', bookingId], updatedBooking);
      }
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      const status =
        updatedBooking?.status ??
        (booking?.status === BookingStatus.Pending ? BookingStatus.Confirmed : booking?.status);
      const msg =
        status === BookingStatus.Confirmed
          ? 'Bạn đã đồng ý với đề xuất của kỹ thuật viên.'
          : 'Bạn đã từ chối đề xuất của kỹ thuật viên.';
      Alert.alert('Thành công', msg);
    },
    onError: (error) => {
      console.error('Error responding to proposal:', error);
      Alert.alert('Lỗi', 'Không thể phản hồi đề xuất. Vui lòng thử lại.');
    },
  });

  const applyVoucherMutation = useMutation({
    mutationFn: async (codeToApply?: string) => {
      const code = (codeToApply ?? voucherCode).trim().toUpperCase();
      if (!code) {
        throw new Error('Vui lòng nhập mã voucher.');
      }
      const voucher = eligibleVouchers.find((item) => item.code.toUpperCase() === code);
      if (!voucher) {
        throw new Error('Mã voucher không tồn tại hoặc không áp dụng cho đơn này.');
      }
      if (!voucher.isEligible) {
        throw new Error(
          formatVoucherIneligibleReason(voucher.ineligibleReason) ||
            'Voucher không đủ điều kiện sử dụng.'
        );
      }
      return voucher;
    },
    onSuccess: (voucher) => {
      setSelectedVoucher(voucher);
      setVoucherCode(voucher.code);
      setVoucherModalOpen(false);
      Alert.alert('Đã chọn voucher', `Mã ${voucher.code} sẽ được áp dụng khi thanh toán.`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Mã voucher không hợp lệ.';
      setVoucherError(message);
    },
  });

  const payBillMutation = useMutation({
    mutationFn: async () => {
      if (!booking) return;
      if (selectedVoucher) {
        await applyVoucher(selectedVoucher.code, booking.id);
      }

      if (selectedPaymentMethod === PaymentMethod.Wallet) {
        const totalAmount =
          booking.finalPrice || booking.finalAmount || booking.estimatedPrice || 0;
        const finalTotalAmount = Math.max(0, totalAmount - getVoucherDiscount(selectedVoucher));

        if (wallet && wallet.balance < finalTotalAmount) {
          throw new Error('Ví không đủ số dư. Vui lòng nạp thêm tiền hoặc chọn VNPay.');
        }

        await payBookingWithWallet(booking.id);
      } else {
        const payment = await startBookingPayment(booking.id, selectedPaymentMethod);
        const paymentUrl = payment.paymentUrl ?? payment.redirectUrl;
        if (!paymentUrl) throw new Error('Không nhận được liên kết thanh toán.');

        setVnpayPaymentUrl(paymentUrl);
        setShowVnpayWebView(true);
        return 'vnpay';
      }
      return 'wallet';
    },
    onSuccess: (type) => {
      if (type === 'wallet') {
        if (booking) {
          const updatedBooking = { ...booking, status: 6 };
          queryClient.setQueryData(['booking', bookingId], updatedBooking);
        }
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        Alert.alert('Thành công', 'Thanh toán hóa đơn hoàn tất. Cảm ơn bạn đã sử dụng Fixy!');
      }
    },
    onError: (error) => {
      console.error('Error paying booking:', error);
      const message =
        error instanceof Error ? error.message : 'Không thể thanh toán hóa đơn. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    },
  });

  const handleCancelBooking = () => {
    Alert.alert(
      'Hủy đặt lịch',
      'Vui lòng chọn lý do bạn muốn hủy đơn đặt lịch này:',
      [
        { text: 'Thay đổi kế hoạch', onPress: () => cancelMutation.mutate('Thay đổi kế hoạch') },
        { text: 'Tìm được thợ khác', onPress: () => cancelMutation.mutate('Tìm được thợ khác') },
        {
          text: 'Thời gian không phù hợp',
          onPress: () => cancelMutation.mutate('Thời gian không phù hợp'),
        },
        { text: 'Quay lại', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleApplyVoucher = (codeToApply?: string) => {
    applyVoucherMutation.mutate(codeToApply);
  };

  const handleRemoveVoucher = () => {
    setVoucherCode('');
    setSelectedVoucher(null);
    setVoucherError('');
  };

  const handlePayBill = () => {
    payBillMutation.mutate();
  };

  const handleVNPaySuccess = async (_transactionId: string, params: Record<string, string>) => {
    setIsVerifyingVnpay(true);
    try {
      await verifyVnpayCallback(params);
      if (booking) {
        queryClient.setQueryData(['booking', bookingId], {
          ...booking,
          status: BookingStatus.Completed,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      Alert.alert('Thành công', 'Thanh toán hóa đơn hoàn tất. Cảm ơn bạn đã sử dụng Fixy!');
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      const message =
        error instanceof Error
          ? error.message
          : 'Không thể xác thực kết quả thanh toán. Vui lòng kiểm tra lại đơn hàng.';
      Alert.alert('Xác thực giao dịch thất bại', message);
    } finally {
      setIsVerifyingVnpay(false);
      setShowVnpayWebView(false);
      setVnpayPaymentUrl(null);
    }
  };

  const handleVNPayError = (errorMsg: string) => {
    queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
    setShowVnpayWebView(false);
    setVnpayPaymentUrl(null);
    Alert.alert('Kết quả thanh toán', errorMsg);
  };

  const loading = bookingLoading || categoriesLoading;
  const actionLoading = payBillMutation.isPending || isVerifyingVnpay;
  const voucherApplying = applyVoucherMutation.isPending;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0F382C" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Đơn đặt lịch không tồn tại.</Text>
      </View>
    );
  }

  const currentStatusInfo = STATUS_MAP[booking.status] || {
    label: 'Không xác định',
    style: { color: '#818A91', bg: '#f5f3f2', border: '#DDDDDD' },
    icon: 'help-outline',
  };
  const totalAmount = booking.finalPrice || booking.finalAmount || booking.estimatedPrice || 0;
  const discountAmount = getVoucherDiscount(selectedVoucher);
  const finalTotalAmount = Math.max(0, totalAmount - discountAmount);
  const walletInsufficient =
    selectedPaymentMethod === PaymentMethod.Wallet &&
    wallet !== null &&
    wallet.balance < finalTotalAmount;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/home' as any);
              }
            }}>
            <MaterialIcons name="arrow-back" size={26} color="#1B1C1C" />
          </Pressable>
          <Text style={styles.headerTitle}>Chi tiết đặt lịch</Text>
        </View>
        <Pressable
          style={{ padding: 8 }}
          onPress={() =>
            router.push({
              pathname: '/(customer)/create-support-ticket',
              params: { bookingId: booking.id },
            } as any)
          }>
          <MaterialIcons name="help-outline" size={24} color="#FF8228" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Badge card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: currentStatusInfo.style.bg,
                  borderColor: currentStatusInfo.style.border,
                },
              ]}>
              <MaterialIcons
                name={currentStatusInfo.icon}
                size={18}
                color={currentStatusInfo.style.color}
              />
              <Text style={[styles.statusText, { color: currentStatusInfo.style.color }]}>
                {currentStatusInfo.label}
              </Text>
            </View>
            <Text style={styles.bookingIdText}>ID: #{booking.id.slice(-8).toUpperCase()}</Text>
          </View>
        </View>

        {/* Pulse Matching Loader for status == 1 */}
        {Number(booking.status) === BookingStatus.Matching && (
          <View style={styles.matchingContainer}>
            <ActivityIndicator size="large" color="#FF8228" />
            <Text style={styles.matchingText}>Hệ thống đang tìm kiếm Kỹ thuật viên Spa...</Text>
            <Text style={styles.matchingSub}>
              Vui lòng giữ kết nối, quá trình tìm KTV thường mất dưới 2 phút.
            </Text>
          </View>
        )}

        {tracking &&
          Number(booking.status) >= BookingStatus.Traveling &&
          Number(booking.status) <= BookingStatus.InProgress && (
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Theo dõi vị trí KTV</Text>
              <View style={styles.trackingRow}>
                <View style={styles.trackingIconBox}>
                  <MaterialIcons name="near-me" size={22} color="#FF8228" />
                </View>
                <View style={styles.trackingTextCol}>
                  <Text style={styles.trackingTitle}>
                    {tracking.workerInfo?.fullName ||
                      booking.worker?.fullName ||
                      booking.workerName ||
                      'Kỹ thuật viên'}
                    {Number(booking.status) === BookingStatus.Traveling
                      ? ' đang di chuyển tới vị trí của bạn'
                      : ' đang cập nhật vị trí'}
                  </Text>
                  <Text style={styles.trackingMeta}>
                    {tracking.workerLat && tracking.workerLng
                      ? `${tracking.workerLat.toFixed(5)}, ${tracking.workerLng.toFixed(5)}`
                      : 'Chưa có tọa độ mới'}
                  </Text>
                  {tracking.locationUpdatedAt && (
                    <Text style={styles.trackingMeta}>
                      Cập nhật: {formatTime(tracking.locationUpdatedAt)}
                    </Text>
                  )}
                </View>
              </View>

              {/* Goong Distance Matrix ETA & Distance Card */}
              {etaData && (
                <View style={styles.etaCardContainer}>
                  <View style={styles.etaItem}>
                    <MaterialIcons name="two-wheeler" size={20} color="#0F382C" />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={styles.etaLabel}>Khoảng cách</Text>
                      <Text style={styles.etaValue}>{etaData.distanceText}</Text>
                    </View>
                  </View>
                  <View style={styles.etaDivider} />
                  <View style={styles.etaItem}>
                    <MaterialIcons name="schedule" size={20} color="#FF8228" />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={styles.etaLabel}>Thời gian dự kiến</Text>
                      <Text style={styles.etaValue}>{etaData.durationText}</Text>
                    </View>
                  </View>
                </View>
              )}

              <Pressable
                style={styles.trackingMapButton}
                onPress={() =>
                  router.push({
                    pathname: '/booking-tracking',
                    params: {
                      bookingId: booking.id,
                      status: String(booking.status),
                      workerName: booking.worker?.fullName || booking.workerName || '',
                      workerPhone: booking.worker?.phone || booking.workerPhone || '',
                      workerRating: String(booking.worker?.rating || '4.8'),
                      categoryName: categoryName,
                      workerLat: tracking.workerLat ? String(tracking.workerLat) : '',
                      workerLng: tracking.workerLng ? String(tracking.workerLng) : '',
                      customerLat: booking.lat ? String(booking.lat) : '',
                      customerLng: booking.lng ? String(booking.lng) : '',
                    },
                  } as any)
                }>
                <MaterialIcons name="map" size={18} color="#FF8228" />
                <Text style={styles.trackingMapButtonText}>Xem bản đồ theo dõi</Text>
              </Pressable>
            </View>
          )}

        {/* Worker Info Card (Visible if assigned: status >= 2) */}
        {Number(booking.status) >= BookingStatus.Confirmed &&
          (booking.worker || booking.workerName) && (
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Kỹ thuật viên phụ trách</Text>
              <View style={styles.workerRow}>
                <Image
                  source={{
                    uri:
                      booking.worker?.avatarUrl ||
                      booking.workerAvatarUrl ||
                      'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
                  }}
                  style={styles.workerAvatar}
                />
                <View style={styles.workerDetails}>
                  <Text style={styles.workerName}>
                    {booking.worker?.fullName || booking.workerName || 'Kỹ thuật viên'}
                  </Text>
                  <View style={styles.ratingRow}>
                    <MaterialIcons name="star" size={14} color="#FFB020" />
                    <Text style={styles.ratingVal}>
                      {booking.worker?.rating?.toFixed(1) || '4.8'}
                    </Text>
                    <Text style={styles.workerPhone}>
                      • SĐT: {booking.worker?.phone || booking.workerPhone || 'Đang cập nhật'}
                    </Text>
                  </View>
                </View>
              </View>

              {Number(booking.status) < BookingStatus.Completed && (
                <View style={styles.actionButtonsRow}>
                  <Pressable
                    style={[styles.actionBtn, styles.actionBtnCall]}
                    onPress={() =>
                      Alert.alert(
                        'Gọi KTV',
                        `Đang kết nối cuộc gọi tới SĐT: ${booking.worker?.phone || booking.workerPhone || 'Đang cập nhật'}`
                      )
                    }>
                    <MaterialIcons name="phone" size={18} color="#FF8228" />
                    <Text style={styles.actionBtnTextCall}>Gọi KTV</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.actionBtnChat]}
                    onPress={() => router.push(`/booking-chat?bookingId=${booking.id}` as any)}>
                    <MaterialIcons name="chat" size={18} color="#ffffff" />
                    <Text style={styles.actionBtnTextChat}>Nhắn tin</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

        {/* Job details card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Chi tiết công việc</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Loại dịch vụ</Text>
            <Text style={styles.detailValue}>{categoryName}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Thời gian</Text>
            <Text style={styles.detailValue}>{formatDateTime(booking.createdDate)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Địa chỉ dịch vụ</Text>
            <Text style={styles.detailValue}>{booking.address}</Text>
          </View>

          {booking.requestImages && booking.requestImages.length > 0 ? (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.detailLabel}>Ảnh mô tả sự cố:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photoList}>
                {booking.requestImages.map((img, idx) => (
                  <Pressable
                    key={img.id ?? idx}
                    onPress={() => setActivePreviewImage(img.fileUrl)}>
                    <Image source={{ uri: img.fileUrl }} style={styles.photoAttachment} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>

        {/* Invoice Summary (Visible if PENDING_PAYMENT or COMPLETED) */}
        {(Number(booking.status) === BookingStatus.PendingPayment ||
          Number(booking.status) === BookingStatus.Completed) && (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Chi phí nghiệm thu thực tế</Text>

            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Chi phí nhân công & vật tư</Text>
              <Text style={styles.costValue}>{formatCurrency(totalAmount)}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>
                Voucher giảm giá{selectedVoucher ? ` (${selectedVoucher.code})` : ''}
              </Text>
              <Text style={[styles.costValue, { color: '#059669' }]}>
                -{formatCurrency(discountAmount)}
              </Text>
            </View>
            <View style={styles.costDivider} />
            <View style={[styles.costRow, { marginTop: 6 }]}>
              <Text style={styles.costTotalLabel}>Tổng số tiền cần thanh toán</Text>
              <Text style={styles.costTotalValue}>{formatCurrency(finalTotalAmount)}</Text>
            </View>

            {booking.completeImages && booking.completeImages.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.detailLabel}>Ảnh nghiệm thu công việc:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.photoList}>
                  {booking.completeImages.map((img, idx) => (
                    <Pressable
                      key={img.id ?? idx}
                      onPress={() => setActivePreviewImage(img.fileUrl)}>
                      <Image source={{ uri: img.fileUrl }} style={styles.photoAttachment} />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Your Review Card (Visible if status == 6 and review exists) */}
        {Number(booking.status) === BookingStatus.Completed && bookingReview && (
          <View style={styles.infoCard}>
            <View style={styles.reviewCardHeader}>
              <Text style={styles.infoCardTitle}>Đánh giá của bạn</Text>
              <View style={styles.reviewStarsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <MaterialIcons
                    key={star}
                    name="star"
                    size={18}
                    color={star <= bookingReview.rating ? '#FF8228' : '#dcd9d9'}
                  />
                ))}
              </View>
            </View>

            <Text style={styles.reviewComment}>{bookingReview.comment}</Text>

            {bookingReview.images && bookingReview.images.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photoList}>
                {bookingReview.images.map((imgUri: any, idx) => {
                  const imgUrl =
                    typeof imgUri === 'string'
                      ? imgUri
                      : (imgUri?.fileUrl ?? imgUri?.imageUrl ?? imgUri?.url ?? '');
                  if (!imgUrl) return null;
                  const resolvedImgUri = imgUrl.startsWith('http') ? imgUrl : getMediaUrl(imgUrl);
                  return (
                    <Pressable key={idx} onPress={() => setActivePreviewImage(resolvedImgUri)}>
                      <Image source={{ uri: resolvedImgUri }} style={styles.photoAttachment} />
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {bookingReview.workerReply && (
              <View style={styles.workerReplyBox}>
                <View style={styles.workerReplyHeader}>
                  <MaterialIcons
                    name="reply"
                    size={16}
                    color="#FF8228"
                    style={{ transform: [{ scaleX: -1 }] }}
                  />
                  <Text style={styles.workerReplyTitle}>Phản hồi từ kỹ thuật viên</Text>
                </View>
                <Text style={styles.workerReplyText}>{bookingReview.workerReply}</Text>
              </View>
            )}
          </View>
        )}

        </ScrollView>

      {/* Footer Actions */}
      <View style={[styles.footerBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {Number(booking.status) === BookingStatus.PendingPayment ? (
          <View style={{ gap: 10 }}>
            <Pressable
              style={[styles.primaryActionBtn, actionLoading && styles.disabledBtn]}
              onPress={handlePayBill}
              disabled={actionLoading}>
              {actionLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.primaryActionText}>Tiếp tục thanh toán qua cổng online</Text>
              )}
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={handleCancelBooking}>
              <Text style={styles.cancelBtnText}>Hủy đặt lịch</Text>
            </Pressable>
          </View>
        ) : Number(booking.status) === BookingStatus.Pending ||
          Number(booking.status) === BookingStatus.Matching ? (
          // Cancel button for draft/matching statuses
          <Pressable style={styles.cancelBtn} onPress={handleCancelBooking}>
            <Text style={styles.cancelBtnText}>Hủy đặt lịch</Text>
          </Pressable>
        ) : Number(booking.status) === BookingStatus.Confirmed ||
          Number(booking.status) === BookingStatus.Traveling ||
          Number(booking.status) === BookingStatus.Arrived ? (
          // Side-by-side buttons for Confirmed/Traveling/Arrived: Cancel booking and Back to Home
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable style={styles.proposalDeclineBtn} onPress={handleCancelBooking}>
              <Text style={styles.proposalDeclineBtnText}>Hủy đặt lịch</Text>
            </Pressable>
            <Pressable
              style={styles.proposalAcceptBtn}
              onPress={() => router.replace('/home' as any)}>
              <Text style={styles.proposalAcceptBtnText}>Trở về Trang chủ</Text>
            </Pressable>
          </View>
        ) : booking.status === BookingStatus.Completed && !bookingReview ? (
          // Two buttons side-by-side if Completed and not reviewed yet
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              style={styles.proposalDeclineBtn}
              onPress={() => router.replace('/home' as any)}>
              <Text style={styles.proposalDeclineBtnText}>Trở về Trang chủ</Text>
            </Pressable>
            <Pressable
              style={styles.proposalAcceptBtn}
              onPress={() => {
                router.push({
                  pathname: '/(booking)/booking-review',
                  params: {
                    bookingId: booking.id,
                    workerName: booking.worker?.fullName || booking.workerName || 'Kỹ thuật viên',
                    categoryName: categoryName,
                  },
                });
              }}>
              <Text style={styles.proposalAcceptBtnText}>Đánh giá dịch vụ</Text>
            </Pressable>
          </View>
        ) : (
          // Back to Home button for completed (if reviewed), confirmed, in-progress
          <Pressable style={styles.primaryActionBtn} onPress={() => router.replace('/home' as any)}>
            <Text style={styles.primaryActionText}>Trở về Trang chủ</Text>
          </Pressable>
        )}
      </View>

      <Modal visible={voucherModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.voucherModalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <MaterialIcons name="local-activity" size={22} color="#FF8228" />
                <Text style={styles.modalTitle}>Kho voucher khuyến mãi</Text>
              </View>
              <Pressable onPress={() => setVoucherModalOpen(false)}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>

            <Text style={styles.voucherModalIntro}>
              Danh sách các mã giảm giá áp dụng cho đơn dịch vụ này.
            </Text>

            {loadingEligible ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator size="small" color="#FF8228" />
                <Text style={styles.modalMutedText}>Đang tải danh sách voucher...</Text>
              </View>
            ) : eligibleVouchers.length === 0 ? (
              <View style={styles.emptyVoucherBox}>
                <MaterialIcons name="sentiment-neutral" size={36} color="#C7C7C7" />
                <Text style={styles.modalMutedText}>Không tìm thấy voucher khả dụng.</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.voucherList}>
                {eligibleVouchers.map((voucher) => {
                  const isSelected = selectedVoucher?.code === voucher.code;
                  return (
                    <Pressable
                      key={voucher.id ?? voucher.code}
                      style={[
                        styles.voucherItem,
                        isSelected && styles.voucherItemSelected,
                        !voucher.isEligible && styles.voucherItemDisabled,
                      ]}
                      onPress={() => {
                        if (voucher.isEligible) handleApplyVoucher(voucher.code);
                      }}>
                      <View style={styles.voucherItemHeader}>
                        <Text style={styles.voucherItemCode}>{voucher.code}</Text>
                        {voucher.isEligible && (
                          <Text style={styles.voucherUseText}>
                            {isSelected ? 'Đã chọn' : 'Dùng ngay'}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.voucherItemDescription}>
                        {voucher.description ||
                          (voucher.type === 0
                            ? `Giảm ${voucher.value ?? 0}%`
                            : `Giảm ${formatCurrency(voucher.value ?? 0)}`)}
                      </Text>
                      {!!voucher.minOrderValue && (
                        <Text style={styles.voucherItemMeta}>
                          Đơn tối thiểu: {formatCurrency(voucher.minOrderValue)}
                        </Text>
                      )}
                      {voucher.expiresAt && (
                        <Text style={styles.voucherItemMeta}>
                          Hạn dùng: {formatDateOnly(voucher.expiresAt)}
                        </Text>
                      )}
                      {!voucher.isEligible && voucher.ineligibleReason && (
                        <Text style={styles.voucherIneligibleText}>
                          {formatVoucherIneligibleReason(voucher.ineligibleReason)}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <Pressable style={styles.modalCloseButton} onPress={() => setVoucherModalOpen(false)}>
              <Text style={styles.modalCloseButtonText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Full-screen Image Preview Modal */}
      <Modal
        visible={activePreviewImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActivePreviewImage(null)}>
        <Pressable style={styles.previewOverlay} onPress={() => setActivePreviewImage(null)}>
          {activePreviewImage ? (
            <Image
              source={{ uri: activePreviewImage }}
              style={styles.previewFullImage}
              resizeMode="contain"
            />
          ) : null}
          <Pressable style={styles.previewCloseBtn} onPress={() => setActivePreviewImage(null)}>
            <MaterialIcons name="close" size={24} color="#ffffff" />
          </Pressable>
        </Pressable>
      </Modal>

      {vnpayPaymentUrl && (
        <VNPayWebView
          visible={showVnpayWebView}
          paymentUrl={vnpayPaymentUrl}
          onClose={() => {
            setShowVnpayWebView(false);
            if (!isVerifyingVnpay) setVnpayPaymentUrl(null);
          }}
          onSuccess={handleVNPaySuccess}
          onError={handleVNPayError}
        />
      )}
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
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 16,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
  },
  bookingIdText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#818A91',
  },

  matchingContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  matchingText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#383838',
    marginTop: 14,
    textAlign: 'center',
  },
  matchingSub: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    marginTop: 6,
    textAlign: 'center',
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF3EA',
    borderRadius: 12,
    padding: 12,
  },
  trackingIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingTextCol: {
    flex: 1,
  },
  trackingTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#383838',
    lineHeight: 18,
  },
  trackingMeta: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
    marginTop: 2,
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
    fontSize: 14,
    color: '#383838',
    marginBottom: 12,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#efedec',
  },
  workerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  workerName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#383838',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingVal: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#383838',
  },
  workerPhone: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#818A91',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    borderTopWidth: 1,
    borderColor: '#f5f3f2',
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 8,
  },
  actionBtnCall: {
    borderWidth: 1,
    borderColor: '#FF8228',
    backgroundColor: '#ffffff',
  },
  actionBtnChat: {
    backgroundColor: '#FF8228',
  },
  actionBtnTextCall: {
    color: '#FF8228',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
  },
  actionBtnTextChat: {
    color: '#ffffff',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
  },
  detailRow: {
    marginBottom: 12,
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
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    fontSize: 13,
    color: '#383838',
  },
  costTotalValue: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#FF8228',
  },
  paymentSectionLabel: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 11,
    color: '#818A91',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  selectedVoucherBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
  },
  selectedVoucherTextCol: {
    flex: 1,
  },
  selectedVoucherCode: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#047857',
  },
  selectedVoucherDiscount: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#059669',
    marginTop: 2,
  },
  removeVoucherButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  voucherInput: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    backgroundColor: '#fbf9f8',
    paddingHorizontal: 12,
    color: '#383838',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
  },
  applyVoucherButton: {
    minWidth: 86,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F382C',
    paddingHorizontal: 12,
  },
  smallButtonDisabled: {
    backgroundColor: '#EAE5E3',
  },
  applyVoucherButtonText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#ffffff',
  },
  voucherErrorText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#BA1A1A',
    marginTop: 6,
  },
  chooseVoucherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 10,
  },
  chooseVoucherText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#0F382C',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentMethodButton: {
    flex: 1,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#EFECE6',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 12,
  },
  paymentMethodButtonActive: {
    borderColor: '#0F382C',
    backgroundColor: '#F4F1EA',
  },
  paymentMethodTextCol: {
    flex: 1,
  },
  vnpayLogoWrap: {
    width: 58,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#1C2526',
  },
  paymentMethodSubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 10,
    color: '#818A91',
    marginTop: 2,
  },
  paymentWarningBox: {
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  paymentWarningText: {
    flex: 1,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#BA1A1A',
    lineHeight: 16,
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
    borderColor: '#EFECE6',
    shadowColor: '#0F382C',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  primaryActionBtn: {
    backgroundColor: '#0F382C',
    borderRadius: 20,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F382C',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryActionText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
  },
  disabledBtn: {
    backgroundColor: '#EAE5E3',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#BA1A1A',
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cancelBtnText: {
    color: '#BA1A1A',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  voucherModalContent: {
    maxHeight: '78%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#f5f3f2',
    paddingBottom: 14,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#383838',
  },
  voucherModalIntro: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    lineHeight: 18,
    marginTop: 12,
    marginBottom: 12,
  },
  modalCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 120,
  },
  modalMutedText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#818A91',
    textAlign: 'center',
  },
  emptyVoucherBox: {
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#DDDDDD',
    borderRadius: 12,
    backgroundColor: '#fbf9f8',
  },
  voucherList: {
    gap: 12,
    paddingBottom: 4,
  },
  voucherItem: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 14,
  },
  voucherItemSelected: {
    borderColor: '#FF8228',
    backgroundColor: '#FFF3EA',
  },
  voucherItemDisabled: {
    opacity: 0.62,
    backgroundColor: '#f5f3f2',
  },
  voucherItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  voucherItemCode: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#FF8228',
  },
  voucherUseText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 11,
    color: '#ffffff',
    backgroundColor: '#FF8228',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  voucherItemDescription: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#383838',
    lineHeight: 17,
    marginTop: 8,
  },
  voucherItemMeta: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 10,
    color: '#818A91',
    marginTop: 5,
  },
  voucherIneligibleText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 10,
    color: '#BA1A1A',
    marginTop: 8,
    lineHeight: 15,
  },
  modalCloseButton: {
    height: 46,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  modalCloseButtonText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#818A91',
  },
  photoList: {
    marginTop: 8,
  },
  photoAttachment: {
    width: 72,
    height: 72,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#efedec',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewFullImage: {
    width: '90%',
    height: '80%',
  },
  previewCloseBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proposalDisabledBtn: {
    opacity: 0.62,
  },
  proposalCard: {
    borderColor: '#FF8228',
    backgroundColor: '#FFFBF7',
  },
  proposalCardTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#FF8228',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderColor: '#FFEEDD',
    paddingBottom: 8,
  },
  proposalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  proposalDetailLabel: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
  },
  proposalPriceVal: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#FF8228',
  },
  proposalTimeVal: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#383838',
  },
  proposalNoteContainer: {
    backgroundColor: '#FFE6D5',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    marginBottom: 14,
  },
  proposalNoteLabel: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#622a00',
    marginBottom: 4,
  },
  proposalNoteText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#574237',
    fontStyle: 'italic',
  },
  proposalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  proposalDeclineBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proposalDeclineBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#818A91',
  },
  proposalAcceptBtn: {
    flex: 1.2,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FF8228',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proposalAcceptBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#ffffff',
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#383838',
    lineHeight: 21,
  },
  workerReplyBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  workerReplyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  workerReplyTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#FF8228',
  },
  workerReplyText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#574237',
    lineHeight: 18,
  },
  trackingMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF3EA',
    borderWidth: 1,
    borderColor: '#FF8228',
    borderRadius: 8,
    height: 40,
    marginTop: 12,
    width: '100%',
  },
  trackingMapButtonText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#FF8228',
  },
  etaCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  etaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etaDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
  },
  etaLabel: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 11,
    color: '#6B7280',
  },
  etaValue: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#111827',
  },
});
