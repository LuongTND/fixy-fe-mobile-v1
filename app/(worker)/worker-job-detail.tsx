import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import {
  Booking,
  BookingStatus,
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
  acceptBooking,
  declineBooking,
  proposeBooking,
  startTravel,
  arriveBooking,
  startWork,
  completeBooking,
  getBookingDetails,
} from '@/services/api/bookings';
import { getMediaUrl, uploadMediaFiles, MediaCategory, MediaOwnerType } from '@/services/api/media';
import { getApiErrorMessage } from '@/services/api/client';
import { fetchCategories } from '@/services/api/categories';
import { getBookingReview, replyToReview, Review } from '@/services/api/reviews';
import { formatDateTime, formatDateOnly } from '@/utils/date';
import { formatCurrency } from '@/utils/format';

// Map status enum values to string keys and styles
const STATUS_MAP: Record<
  number,
  { label: string; style: any; icon: React.ComponentProps<typeof MaterialIcons>['name'] }
> = {
  [BookingStatus.Pending]: {
    label: 'Khách đang chờ bạn phản hồi',
    style: { color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
    icon: 'hourglass-empty',
  },
  [BookingStatus.Matching]: {
    label: 'Yêu cầu ghép cặp tự động',
    style: { color: '#EA580C', bg: '#FFEDD5', border: '#FED7AA' },
    icon: 'sync',
  },
  [BookingStatus.Confirmed]: {
    label: 'Bạn đã nhận lịch',
    style: { color: '#059669', bg: '#D1FAE5', border: '#A7F3D0' },
    icon: 'assignment-turned-in',
  },
  [BookingStatus.Traveling]: {
    label: 'Đang di chuyển tới địa chỉ',
    style: { color: '#2563EB', bg: '#DBEAFE', border: '#BFDBFE' },
    icon: 'directions-car',
  },
  [BookingStatus.Arrived]: {
    label: 'Đã đến địa chỉ khách hàng',
    style: { color: '#4F46E5', bg: '#EEF2FF', border: '#E0E7FF' },
    icon: 'hail',
  },
  [BookingStatus.InProgress]: {
    label: 'Đang thực hiện dịch vụ Spa',
    style: { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
    icon: 'spa',
  },
  [BookingStatus.Completed]: {
    label: 'Công việc hoàn thành',
    style: { color: '#059669', bg: '#D1FAE5', border: '#A7F3D0' },
    icon: 'check-circle',
  },
  [BookingStatus.Cancelled]: {
    label: 'Đã hủy',
    style: { color: '#475569', bg: '#F1F5F9', border: '#E2E8F0' },
    icon: 'cancel',
  },
  [BookingStatus.Disputed]: {
    label: 'Đang tranh chấp',
    style: { color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
    icon: 'report-problem',
  },
  [BookingStatus.PendingPayment]: {
    label: 'Đang chờ khách thanh toán',
    style: { color: '#E11D48', bg: '#FFE4E6', border: '#FECDD3' },
    icon: 'payment',
  },
};

function resolveReviewImageUri(image: any): string {
  const rawUri =
    typeof image === 'string' ? image : (image?.fileUrl ?? image?.imageUrl ?? image?.url ?? '');

  if (!rawUri) return '';
  return rawUri.startsWith('http') ? rawUri : getMediaUrl(rawUri);
}

export default function WorkerJobDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Modals visibility
  const [declineModalOpen, setDeclineModalOpen] = React.useState(false);
  const [proposeModalOpen, setProposeModalOpen] = React.useState(false);
  const [completeModalOpen, setCompleteModalOpen] = React.useState(false);
  const [replyModalOpen, setReplyModalOpen] = React.useState(false);
  const [activePreviewImage, setActivePreviewImage] = React.useState<string | null>(null);

  // Form states for decline/proposal
  const [declineReason, setDeclineReason] = React.useState('');
  const [proposedPrice, setProposedPrice] = React.useState('');
  const [proposedNote, setProposedNote] = React.useState('');
  const [replyText, setReplyText] = React.useState('');

  // Form states for completion report
  const [completionImages, setCompletionImages] = React.useState<string[]>([]);

  // Query details
  const { data: job = null, isLoading: loading } = useQuery<Booking | null>({
    queryKey: ['booking', id],
    queryFn: () => getBookingDetails(id || ''),
    enabled: !!id,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
  });

  const { data: bookingReview = null, isLoading: reviewLoading } = useQuery<Review | null>({
    queryKey: ['bookingReview', id],
    queryFn: () => getBookingReview(id || ''),
    enabled: !!id && job !== null && Number(job.status) === BookingStatus.Completed,
  });

  const category = categories.find((c) => c.id === job?.categoryId || c.code === job?.categoryId);
  const categoryName =
    category?.name ||
    (job?.categoryId === 'facial'
      ? 'Chăm sóc da mặt'
      : job?.categoryId === 'massage'
        ? 'Massage toàn thân'
        : job?.categoryId === 'body'
          ? 'Tẩy tế bào chết toàn thân'
          : job?.categoryId === 'combo'
            ? 'Gói Spa Chăm sóc toàn diện'
            : 'Dịch vụ Spa');

  // Mutations
  const acceptMutation = useMutation({
    mutationFn: () => acceptBooking(id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['workerBookings'] });
      Alert.alert('Thành công', 'Bạn đã chấp nhận công việc này.');
    },
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['workerBookings'] });
      const errMsg = getApiErrorMessage(err);
      if (errMsg.includes('Current status:')) {
        return;
      }
      Alert.alert('Lỗi', errMsg || 'Không thể chấp nhận công việc.');
    },
  });

  const declineMutation = useMutation({
    mutationFn: () => declineBooking(id || '', declineReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['workerBookings'] });
      setDeclineModalOpen(false);
      setDeclineReason('');
      router.back();
      Alert.alert('Thành công', 'Đã từ chối công việc.');
    },
    onError: (err) => {
      Alert.alert('Lỗi', 'Không thể từ chối công việc.');
    },
  });

  const proposeMutation = useMutation({
    mutationFn: () =>
      proposeBooking(id || '', {
        proposedPrice: Number.parseInt(proposedPrice, 10),
        proposedNote,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['workerBookings'] });
      setProposeModalOpen(false);
      setProposedPrice('');
      setProposedNote('');
      Alert.alert('Thành công', 'Yêu cầu báo giá đã gửi đến khách hàng.');
    },
    onError: (err) => {
      Alert.alert('Lỗi', 'Không thể gửi báo giá.');
    },
  });

  const travelMutation = useMutation({
    mutationFn: () => startTravel(id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['workerBookings'] });
      Alert.alert('Bắt đầu di chuyển', 'Chúc bạn thượng lộ bình an!');
    },
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['workerBookings'] });
      const errMsg = getApiErrorMessage(err);
      if (errMsg.includes('Current status:')) {
        return;
      }
      Alert.alert('Lỗi', errMsg || 'Không thể bắt đầu di chuyển.');
    },
  });

  const arriveMutation = useMutation({
    mutationFn: () => arriveBooking(id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['workerBookings'] });
      Alert.alert('Đã đến nơi', 'Vui lòng chuẩn bị và tiến hành dịch vụ Spa.');
    },
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['workerBookings'] });
      const errMsg = getApiErrorMessage(err);
      if (errMsg.includes('Current status:')) {
        return;
      }
      Alert.alert('Lỗi', errMsg || 'Không thể xác nhận đã đến nơi.');
    },
  });

  const startWorkMutation = useMutation({
    mutationFn: () => startWork(id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['workerBookings'] });
      Alert.alert('Bắt đầu dịch vụ', 'Bắt đầu bấm giờ dịch vụ Spa.');
    },
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['workerBookings'] });
      const errMsg = getApiErrorMessage(err);
      if (errMsg.includes('Current status:')) {
        return;
      }
      Alert.alert('Lỗi', errMsg || 'Không thể bắt đầu dịch vụ Spa.');
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      // Upload completion photos
      let completionMediaIds: string[] = [];
      if (completionImages.length > 0) {
        completionMediaIds = await uploadMediaFiles(
          completionImages,
          MediaCategory.Completion,
          MediaOwnerType.Booking
        );
      }

      return completeBooking(id || '', {
        mediaIds: completionMediaIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['workerBookings'] });
      setCompleteModalOpen(false);
      setCompletionImages([]);
      Alert.alert('Đã nghiệm thu', 'Công việc đã hoàn thành thành công.');
    },
    onError: (err) => {
      console.error(err);
      const msg = getApiErrorMessage(err);
      Alert.alert('Lỗi', msg);
    },
  });

  const replyReviewMutation = useMutation({
    mutationFn: () => {
      if (!bookingReview?.id) {
        throw new Error('Không tìm thấy đánh giá để phản hồi.');
      }
      return replyToReview(bookingReview.id, replyText.trim());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookingReview', id] });
      queryClient.invalidateQueries({ queryKey: ['workerReviews'] });
      setReplyModalOpen(false);
      setReplyText('');
      Alert.alert('Thành công', 'Phản hồi của bạn đã được gửi đến khách hàng.');
    },
    onError: (err) => {
      Alert.alert('Lỗi', getApiErrorMessage(err) || 'Không thể gửi phản hồi đánh giá.');
    },
  });

  const openMapDirections = () => {
    if (!job) return;
    const hasCoords = Boolean(job.lat && job.lng && (Number(job.lat) !== 0 || Number(job.lng) !== 0));
    const dest = hasCoords ? `${job.lat},${job.lng}` : encodeURIComponent(job.address || '');

    if (!dest) {
      Alert.alert('Thông báo', 'Không tìm thấy thông tin địa chỉ hoặc tọa độ của khách hàng.');
      return;
    }

    const url =
      Platform.OS === 'ios'
        ? `https://maps.apple.com/?daddr=${dest}`
        : `https://www.google.com/maps/dir/?api=1&destination=${dest}`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`);
    });
  };

  const handlePickImage = async () => {
    if (completionImages.length >= 5) {
      Alert.alert('Giới hạn', 'Bạn chỉ có thể chọn tối đa 5 hình ảnh.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 5 - completionImages.length,
        quality: 0.5,
      });

      if (!result.canceled) {
        const uris = result.assets.map((asset) => asset.uri);
        setCompletionImages((prev) => [...prev, ...uris].slice(0, 5));
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh từ thư viện.');
    }
  };

  const handleRemoveImage = (index: number) => {
    setCompletionImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenReplyModal = () => {
    setReplyText(bookingReview?.workerReply ?? '');
    setReplyModalOpen(true);
  };

  if (loading || categoriesLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0F382C" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Yêu cầu công việc không tồn tại hoặc đã bị hủy.</Text>
      </View>
    );
  }

  const currentStatusInfo = STATUS_MAP[job.status] || {
    label: 'Không xác định',
    style: { color: '#818A91', bg: '#f5f3f2', border: '#DDDDDD' },
    icon: 'help-outline',
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12), justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#1B1C1C" />
          </Pressable>
          <Text style={styles.headerTitle}>Chi tiết công việc</Text>
        </View>
        <Pressable
          style={{ padding: 8 }}
          onPress={() =>
            router.push({
              pathname: '/(customer)/create-support-ticket',
              params: { bookingId: job.id },
            } as any)
          }>
          <MaterialIcons name="help-outline" size={22} color="#0F382C" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
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
          <Text style={styles.jobIdText}>ID Đơn: #{job.id.slice(-8).toUpperCase()}</Text>
        </View>

        {/* Customer & Location Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Khách hàng & Địa điểm</Text>
          <View style={styles.customerRow}>
            <View style={styles.customerIconWrapper}>
              {job.customerAvatarUrl ? (
                <Image
                  source={{ uri: job.customerAvatarUrl }}
                  style={{ width: 44, height: 44, borderRadius: 22 }}
                />
              ) : (
                <MaterialIcons name="person" size={24} color="#0F382C" />
              )}
            </View>
            <View style={styles.customerDetails}>
              <Text style={styles.customerName}>{job.customerName || 'Khách hàng Fixy'}</Text>
              <Text style={styles.customerPhone}>SĐT: {job.customerPhone || 'Chưa cập nhật'}</Text>
            </View>
          </View>

          {job.status >= BookingStatus.Confirmed && job.status < BookingStatus.Completed && (
            <View style={styles.actionButtonsRow}>
              <Pressable
                style={[styles.actionBtn, styles.actionBtnCall]}
                onPress={() => {
                  const phone = job.customerPhone || '';
                  if (phone) {
                    Linking.openURL(`tel:${phone}`).catch(() => {
                      Alert.alert('Lỗi', 'Không thể khởi chạy ứng dụng gọi điện.');
                    });
                  } else {
                    Alert.alert('Lỗi', 'Chưa có thông tin số điện thoại.');
                  }
                }}>
                <MaterialIcons name="phone" size={18} color="#0F382C" />
                <Text style={styles.actionBtnTextCall}>Gọi khách</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.actionBtnChat]}
                onPress={() => router.push(`/booking-chat?bookingId=${job.id}` as any)}>
                <MaterialIcons name="chat" size={18} color="#ffffff" />
                <Text style={styles.actionBtnTextChat}>Nhắn tin</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.locationRow}>
            <MaterialIcons name="place" size={20} color="#0F382C" style={{ marginTop: 2 }} />
            <View style={styles.locationDetails}>
              <Text style={styles.locationTitle}>Địa chỉ thực hiện dịch vụ</Text>
              <Text style={styles.locationText}>{job.address}</Text>
              {job.lat && job.lng ? (
                <Pressable style={styles.mapBtn} onPress={openMapDirections}>
                  <MaterialIcons name="navigation" size={16} color="#ffffff" />
                  <Text style={styles.mapBtnText}>Chỉ đường bản đồ</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        {/* Description & Request Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Chi tiết yêu cầu</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Loại dịch vụ:</Text>
            <Text style={styles.detailValue}>{categoryName}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Thời lượng dịch vụ:</Text>
            <Text style={styles.detailValue}>
              {(() => {
                const mins =
                  (job as any)?.totalDurationMinutes ??
                  (job as any)?.durationMinutes ??
                  (job as any)?.duration ??
                  (job as any)?.options?.[0]?.durationMinutes ??
                  (job as any)?.option?.durationMinutes ??
                  (job as any)?.serviceOption?.durationMinutes ??
                  60;
                return `${mins} phút`;
              })()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Thời gian hẹn:</Text>
            <Text style={styles.detailValue}>
              {job.scheduledType === 0
                ? 'Làm ngay bây giờ'
                : job.scheduledAt
                  ? formatDateTime(job.scheduledAt)
                  : 'Đang xếp lịch'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Thanh toán bằng:</Text>
            <Text style={styles.detailValue}>
              {(() => {
                const method =
                  job?.paymentMethod ??
                  (job as any)?.PaymentMethod ??
                  (job as any)?.paymentType ??
                  job?.paymentMethodName;
                if (typeof method === 'number' && PAYMENT_METHOD_LABELS[method as PaymentMethod]) {
                  return PAYMENT_METHOD_LABELS[method as PaymentMethod];
                }
                if (typeof method === 'string') {
                  const lower = method.toLowerCase();
                  if (lower.includes('cash') || lower.includes('tien mat')) return 'Tiền mặt';
                  if (lower.includes('wallet') || lower.includes('vi')) return 'Ví Fixy';
                  if (lower.includes('vnpay')) return 'VNPay';
                  if (lower.includes('momo')) return 'MoMo';
                  if (lower.includes('payos')) return 'PayOS';
                  if (lower.includes('card') || lower.includes('the')) return 'Thẻ ngân hàng';
                  return method;
                }
                return 'Tiền mặt';
              })()}
            </Text>
          </View>



          {(job.requestImages && job.requestImages.length > 0) ||
          (job.mediaIds && job.mediaIds.length > 0) ? (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.detailLabel}>Ảnh hiện trạng:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photoList}>
                {job.requestImages && job.requestImages.length > 0
                  ? job.requestImages.map((img, idx) => (
                      <Pressable
                        key={img.id ?? idx}
                        onPress={() => setActivePreviewImage(img.fileUrl)}>
                        <Image source={{ uri: img.fileUrl }} style={styles.photoAttachment} />
                      </Pressable>
                    ))
                  : (job.mediaIds || []).map((mediaId: string) => {
                      const uri = getMediaUrl(mediaId);
                      return (
                        <Pressable key={mediaId} onPress={() => setActivePreviewImage(uri)}>
                          <Image source={{ uri }} style={styles.photoAttachment} />
                        </Pressable>
                      );
                    })}
              </ScrollView>
            </View>
          ) : null}
        </View>

        {/* Financial Breakdown if completed */}
        {job.status === BookingStatus.Completed && (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Hóa đơn nghiệm thu</Text>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>Tổng giá trị công việc</Text>
              <Text style={styles.invoiceVal}>
                {formatCurrency(job.finalAmount || job.finalPrice || 0)}
              </Text>
            </View>
            {job.completeImages && job.completeImages.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.detailLabel}>Ảnh nghiệm thu:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.photoList}>
                  {job.completeImages.map((img, idx) => (
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
        {Number(job.status) === BookingStatus.Completed && (
          <View style={styles.infoCard}>
            <View style={styles.reviewCardHeader}>
              <Text style={styles.infoCardTitle}>Đánh giá của khách hàng</Text>
              {bookingReview ? (
                <View style={styles.reviewStarsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <MaterialIcons
                      key={star}
                      name="star"
                      size={18}
                      color={star <= bookingReview.rating ? '#D4AF37' : '#dcd9d9'}
                    />
                  ))}
                </View>
              ) : null}
            </View>

            {reviewLoading ? (
              <View style={styles.reviewLoadingRow}>
                <ActivityIndicator size="small" color="#0F382C" />
                <Text style={styles.reviewMutedText}>Đang tải đánh giá...</Text>
              </View>
            ) : bookingReview ? (
              <>
                <View style={styles.reviewerRow}>
                  <View style={styles.reviewerAvatar}>
                    {bookingReview.customer?.avatarUrl ? (
                      <Image
                        source={{ uri: bookingReview.customer.avatarUrl }}
                        style={styles.reviewerAvatarImage}
                      />
                    ) : (
                      <MaterialIcons name="person" size={20} color="#0F382C" />
                    )}
                  </View>
                  <View style={styles.reviewerInfo}>
                    <Text style={styles.reviewerName}>
                      {bookingReview.customer?.fullName || 'Khách hàng Fixy'}
                    </Text>
                    {bookingReview.createdAt ? (
                      <Text style={styles.reviewDateText}>
                        {formatDateOnly(bookingReview.createdAt)}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {bookingReview.comment ? (
                  <Text style={styles.reviewComment}>{bookingReview.comment}</Text>
                ) : (
                  <Text style={styles.reviewMutedText}>Khách hàng chưa để lại bình luận.</Text>
                )}

                {bookingReview.images && bookingReview.images.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.photoList}>
                    {bookingReview.images.map((img, idx) => {
                      const uri = resolveReviewImageUri(img);
                      if (!uri) return null;
                      return (
                        <Pressable key={idx} onPress={() => setActivePreviewImage(uri)}>
                          <Image source={{ uri }} style={styles.photoAttachment} />
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}

                {bookingReview.workerReply ? (
                  <View style={styles.workerReplyBox}>
                    <View style={styles.workerReplyHeader}>
                      <MaterialIcons
                        name="reply"
                        size={16}
                        color="#0F382C"
                        style={{ transform: [{ scaleX: -1 }] }}
                      />
                      <Text style={styles.workerReplyTitle}>Phản hồi của bạn</Text>
                    </View>
                    <Text style={styles.workerReplyText}>{bookingReview.workerReply}</Text>
                  </View>
                ) : null}

                <Pressable
                  style={[
                    styles.replyReviewButton,
                    replyReviewMutation.isPending && styles.modalSubmitBtnDisabled,
                  ]}
                  onPress={handleOpenReplyModal}
                  disabled={replyReviewMutation.isPending}>
                  <MaterialIcons name="reply" size={18} color="#ffffff" />
                  <Text style={styles.replyReviewButtonText}>
                    {bookingReview.workerReply ? 'Cập nhật phản hồi' : 'Phản hồi khách hàng'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.reviewMutedText}>
                Khách hàng chưa gửi đánh giá cho công việc này.
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Action footer based on Status */}
      <View style={[styles.footerBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {(job.status === BookingStatus.Pending || job.status === BookingStatus.Matching) && (
          <View style={styles.incomingActions}>
            <Pressable style={styles.declineBtn} onPress={() => setDeclineModalOpen(true)}>
              <Text style={styles.declineBtnText}>Từ chối</Text>
            </Pressable>
            <Pressable style={styles.proposeBtn} onPress={() => setProposeModalOpen(true)}>
              <Text style={styles.proposeBtnText}>Báo giá khác</Text>
            </Pressable>
            <Pressable
              style={styles.acceptBtn}
              onPress={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}>
              {acceptMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.acceptBtnText}>Nhận việc</Text>
              )}
            </Pressable>
          </View>
        )}

        {job.status === BookingStatus.Confirmed && (
          <Pressable
            style={styles.primaryActionBtn}
            onPress={() => travelMutation.mutate()}
            disabled={travelMutation.isPending}>
            {travelMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.primaryActionText}>Bắt đầu di chuyển</Text>
            )}
          </Pressable>
        )}

        {job.status === BookingStatus.Traveling && (
          <Pressable
            style={styles.primaryActionBtn}
            onPress={() => arriveMutation.mutate()}
            disabled={arriveMutation.isPending}>
            {arriveMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.primaryActionText}>Đã đến nơi</Text>
            )}
          </Pressable>
        )}

        {job.status === BookingStatus.Arrived && (
          <Pressable
            style={styles.primaryActionBtn}
            onPress={() => startWorkMutation.mutate()}
            disabled={startWorkMutation.isPending}>
            {startWorkMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.primaryActionText}>Bắt đầu làm việc</Text>
            )}
          </Pressable>
        )}

        {job.status === BookingStatus.InProgress && (
          <Pressable style={styles.primaryActionBtn} onPress={() => setCompleteModalOpen(true)}>
            <Text style={styles.primaryActionText}>Báo cáo hoàn thành & nghiệm thu</Text>
          </Pressable>
        )}

        {(job.status === BookingStatus.PendingPayment ||
          job.status === BookingStatus.Completed ||
          job.status === BookingStatus.Cancelled ||
          job.status === BookingStatus.Disputed) && (
          <Pressable style={styles.secondaryActionBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryActionText}>Quay lại danh sách</Text>
          </Pressable>
        )}
      </View>

      {/* Decline Reason Modal */}
      <Modal visible={declineModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Từ chối công việc</Text>
              <Pressable onPress={() => setDeclineModalOpen(false)}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>
            <Text style={styles.modalLabel}>Lý do từ chối:</Text>
            <TextInput
              style={styles.modalInputText}
              multiline
              numberOfLines={3}
              placeholder="Nhập lý do của bạn (ví dụ: bận lịch đột xuất, địa điểm quá xa...)"
              placeholderTextColor="#9A9A9A"
              value={declineReason}
              onChangeText={setDeclineReason}
            />
            <Pressable
              style={[
                styles.modalSubmitBtn,
                !declineReason.trim() && styles.modalSubmitBtnDisabled,
              ]}
              onPress={() => declineMutation.mutate()}
              disabled={!declineReason.trim() || declineMutation.isPending}>
              {declineMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Xác nhận từ chối</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Proposal Bid Modal */}
      <Modal visible={proposeModalOpen} transparent animationType="fade">
        <View style={styles.centeredModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
          <View style={styles.centeredModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đề xuất giá & Ghi chú</Text>
              <Pressable onPress={() => setProposeModalOpen(false)}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>
            <Text style={styles.modalLabel}>Đơn giá nhân công đề xuất (đ):</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              placeholder="Ví dụ: 180000"
              placeholderTextColor="#9A9A9A"
              value={proposedPrice}
              onChangeText={setProposedPrice}
            />
            <Text style={[styles.modalLabel, { marginTop: 12 }]}>Ghi chú gửi khách hàng:</Text>
            <TextInput
              style={styles.modalInputText}
              multiline
              numberOfLines={3}
              placeholder="Ví dụ: Sẽ có mặt đúng giờ, giá trên chưa bao gồm linh kiện thay thế nếu hư hỏng nặng."
              placeholderTextColor="#9A9A9A"
              value={proposedNote}
              onChangeText={setProposedNote}
            />
            <Pressable
              style={[
                styles.modalSubmitBtn,
                !proposedPrice.trim() && styles.modalSubmitBtnDisabled,
              ]}
              onPress={() => proposeMutation.mutate()}
              disabled={!proposedPrice.trim() || proposeMutation.isPending}>
              {proposeMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Gửi đề xuất báo giá</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Completion Report Modal */}
      <Modal visible={completeModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Xác nhận hoàn thành công việc</Text>
              <Pressable onPress={() => setCompleteModalOpen(false)}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLabel}>Ảnh nghiệm thu hoàn tất (Tối đa 5):</Text>
              <View style={styles.imagesContainer}>
                {completionImages.map((uri, index) => (
                  <View key={uri} style={styles.imageWrapper}>
                    <Pressable onPress={() => setActivePreviewImage(uri)}>
                      <Image source={{ uri }} style={styles.previewImage} />
                    </Pressable>
                    <Pressable
                      style={styles.removeImageBtn}
                      onPress={() => handleRemoveImage(index)}>
                      <MaterialIcons name="close" size={14} color="#ffffff" />
                    </Pressable>
                  </View>
                ))}

                {completionImages.length < 5 && (
                  <Pressable style={styles.addImageBtn} onPress={handlePickImage}>
                    <MaterialIcons name="add-a-photo" size={22} color="#0F382C" />
                    <Text style={styles.addImageText}>Thêm ảnh</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>

            <Pressable
              style={[
                styles.modalSubmitBtn,
                completeMutation.isPending && styles.modalSubmitBtnDisabled,
              ]}
              onPress={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}>
              {completeMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Xác nhận hoàn thành</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Review Reply Modal */}
      <Modal visible={replyModalOpen} transparent animationType="fade">
        <View style={styles.centeredModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
          <View style={styles.centeredModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Phản hồi đánh giá</Text>
              <Pressable
                onPress={() => {
                  setReplyModalOpen(false);
                  setReplyText('');
                }}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>
            <Text style={styles.modalLabel}>Nội dung phản hồi gửi khách hàng:</Text>
            <TextInput
              style={styles.modalInputText}
              multiline
              numberOfLines={4}
              placeholder="Nhập lời cảm ơn hoặc phản hồi của bạn..."
              placeholderTextColor="#9A9A9A"
              value={replyText}
              onChangeText={setReplyText}
              editable={!replyReviewMutation.isPending}
            />
            <Pressable
              style={[
                styles.modalSubmitBtn,
                (!replyText.trim() || replyReviewMutation.isPending) &&
                  styles.modalSubmitBtnDisabled,
              ]}
              onPress={() => replyReviewMutation.mutate()}
              disabled={!replyText.trim() || replyReviewMutation.isPending}>
              {replyReviewMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Gửi phản hồi</Text>
              )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fbf9f8',
  },
  header: {
    paddingBottom: 12,
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
    textAlign: 'center',
    paddingHorizontal: 32,
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
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexShrink: 1,
  },
  statusText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    flexShrink: 1,
  },
  jobIdText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#818A91',
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
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F7F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#383838',
  },
  customerPhone: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#0F382C',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#efedec',
    marginVertical: 14,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  locationDetails: {
    flex: 1,
  },
  locationTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#383838',
    marginBottom: 2,
  },
  locationText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
    lineHeight: 18,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0070E9',
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  mapBtnText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  detailLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#818A91',
    width: 100,
  },
  detailValue: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#383838',
    flex: 1,
  },
  detailValueText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#383838',
    flex: 1,
    lineHeight: 18,
  },
  photoList: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 10,
  },
  photoAttachment: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#efedec',
    marginRight: 10,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#818A91',
  },
  invoiceVal: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#0F382C',
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
  reviewLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewMutedText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
    lineHeight: 19,
  },
  reviewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  reviewerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFE6D5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  reviewerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#383838',
  },
  reviewDateText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    marginTop: 2,
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
    color: '#0F382C',
  },
  workerReplyText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#574237',
    lineHeight: 18,
  },
  replyReviewButton: {
    marginTop: 14,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#0F382C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  replyReviewButtonText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#ffffff',
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
  incomingActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  declineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BA1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    color: '#BA1A1A',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
  },
  proposeBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proposeBtnText: {
    color: '#0F382C',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
  },
  acceptBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
  },
  primaryActionBtn: {
    height: 52,
    borderRadius: 10,
    backgroundColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F382C',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  primaryActionText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
  secondaryActionBtn: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: '#818A91',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#f5f3f2',
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#383838',
  },
  modalLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#818A91',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#383838',
    marginBottom: 16,
  },
  modalInputText: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#383838',
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  modalSubmitBtn: {
    height: 52,
    borderRadius: 10,
    backgroundColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnDisabled: {
    backgroundColor: '#efedec',
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
  completionSection: {
    backgroundColor: '#fbf9f8',
    borderWidth: 1,
    borderColor: '#efedec',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  materialItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#efedec',
  },
  materialTextName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#383838',
    flex: 1.5,
  },
  materialTextPrice: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#0F382C',
    flex: 1,
    textAlign: 'right',
    marginRight: 10,
  },
  deleteMaterialBtn: {
    padding: 4,
  },
  materialInputsWrapper: {
    marginTop: 10,
    gap: 8,
  },
  materialInputSmall: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#ffffff',
    borderRadius: 6,
    height: 38,
    paddingHorizontal: 10,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#383838',
  },
  materialPriceQtyRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addMaterialBtn: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  imageWrapper: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#efedec',
  },
  removeImageBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  addImageBtn: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#0F382C',
    backgroundColor: '#F2F7F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 9,
    color: '#0F382C',
    marginTop: 2,
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
    borderColor: '#0F382C',
    backgroundColor: '#ffffff',
  },
  actionBtnChat: {
    backgroundColor: '#0F382C',
  },
  actionBtnTextCall: {
    color: '#0F382C',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
  },
  actionBtnTextChat: {
    color: '#ffffff',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
  },
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  centeredModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
});
