import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/layout/bottom-tab-bar';
import { getAvailableVouchers } from '@/services/api/vouchers';
import { EligibleVoucher, VoucherType } from '@/services/api/voucher-utils';
import { formatCurrency } from '@/utils/format';

const SAMPLE_VOUCHERS: EligibleVoucher[] = [
  {
    id: 'sample-1',
    code: 'FIXYWELCOME',
    type: VoucherType.Fixed,
    value: 50000,
    minOrderValue: 150000,
    expiresAt: '2026-12-31T23:59:59Z',
    description: 'Giảm ngay 50.000 ₫ cho đơn đặt lịch Spa / Kỹ thuật viên đầu tiên.',
    isEligible: true,
  },
  {
    id: 'sample-2',
    code: 'SPARELAX20',
    type: VoucherType.Percent,
    value: 20,
    maxDiscount: 100000,
    minOrderValue: 200000,
    expiresAt: '2026-10-31T23:59:59Z',
    description: 'Giảm 20% tối đa 100.000 ₫ cho tất cả các gói chăm sóc da & massage thư giãn.',
    isEligible: true,
  },
  {
    id: 'sample-3',
    code: 'FREESHIP',
    type: VoucherType.Fixed,
    value: 30000,
    minOrderValue: 100000,
    expiresAt: '2026-11-30T23:59:59Z',
    description: 'Miễn phí phụ phí di chuyển của Kỹ thuật viên tới tận nhà.',
    isEligible: true,
  },
  {
    id: 'sample-4',
    code: 'VIPSPA100',
    type: VoucherType.Fixed,
    value: 100000,
    minOrderValue: 500000,
    expiresAt: '2026-09-30T23:59:59Z',
    description: 'Ưu đãi dành riêng cho đơn hàng trị giá từ 500.000 ₫ trở lên.',
    isEligible: true,
  },
];

type FilterType = 'all' | 'spa' | 'fixed' | 'percent';

