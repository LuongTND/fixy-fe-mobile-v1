import { getApiErrorMessage } from '@/services/api/client';
import { Address, getMyAddresses } from '@/services/api/addresses';
import {
  ApiPaymentMethodOption,
  BookingDraft,
  confirmDraft,
  createDraft,
  fetchPaymentMethodsApi,
  getDraftDetails,
  payBookingWithWallet,
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
  startBookingPayment,
} from '@/services/api/bookings';
import { fetchCategories } from '@/services/api/categories';
import { getWorkerDetails, WorkerProfile } from '@/services/api/workers';
import { getWalletOverview, WalletOverview } from '@/services/api/wallet';
import { applyVoucher, getEligibleVouchers } from '@/services/api/vouchers';
import { EligibleVoucher, getVoucherDiscount } from '@/services/api/voucher-utils';
import { formatCurrency, formatFullAddress } from '@/utils/format';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BookingCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const {
    draftId: paramDraftId,
    workerUserId,
    workerProfileId: paramWorkerProfileId,
    categoryId: paramCategoryId,
    totalDurationMinutes: paramTotalDurationMinutes,
  } = useLocalSearchParams<{
    draftId?: string;
    workerUserId?: string;
    workerProfileId?: string;
    categoryId?: string;
    totalDurationMinutes?: string;
  }>();

  const [voucherCode, setVoucherCode] = React.useState('');
  const [selectedVoucher, setSelectedVoucher] = React.useState<EligibleVoucher | null>(null);
  const [discountAmount, setDiscountAmount] = React.useState(0);
  const [voucherApplying, setVoucherApplying] = React.useState(false);
  const [voucherError, setVoucherError] = React.useState('');
  const [showVoucherModal, setShowVoucherModal] = React.useState(false);
  const [selectedAddress, setSelectedAddress] = React.useState<Address | null>(null);
  const [showAddressModal, setShowAddressModal] = React.useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState<number>(PaymentMethod.Cash);
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);

  // Invalidate addresses query on focus so new address is fetched instantly
  useFocusEffect(
    React.useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    }, [queryClient])
  );

  // Fetch Wallet Overview
  const { data: wallet = null } = useQuery<WalletOverview>({
    queryKey: ['wallet'],
    queryFn: getWalletOverview,
  });

  const walletBalance = wallet?.balance ?? 0;

  // Fetch Eligible Vouchers
  const { data: eligibleVouchers = [], isLoading: loadingVouchers } = useQuery<EligibleVoucher[]>({
    queryKey: ['eligibleVouchersCheckout', paramDraftId],
    queryFn: () => getEligibleVouchers(paramDraftId || ''),
    enabled: !!paramDraftId,
  });

  // Fetch addresses via useQuery
  const { data: addresses = [] } = useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: getMyAddresses,
  });

  // Set default address when addresses are loaded or updated
  React.useEffect(() => {
    if (addresses && addresses.length > 0) {
      const def = addresses.find((a) => a.isDefault) || addresses[0];
      if (!selectedAddress || (def && def.id !== selectedAddress.id && def.isDefault)) {
        setSelectedAddress(def);
      }
    }
  }, [addresses]);

  // Fetch payment methods from BE API
  const { data: paymentMethods = [] } = useQuery<ApiPaymentMethodOption[]>({
    queryKey: ['paymentMethods'],
    queryFn: fetchPaymentMethodsApi,
  });

  // Fetch draft details via useQuery if draftId parameter is present
  const { data: draft = null } = useQuery<BookingDraft | null>({
    queryKey: ['draft', paramDraftId],
    queryFn: () => getDraftDetails(paramDraftId!),
    enabled: !!paramDraftId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
  });

  const activeCategoryId = paramCategoryId || draft?.categoryId;
  const category = categories.find(
    (c) => c.id === activeCategoryId || c.code === activeCategoryId
  );
  const categoryName = category?.name || 'Chăm sóc Spa';

  // Fetch worker details via dependent useQuery
  const activeWorkerProfileId = paramWorkerProfileId || draft?.workerProfileId;
  const { data: worker = null, isLoading: workerLoading } = useQuery<WorkerProfile | null>({
    queryKey: ['worker', workerUserId || activeWorkerProfileId],
    queryFn: () => getWorkerDetails(workerUserId || activeWorkerProfileId!),
    enabled: !!(workerUserId || activeWorkerProfileId),
  });

  const durationNum = paramTotalDurationMinutes
    ? Number(paramTotalDurationMinutes)
    : (draft?.totalDurationMinutes || 60);

  const activeWorkerService = worker?.services?.find((s) => s.categoryId === activeCategoryId);
  const activeOption = activeWorkerService?.options?.find((opt) => opt.durationMinutes === durationNum)
    || activeWorkerService?.options?.[0];

  const servicePrice = activeOption?.price || activeWorkerService?.basePrice || worker?.basePrice || 500000;
  const finalPrice = Math.max(0, servicePrice - discountAmount);
  const walletInsufficient = walletBalance < finalPrice;

  // Confirm booking & pay mutation (creates draft if needed, confirms, then pays)
  const confirmMutation = useMutation({
    mutationFn: async () => {
      let targetDraftId = paramDraftId;

      if (!targetDraftId) {
        if (!selectedAddress) {
          throw new Error('Vui lòng chọn địa chỉ nhận dịch vụ.');
        }

        const categoryGuid = category?.id || activeCategoryId || categories[0]?.id || '';
        const addressText = formatFullAddress(selectedAddress);

        const createdDraft = await createDraft({
          categoryId: categoryGuid,
          addressId: selectedAddress.id,
          address: addressText,
          lat: selectedAddress.lat ?? 0,
          lng: selectedAddress.lng ?? 0,
          scheduledType: 0,
          totalDurationMinutes: durationNum,
          workerProfileId: activeWorkerProfileId || undefined,
          autoMatch: !activeWorkerProfileId,
        });

        targetDraftId = createdDraft.id || createdDraft.draftId;
      }

      if (!targetDraftId) {
        throw new Error('Không thể tạo đơn nháp.');
      }

      const draftResult = await confirmDraft(targetDraftId);
      const bookingId = draftResult.bookingId || (draftResult as any).id;

      if (!bookingId) {
        throw new Error('Không tạo được đơn hàng.');
      }

      // Route payment by selected method
      if (selectedPaymentMethod === PaymentMethod.Wallet) {
        if (walletBalance < finalPrice) {
          throw new Error(`Ví không đủ số dư để thanh toán ${formatCurrency(finalPrice)}. Vui lòng nạp thêm hoặc chọn phương thức khác.`);
        }
        await payBookingWithWallet(bookingId);
        return { bookingId, type: 'wallet' };
      } else if (selectedPaymentMethod === PaymentMethod.Cash) {
        await startBookingPayment(bookingId, PaymentMethod.Cash);
        return { bookingId, type: 'cash' };
      } else {
        const payRes = await startBookingPayment(bookingId, selectedPaymentMethod);
        return { bookingId, type: 'online', paymentUrl: payRes.paymentUrl };
      }
    },
    onSuccess: async (data) => {
      const targetUrl = `/booking-detail?bookingId=${data.bookingId}` as any;
      if (data.type === 'wallet') {
        Alert.alert(
          'Đặt lịch & Thanh toán thành công',
          'Đơn dịch vụ Spa của bạn đã được thanh toán bằng ví và đang chờ Kỹ thuật viên xác nhận.'
        );
        router.replace(targetUrl);
      } else if (data.type === 'cash') {
        Alert.alert(
          'Đặt lịch thành công',
          'Yêu cầu dịch vụ Spa của bạn đã được gửi tới Kỹ thuật viên. Quý khách vui lòng thanh toán bằng tiền mặt sau khi hoàn thành dịch vụ.'
        );
        router.replace(targetUrl);
      } else if (data.type === 'online') {
        if (data.paymentUrl) {
          try {
            await Linking.openURL(data.paymentUrl);
          } catch (e) {
            console.warn('Could not open payment URL', e);
          }
        }
        router.replace(targetUrl);
      }
    },
    onError: (error: any) => {
      const msg = getApiErrorMessage(error);
      Alert.alert('Lỗi đặt lịch', msg);
    },
  });

  const confirmLoading = confirmMutation.isPending;

  const handleConfirm = () => {
    if (!selectedAddress && !draft) {
      Alert.alert('Chưa có địa chỉ', 'Vui lòng chọn hoặc thêm địa chỉ của bạn trước khi đặt dịch vụ.', [
        { text: 'Thêm địa chỉ', onPress: () => router.push('/saved-addresses' as any) },
        { text: 'Đóng', style: 'cancel' },
      ]);
      return;
    }
    confirmMutation.mutate();
  };

  const displayAddressText = selectedAddress
    ? formatFullAddress(selectedAddress)
    : (draft?.address || '');

  const selectedPaymentInfo = paymentMethods.find((m) => m.value === selectedPaymentMethod) || {
    name: 'Cash',
    value: PaymentMethod.Cash,
    description: PAYMENT_METHOD_LABELS[PaymentMethod.Cash] || 'Tiền mặt',
  };

  const getPaymentIcon = (methodValue: number) => {
    switch (methodValue) {
      case PaymentMethod.Wallet:
        return 'account-balance-wallet';
      case PaymentMethod.Vnpay:
      case PaymentMethod.Momo:
      case PaymentMethod.PayOS:
        return 'qr-code-scanner';
      case PaymentMethod.Card:
        return 'credit-card';
      case PaymentMethod.Cash:
      default:
        return 'attach-money';
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#1C2526" />
        </Pressable>
        <Text style={styles.headerTitle}>Thông tin đặt lịch</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Block 1: My Address Card */}
        <Pressable
          style={styles.cardContainer}
          onPress={() => {
            if (addresses.length > 0) {
              setShowAddressModal(true);
            } else {
              router.push('/saved-addresses' as any);
            }
          }}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSectionLabel}>Địa chỉ của tôi</Text>
            <View style={styles.changeAddressBadge}>
              <Text style={styles.changeAddressText}>Thay đổi</Text>
              <MaterialIcons name="chevron-right" size={20} color="#0F382C" />
            </View>
          </View>
          <View style={styles.addressDetails}>
            <View style={styles.userNamePhoneRow}>
              <MaterialIcons name="place" size={18} color="#0F382C" />
              <Text style={styles.userNameText}>
                {selectedAddress ? (selectedAddress.label || 'Nhà riêng') : (draft?.address ? 'Địa chỉ giao' : 'Chưa chọn địa chỉ')}
              </Text>
            </View>
            {displayAddressText ? (
              <Text style={styles.addressLineText}>{displayAddressText}</Text>
            ) : null}
          </View>
        </Pressable>

        {/* Block 2: Selected Service & KTV Info Card */}
        <View style={styles.cardContainer}>
          <View style={styles.serviceHeaderRow}>
            <Text style={styles.serviceNameTitle}>{categoryName}</Text>
          </View>
          <Text style={styles.serviceMetaText}>⏱ {durationNum} phút | {formatCurrency(servicePrice)}</Text>

          {workerLoading ? (
            <ActivityIndicator size="small" color="#0F382C" style={{ marginVertical: 8 }} />
          ) : worker ? (
            <View style={styles.ktvMiniProfileRow}>
              {worker.avatarUrl ? (
                <Image
                  source={{ uri: worker.avatarUrl }}
                  style={styles.ktvMiniAvatar}
                />
              ) : (
                <View style={styles.ktvAvatarPlaceholder}>
                  <MaterialIcons name="person" size={26} color="#0F382C" />
                </View>
              )}
              <View style={styles.ktvMiniMeta}>
                <Text style={styles.ktvMiniName}>{worker.fullName}</Text>
                <View style={styles.ratingRowSmall}>
                  <MaterialIcons name="star" size={14} color="#D4AF37" />
                  <Text style={styles.ratingScoreSmall}>{(worker.rating || 5.0).toFixed(1)}</Text>
                  <Text style={styles.ratingReviewsMuted}>({worker.reviewsCount ?? 0} đánh giá)</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.autoMatchRow}>
              <MaterialIcons name="autorenew" size={20} color="#0F382C" />
              <Text style={styles.autoMatchText}>Ghép kỹ thuật viên uy tín tự động gần bạn nhất</Text>
            </View>
          )}
        </View>

        {/* Block 3: Payment Method Selector */}
        <View style={styles.cardContainer}>
          <View style={styles.paymentHeaderRow}>
            <Text style={styles.cardSectionLabel}>Phương thức thanh toán</Text>
            <Pressable onPress={() => setShowPaymentModal(true)}>
              <Text style={styles.seeAllText}>Tất cả  &gt;</Text>
            </Pressable>
          </View>

          <Pressable style={styles.selectedPaymentOption} onPress={() => setShowPaymentModal(true)}>
            <View style={styles.cashIconCircle}>
              <MaterialIcons name={getPaymentIcon(selectedPaymentInfo.value) as any} size={18} color="#0F382C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentOptionName}>{selectedPaymentInfo.description || selectedPaymentInfo.name}</Text>
              {selectedPaymentInfo.value === PaymentMethod.Wallet && (
                <Text style={{ fontFamily: 'Montserrat_500Medium', fontSize: 12, color: '#6B7280' }}>
                  Số dư: {formatCurrency(walletBalance)}
                </Text>
              )}
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#6B7280" />
          </Pressable>

          {selectedPaymentMethod === PaymentMethod.Wallet && walletInsufficient && (
            <View style={styles.paymentWarningBox}>
              <MaterialIcons name="info" size={18} color="#BA1A1A" />
              <Text style={styles.paymentWarningText}>
                Ví không đủ số dư để thanh toán {formatCurrency(finalPrice)}. Vui lòng nạp thêm hoặc chọn phương thức khác.
              </Text>
            </View>
          )}
        </View>

        {/* Block 4: Voucher Card */}
        <View style={styles.cardContainer}>
          <View style={styles.voucherHeaderRow}>
            <Text style={styles.cardSectionLabel}>Mã voucher / Khuyến mãi</Text>
          </View>

          {selectedVoucher ? (
            <View style={styles.selectedVoucherBox}>
              <MaterialIcons name="check-circle" size={20} color="#059669" />
              <View style={styles.selectedVoucherTextCol}>
                <Text style={styles.selectedVoucherCode}>{selectedVoucher.code}</Text>
                {discountAmount > 0 && (
                  <Text style={styles.selectedVoucherDiscount}>
                    Giảm {formatCurrency(discountAmount)} khi thanh toán
                  </Text>
                )}
              </View>
              <Pressable
                style={styles.removeVoucherButton}
                onPress={() => {
                  setSelectedVoucher(null);
                  setDiscountAmount(0);
                  setVoucherCode('');
                }}>
                <MaterialIcons name="close" size={18} color="#059669" />
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.voucherInputRow}>
                <TextInput
                  style={styles.voucherTextInput}
                  placeholder="Nhập mã voucher..."
                  placeholderTextColor="#9CA3AF"
                  value={voucherCode}
                  onChangeText={(val) => {
                    setVoucherCode(val.toUpperCase());
                    if (voucherError) setVoucherError('');
                  }}
                  autoCapitalize="characters"
                  editable={!voucherApplying}
                />
                <Pressable
                  style={[styles.applyVoucherBtn, (!voucherCode.trim() || voucherApplying) && styles.smallButtonDisabled]}
                  disabled={!voucherCode.trim() || voucherApplying}
                  onPress={async () => {
                    setVoucherApplying(true);
                    setVoucherError('');
                    try {
                      const result = await applyVoucher(voucherCode, paramDraftId || '');
                      if (result && result.isEligible) {
                        setSelectedVoucher(result);
                        setDiscountAmount(getVoucherDiscount(result));
                      } else {
                        setVoucherError(result?.ineligibleReason || 'Voucher không đủ điều kiện.');
                      }
                    } catch (err: any) {
                      setVoucherError(getApiErrorMessage(err));
                    } finally {
                      setVoucherApplying(false);
                    }
                  }}>
                  {voucherApplying ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.applyVoucherText}>Áp dụng</Text>
                  )}
                </Pressable>
              </View>
              {voucherError ? <Text style={styles.voucherErrorText}>{voucherError}</Text> : null}
              <Pressable
                style={styles.chooseVoucherButton}
                onPress={() => setShowVoucherModal(true)}>
                <MaterialIcons name="local-activity" size={18} color="#0F382C" />
                <Text style={styles.chooseVoucherText}>
                  {loadingVouchers
                    ? 'Đang tải voucher...'
                    : `Chọn voucher (${eligibleVouchers.filter((item) => item.isEligible).length} khả dụng)`}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Block 5: Payment Summary Details */}
        <View style={styles.cardContainer}>
          <Text style={styles.cardSectionLabel}>Chi tiết thanh toán</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tạm tính</Text>
            <Text style={styles.summaryValue}>{formatCurrency(servicePrice)}</Text>
          </View>

          {discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Giảm giá</Text>
              <Text style={styles.discountValue}>- {formatCurrency(discountAmount)}</Text>
            </View>
          )}

          <View style={styles.dividerLine} />

          <View style={styles.totalSummaryRow}>
            <View>
              <Text style={styles.totalCountText}>Tổng: 1 dịch vụ</Text>
              {discountAmount > 0 && (
                <Text style={styles.savedNoticeText}>🎉 Bạn đã tiết kiệm được {formatCurrency(discountAmount)}</Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.totalPriceText}>{formatCurrency(finalPrice)}</Text>
              {discountAmount > 0 && (
                <Text style={styles.strikethroughPrice}>{formatCurrency(servicePrice)}</Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom CTA Button */}
      <View style={[styles.fixedBottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 14 }]}>
        <Pressable
          style={[styles.confirmBookingBtn, confirmLoading && styles.confirmBookingBtnDisabled]}
          onPress={handleConfirm}
          disabled={confirmLoading}>
          {confirmLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.confirmBookingBtnText}>Thanh toán & Đặt lịch</Text>
          )}
        </Pressable>
      </View>

      {/* Address Selection Modal */}
      <Modal visible={showAddressModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn địa chỉ nhận dịch vụ</Text>
              <Pressable onPress={() => setShowAddressModal(false)}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {addresses.map((item) => (
                <Pressable
                  key={item.id}
                  style={[
                    styles.modalAddressItem,
                    selectedAddress?.id === item.id && styles.modalAddressItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedAddress(item);
                    setShowAddressModal(false);
                  }}>
                  <MaterialIcons name="place" size={22} color="#0F382C" />
                  <View style={styles.modalAddressTextCol}>
                    <Text style={styles.modalAddressLabel}>{item.label}</Text>
                    <Text style={styles.modalAddressBody}>
                      {formatFullAddress(item)}
                    </Text>
                  </View>
                  {selectedAddress?.id === item.id && (
                    <MaterialIcons name="check-circle" size={20} color="#0F382C" />
                  )}
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              style={styles.modalAddBtn}
              onPress={() => {
                setShowAddressModal(false);
                router.push('/saved-addresses' as any);
              }}>
              <MaterialIcons name="add" size={20} color="#0F382C" />
              <Text style={styles.modalAddBtnText}>Thêm địa chỉ mới</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Payment Method Selection Modal */}
      <Modal visible={showPaymentModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn phương thức thanh toán</Text>
              <Pressable onPress={() => setShowPaymentModal(false)}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {paymentMethods.map((method) => {
                const isSelected = selectedPaymentMethod === method.value;
                const iconName = getPaymentIcon(method.value);
                return (
                  <Pressable
                    key={method.value}
                    style={[
                      styles.modalAddressItem,
                      isSelected && styles.modalAddressItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedPaymentMethod(method.value);
                      setShowPaymentModal(false);
                    }}>
                    <View style={styles.cashIconCircle}>
                      <MaterialIcons name={iconName as any} size={20} color="#0F382C" />
                    </View>
                    <View style={styles.modalAddressTextCol}>
                      <Text style={styles.modalAddressLabel}>{method.description || method.name}</Text>
                    </View>
                    {isSelected && (
                      <MaterialIcons name="check-circle" size={20} color="#0F382C" />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Voucher Selection Modal */}
      <Modal visible={showVoucherModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn voucher ưu đãi</Text>
              <Pressable onPress={() => setShowVoucherModal(false)}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {eligibleVouchers.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#6B7280', marginVertical: 20 }}>
                  Không có voucher khả dụng cho đơn hàng này.
                </Text>
              ) : (
                eligibleVouchers.map((voucher) => (
                  <Pressable
                    key={voucher.code}
                    style={[
                      styles.modalAddressItem,
                      !voucher.isEligible && { opacity: 0.5 },
                      selectedVoucher?.code === voucher.code && styles.modalAddressItemSelected,
                    ]}
                    disabled={!voucher.isEligible}
                    onPress={() => {
                      setSelectedVoucher(voucher);
                      setDiscountAmount(getVoucherDiscount(voucher));
                      setVoucherCode(voucher.code);
                      setShowVoucherModal(false);
                    }}>
                    <MaterialIcons name="local-offer" size={24} color={voucher.isEligible ? '#0F382C' : '#9CA3AF'} />
                    <View style={styles.modalAddressTextCol}>
                      <Text style={styles.modalAddressLabel}>{voucher.code}</Text>
                      {voucher.description ? (
                        <Text style={styles.modalAddressBody}>{voucher.description}</Text>
                      ) : null}
                      {voucher.calculatedDiscount ? (
                        <Text style={{ fontSize: 12, color: '#059669', marginTop: 2, fontFamily: 'Montserrat_600SemiBold' }}>
                          Giảm {formatCurrency(voucher.calculatedDiscount)}
                        </Text>
                      ) : null}
                      {!voucher.isEligible && voucher.ineligibleReason && (
                        <Text style={{ fontSize: 12, color: '#DC2626', marginTop: 2 }}>
                          {voucher.ineligibleReason}
                        </Text>
                      )}
                    </View>
                    {selectedVoucher?.code === voucher.code && (
                      <MaterialIcons name="check-circle" size={20} color="#0F382C" />
                    )}
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    gap: 6,
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
  autoMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F4F1EA',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  autoMatchText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: '#0F382C',
    flex: 1,
  },
  ktvMiniAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  ktvAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E6F0EB',
    alignItems: 'center',
    justifyContent: 'center',
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
  voucherTextInput: {
    flex: 1,
    backgroundColor: '#F4F1EA',
    borderRadius: 12,
    height: 42,
    paddingHorizontal: 14,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#1C2526',
    letterSpacing: 1,
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
  changeAddressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeAddressText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#0F382C',
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
    color: '#1C2526',
  },
  modalScroll: {
    paddingBottom: 16,
  },
  modalAddressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFECE6',
    marginBottom: 10,
    gap: 12,
  },
  modalAddressItemSelected: {
    borderColor: '#0F382C',
    backgroundColor: '#F4F1EA',
  },
  modalAddressTextCol: {
    flex: 1,
  },
  modalAddressLabel: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#1C2526',
    marginBottom: 2,
  },
  modalAddressBody: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#6B7280',
  },
  modalAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#0F382C',
    borderRadius: 12,
    marginTop: 8,
  },
  modalAddBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#0F382C',
  },
  paymentWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFDAD6',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  paymentWarningText: {
    flex: 1,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#BA1A1A',
  },
  selectedVoucherBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  selectedVoucherTextCol: {
    flex: 1,
  },
  selectedVoucherCode: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#047857',
  },
  selectedVoucherDiscount: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#059669',
    marginTop: 2,
  },
  removeVoucherButton: {
    padding: 4,
  },
  chooseVoucherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 6,
  },
  chooseVoucherText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#0F382C',
  },
  voucherErrorText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#DC2626',
    marginTop: 6,
  },
  smallButtonDisabled: {
    opacity: 0.5,
  },
});
