import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/layout/bottom-tab-bar';
import {
  Booking,
  BookingStatus,
  getMyBookings,
} from '@/services/api/bookings';
import { formatDateTime } from '@/utils/date';
import { fetchCategories } from '@/services/api/categories';

const STATUS_MAP: Record<
  number,
  { label: string; color: string; bg: string; border: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }
> = {
  [BookingStatus.Pending]: {
    label: 'Chờ thợ phản hồi',
    color: '#D97706',
    bg: '#FEF3C7',
    border: '#FDE68A',
    icon: 'hourglass-empty',
  },
  [BookingStatus.PendingPayment]: {
    label: 'Chờ thanh toán',
    color: '#E11D48',
    bg: '#FFE4E6',
    border: '#FECDD3',
    icon: 'payment',
  },
  [BookingStatus.Matching]: {
    label: 'Đang kết nối thợ',
    color: '#EA580C',
    bg: '#FFEDD5',
    border: '#FED7AA',
    icon: 'sync',
  },
  [BookingStatus.Confirmed]: {
    label: 'Đã nhận lịch',
    color: '#059669',
    bg: '#D1FAE5',
    border: '#A7F3D0',
    icon: 'assignment-turned-in',
  },
  [BookingStatus.Traveling]: {
    label: 'Thợ đang di chuyển',
    color: '#2563EB',
    bg: '#DBEAFE',
    border: '#BFDBFE',
    icon: 'directions-car',
  },
  [BookingStatus.Arrived]: {
    label: 'Thợ đã đến nơi',
    color: '#4F46E5',
    bg: '#EEF2FF',
    border: '#E0E7FF',
    icon: 'hail',
  },
  [BookingStatus.InProgress]: {
    label: 'Đang thực hiện',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    icon: 'build',
  },
  [BookingStatus.Completed]: {
    label: 'Hoàn thành',
    color: '#059669',
    bg: '#D1FAE5',
    border: '#A7F3D0',
    icon: 'check-circle',
  },
  [BookingStatus.Cancelled]: {
    label: 'Đã hủy',
    color: '#475569',
    bg: '#F1F5F9',
    border: '#E2E8F0',
    icon: 'cancel',
  },
  [BookingStatus.Disputed]: {
    label: 'Tranh chấp',
    color: '#DC2626',
    bg: '#FEE2E2',
    border: '#FCA5A5',
    icon: 'report-problem',
  },
};

const CATEGORIES_INFO: Record<
  string,
  { label: string; icon: React.ComponentProps<typeof MaterialIcons>['name']; color: string }
> = {
  dien: { label: 'Điện – Điện tử', icon: 'flash-on', color: '#FF8228' },
  nuoc: { label: 'Nước – Ống nước', icon: 'opacity', color: '#5BC0DE' },
  dieuhoa: { label: 'Điện lạnh - Điều hòa', icon: 'ac-unit', color: '#2CAAD2' },
  maygiat: { label: 'Máy giặt', icon: 'local-laundry-service', color: '#4B7BEC' },
  xemay: { label: 'Sửa xe máy/ô tô', icon: 'directions-car', color: '#FFB020' },
  moc: { label: 'Mộc & Nội thất', icon: 'weekend', color: '#A55EEA' },
  son: { label: 'Sơn & Xây trát', icon: 'brush', color: '#20BF6B' },
  vesinh: { label: 'Vệ sinh công nghiệp', icon: 'clean-hands', color: '#EB3B5A' },
};