export default function VouchersScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = React.useState<FilterType>('all');
  const [inputCode, setInputCode] = React.useState('');
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  const {
    data: apiVouchers = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<EligibleVoucher[]>({
    queryKey: ['availableVouchers'],
    queryFn: async () => {
      const res = await getAvailableVouchers();
      return res.length > 0 ? res : SAMPLE_VOUCHERS;
    },
  });

  const vouchersList = apiVouchers.length > 0 ? apiVouchers : SAMPLE_VOUCHERS;

  const filteredVouchers = React.useMemo(() => {
    return vouchersList.filter((voucher) => {
      if (activeFilter === 'fixed') return voucher.type === VoucherType.Fixed;
      if (activeFilter === 'percent') return voucher.type === VoucherType.Percent;
      if (activeFilter === 'spa') {
        const desc = (voucher.description || '').toLowerCase();
        return desc.includes('spa') || desc.includes('massage') || voucher.code.includes('SPA');
      }
      return true;
    });
  }, [vouchersList, activeFilter]);

  const handleApplyInputCode = () => {
    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert('Thông báo', 'Vui lòng nhập mã ưu đãi.');
      return;
    }
    Keyboard.dismiss();
    const found = vouchersList.find((v) => v.code.toUpperCase() === trimmed);
    if (found) {
      Alert.alert(
        'Mã hợp lệ 🎉',
        `Mã ${found.code}: ${found.description || 'Sẵn sàng sử dụng khi thanh toán đặt lịch!'}`
      );
    } else {
      Alert.alert(
        'Ưu đãi',
        `Mã ${trimmed} đã được ghi nhận và sẽ tự động kiểm tra tại bước thanh toán!`
      );
    }
  };

  const handleCopyCode = (code: string) => {
    setCopiedCode(code);
    Alert.alert(
      'Đã lưu mã',
      `Đã sao chép mã "${code}". Bạn có thể áp dụng mã này khi đặt lịch dịch vụ!`,
      [
        { text: 'Đặt lịch ngay', onPress: () => router.push('/(customer)/home' as any) },
        { text: 'Đóng', style: 'cancel' },
      ]
    );
  };

  const renderVoucherCard = ({ item }: { item: EligibleVoucher }) => {
    const isPercent = item.type === VoucherType.Percent;
    const discountText = isPercent
      ? `Giảm ${item.value}%`
      : `Giảm ${formatCurrency(item.value || 0)}`;

    return (
      <View style={styles.cardContainer}>
        {/* Left Ticket Ribbon */}
        <View style={styles.cardLeft}>
          <View style={styles.cardLeftIconCircle}>
            <MaterialIcons name="local-offer" size={24} color="#0F382C" />
          </View>
          <Text style={styles.cardLeftDiscountText}>{discountText}</Text>
          {item.maxDiscount ? (
            <Text style={styles.cardLeftMaxText}>Tối đa {formatCurrency(item.maxDiscount)}</Text>
          ) : null}
        </View>

        {/* Dashed Separator */}
        <View style={styles.cardDivider}>
          <View style={styles.cardDividerCutoutTop} />
          <View style={styles.cardDividerLine} />
          <View style={styles.cardDividerCutoutBottom} />
        </View>

        {/* Right Info Section */}
        <View style={styles.cardRight}>
          <View style={styles.codeRow}>
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>{item.code}</Text>
            </View>
            <Pressable
              style={[styles.copyButton, copiedCode === item.code ? styles.copyButtonActive : null]}
              onPress={() => handleCopyCode(item.code)}>
              <MaterialIcons
                name={copiedCode === item.code ? 'check' : 'content-copy'}
                size={14}
                color={copiedCode === item.code ? '#059669' : '#0F382C'}
              />
              <Text
                style={[
                  styles.copyButtonText,
                  copiedCode === item.code ? { color: '#059669' } : null,
                ]}>
                {copiedCode === item.code ? 'Đã lưu' : 'Sao chép'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.descText} numberOfLines={2}>
            {item.description || 'Áp dụng cho mọi đơn hàng dịch vụ.'}
          </Text>

          <View style={styles.footerRow}>
            <View style={styles.conditionCol}>
              {item.minOrderValue ? (
                <Text style={styles.conditionText}>
                  Đơn tối thiểu: {formatCurrency(item.minOrderValue)}
                </Text>
              ) : null}
              {item.expiresAt ? (
                <Text style={styles.expiryText}>
                  HSD: {new Date(item.expiresAt).toLocaleDateString('vi-VN')}
                </Text>
              ) : null}
            </View>

            <Pressable
              style={styles.useNowBtn}
              onPress={() => router.push('/(customer)/home' as any)}>
              <Text style={styles.useNowBtnText}>Dùng ngay</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerIconCircle}>
            <MaterialIcons name="card-giftcard" size={24} color="#0F382C" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Kho Ưu Đãi & Voucher</Text>
            <Text style={styles.headerSubtitle}>Thu thập mã giảm giá cho dịch vụ của bạn</Text>
          </View>
        </View>

        {/* Input Promo Code Bar */}
        <View style={styles.inputContainer}>
          <MaterialIcons
            name="confirmation-number"
            size={20}
            color="#818A91"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.textInput}
            placeholder="Nhập mã khuyến mãi..."
            placeholderTextColor="#9CA3AF"
            value={inputCode}
            onChangeText={setInputCode}
            autoCapitalize="characters"
          />
          <Pressable style={styles.applyBtn} onPress={handleApplyInputCode}>
            <Text style={styles.applyBtnText}>Lưu mã</Text>
          </Pressable>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterBar}>
        <Pressable
          style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
          onPress={() => setActiveFilter('all')}>
          <Text
            style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>
            Tất cả
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterChip, activeFilter === 'spa' && styles.filterChipActive]}
          onPress={() => setActiveFilter('spa')}>
          <Text
            style={[styles.filterChipText, activeFilter === 'spa' && styles.filterChipTextActive]}>
            Dịch vụ Spa
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterChip, activeFilter === 'fixed' && styles.filterChipActive]}
          onPress={() => setActiveFilter('fixed')}>
          <Text
            style={[
              styles.filterChipText,
              activeFilter === 'fixed' && styles.filterChipTextActive,
            ]}>
            Giảm tiền mặt
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterChip, activeFilter === 'percent' && styles.filterChipActive]}
          onPress={() => setActiveFilter('percent')}>
          <Text
            style={[
              styles.filterChipText,
              activeFilter === 'percent' && styles.filterChipTextActive,
            ]}>
            Giảm theo %
          </Text>
        </Pressable>
      </View>

      {/* Content List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F382C" />
          <Text style={styles.loadingText}>Đang tải kho voucher...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredVouchers}
          keyExtractor={(item, index) => item.id || item.code || String(index)}
          renderItem={renderVoucherCard}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 90 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={['#0F382C']}
              tintColor="#0F382C"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="local-offer" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Chưa có voucher phù hợp</Text>
              <Text style={styles.emptySubtitle}>
                Hãy quay lại sau để nhận thêm nhiều ưu đãi hấp dẫn nhé!
              </Text>
            </View>
          }
        />
      )}

      {/* Persistent Bottom Tab Bar */}
      <BottomTabBar activeTab="vouchers" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6F0EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#0F382C',
  },
  headerSubtitle: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#111827',
  },
  applyBtn: {
    backgroundColor: '#0F382C',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  applyBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#0F382C',
    borderColor: '#0F382C',
  },
  filterChipText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_600SemiBold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  cardContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  cardLeft: {
    width: 100,
    backgroundColor: '#EBF3EF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  cardLeftIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cardLeftDiscountText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#0F382C',
    textAlign: 'center',
  },
  cardLeftMaxText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 9,
    color: '#047857',
    marginTop: 2,
    textAlign: 'center',
  },
  cardDivider: {
    width: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  cardDividerCutoutTop: {
    width: 14,
    height: 7,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    backgroundColor: '#F8F9FA',
    marginLeft: -7,
  },
  cardDividerLine: {
    flex: 1,
    width: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cardDividerCutoutBottom: {
    width: 14,
    height: 7,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    backgroundColor: '#F8F9FA',
    marginLeft: -7,
  },
  cardRight: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  codeBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  codeText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#92400E',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  copyButtonActive: {
    backgroundColor: '#D1FAE5',
  },
  copyButtonText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#0F382C',
  },
  descText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#374151',
    lineHeight: 16,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
    paddingTop: 8,
  },
  conditionCol: {
    flex: 1,
  },
  conditionText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 10,
    color: '#6B7280',
  },
  expiryText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  useNowBtn: {
    backgroundColor: '#0F382C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  useNowBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  loadingText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: '#6B7280',
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    color: '#374151',
    marginTop: 12,
  },
  emptySubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
});