export default function CustomerOrdersScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState<'active' | 'history'>('active');

  const { data: bookings = [], isLoading, refetch } = useQuery<Booking[]>({
    queryKey: ['myBookings'],
    queryFn: () => getMyBookings(),
  });

  const { data: categories = [], isLoading: isLoadingCats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
  });

  const isLoadingAll = isLoading || isLoadingCats;

  const filteredBookings = React.useMemo(() => {
    return bookings.filter((b) => {
      const status = Number(b.status);
      const isTerminal =
        status === BookingStatus.Completed ||
        status === BookingStatus.Cancelled ||
        status === BookingStatus.Disputed;
      
      return activeTab === 'active' ? !isTerminal : isTerminal;
    });
  }, [bookings, activeTab]);

  const renderBookingItem = ({ item }: { item: Booking }) => {
    const category = categories.find((c) => c.id === item.categoryId || c.code === item.categoryId);
    const code = category?.code || item.categoryId;
    const mappedInfo = CATEGORIES_INFO[code];
    const catInfo = {
      label: category?.name || mappedInfo?.label || 'Dịch vụ sửa chữa',
      icon: mappedInfo?.icon || 'build',
      color: mappedInfo?.color || '#FF8228',
    };
    const statusInfo = STATUS_MAP[Number(item.status)] || {
      label: 'Chờ xử lý',
      color: '#818A91',
      bg: '#F1F5F9',
      border: '#E2E8F0',
      icon: 'hourglass-empty',
    };

    const displayPrice = item.finalAmount || item.estimatedPrice || item.estimatedAmount || 0;
    const formattedPrice = `${displayPrice.toLocaleString('vi-VN')}đ`;

    const formattedDate = formatDateTime(item.createdDate);

    return (
      <Pressable
        style={styles.bookingCard}
        onPress={() => router.push(`/booking-detail?bookingId=${item.id}` as any)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            {category?.imageUrl ? (
              <View style={[styles.categoryIconFrame, { backgroundColor: 'transparent' }]}>
                <Image
                  source={{ uri: category.imageUrl }}
                  style={{ width: 28, height: 28, borderRadius: 14 }}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={[styles.categoryIconFrame, { backgroundColor: `${catInfo.color}15` }]}>
                <MaterialIcons name={catInfo.icon} size={20} color={catInfo.color} />
              </View>
            )}
            <Text style={styles.categoryLabel}>{catInfo.label}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusInfo.bg,
                borderColor: statusInfo.border,
              },
            ]}
          >
            <MaterialIcons name={statusInfo.icon} size={14} color={statusInfo.color} style={styles.statusIcon} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <Text style={styles.descriptionText} numberOfLines={2}>
          {item.description || 'Không có mô tả chi tiết.'}
        </Text>

        {item.worker && (
          <View style={styles.workerRow}>
            {item.worker.avatarUrl ? (
              <Image source={{ uri: item.worker.avatarUrl }} style={styles.workerAvatar} />
            ) : (
              <View style={styles.workerAvatarPlaceholder}>
                <MaterialIcons name="person" size={16} color="#818A91" />
              </View>
            )}
            <View style={styles.workerInfo}>
              <Text style={styles.workerName}>{item.worker.fullName}</Text>
              <Text style={styles.workerSubText}>Kỹ thuật viên kết nối</Text>
            </View>
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.dateContainer}>
            <MaterialIcons name="access-time" size={14} color="#818A91" />
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
          <Text style={styles.priceText}>{formattedPrice}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tabButton, activeTab === 'active' && styles.tabButtonActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabLabel, activeTab === 'active' && styles.tabLabelActive]}>
            Đang hoạt động
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabLabel, activeTab === 'history' && styles.tabLabelActive]}>
            Lịch sử đơn
          </Text>
        </Pressable>
      </View>

      {isLoadingAll ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF8228" />
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoadingAll}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="assignment-late" size={48} color="#818A91" />
              <Text style={styles.emptyText}>
                {activeTab === 'active'
                  ? 'Không có đơn hàng nào đang hoạt động.'
                  : 'Bạn chưa có lịch sử đơn hàng nào.'}
              </Text>
              <Pressable style={styles.bookNowButton} onPress={() => router.replace('/home' as any)}>
                <Text style={styles.bookNowButtonText}>Đặt lịch ngay</Text>
              </Pressable>
            </View>
          }
        />
      )}

      {/* Bottom Bar */}
      <BottomTabBar activeTab="orders" />
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#DDDDDD',
  },
  headerTitle: {
    color: '#383838',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#EAE5E3',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#FF8228',
  },
  tabLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#818A91',
  },
  tabLabelActive: {
    color: '#FF8228',
    fontFamily: 'Montserrat_700Bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 110,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIconFrame: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#383838',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
  },
  descriptionText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#574237',
    lineHeight: 18,
    marginBottom: 12,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE6D550',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  workerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  workerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE6D5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#383838',
  },
  workerSubText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 10,
    color: '#818A91',
    marginTop: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#f5f3f2',
    paddingTop: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
  },
  priceText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#FF8228',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#818A91',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
    lineHeight: 20,
  },
  bookNowButton: {
    backgroundColor: '#FF8228',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  bookNowButtonText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
  },
});
