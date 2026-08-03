import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Booking,
  BookingChatMessage,
  BookingStatus,
  getBookingChatMessages,
  getMyBookings,
  getWorkerBookings,
} from '@/services/api/bookings';
import { fetchCategories } from '@/services/api/categories';
import { getMediaUrl } from '@/services/api/media';
import { useAuthStore } from '@/store/store';
import { formatTime, formatDateTime } from '@/utils/date';

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

type ConversationItem = {
  booking: Booking;
  categoryName: string;
  partnerName: string;
  partnerAvatar: string | null;
  partnerPhone: string;
  lastMessage: BookingChatMessage | null;
  unreadCount: number;
};

export default function ChatListScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedTab, setSelectedTab] = React.useState<'all' | 'active' | 'completed'>('all');

  const accessToken = useAuthStore((state) => state.accessToken);

  const currentUserId = React.useMemo(() => {
    if (!accessToken) return null;
    const payload = parseJwt(accessToken);
    return (
      payload?.sub ||
      payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      payload?.nameid ||
      payload?.id ||
      null
    );
  }, [accessToken]);

  const userRole = React.useMemo(() => {
    if (!accessToken) return 'customer';
    const payload = parseJwt(accessToken);
    const role =
      payload?.role ||
      payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    return (typeof role === 'string' ? role : 'customer').toLowerCase();
  }, [accessToken]);

  const isWorker = userRole === 'worker';

  // 1. Fetch bookings based on role
  const {
    data: bookings = [],
    isLoading: loadingBookings,
    refetch: refetchBookings,
    isRefetching,
  } = useQuery<Booking[]>({
    queryKey: ['chatListBookings', isWorker],
    queryFn: () => (isWorker ? getWorkerBookings() : getMyBookings()),
  });

  // 2. Fetch categories to map category names
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
  });

  // 3. Fetch latest messages for each booking concurrently
  const [conversations, setConversations] = React.useState<ConversationItem[]>([]);
  const [loadingMessages, setLoadingMessages] = React.useState(true);

  React.useEffect(() => {
    if (loadingBookings) return;

    let isMounted = true;
    setLoadingMessages(true);

    async function loadAllChatSummaries() {
      try {
        const items: ConversationItem[] = await Promise.all(
          bookings.map(async (b) => {
            const category = categories.find(
              (c) => c.id === b.categoryId || c.code === b.categoryId
            );
            const categoryName = category?.name || 'Dịch vụ Spa';

            // Resolve partner details
            let partnerName = 'Kỹ thuật viên';
            let partnerAvatar: string | null = null;
            let partnerPhone = '';

            if (isWorker) {
              partnerName = b.customerName || 'Khách hàng';
              partnerPhone = b.customerPhone || '';
              partnerAvatar = b.customerAvatarUrl
                ? b.customerAvatarUrl.startsWith('http')
                  ? b.customerAvatarUrl
                  : getMediaUrl(b.customerAvatarUrl)
                : null;
            } else {
              partnerName = b.worker?.fullName || b.workerName || 'Kỹ thuật viên';
              partnerPhone = b.worker?.phone || b.workerPhone || '';
              partnerAvatar = b.worker?.avatarUrl || b.workerAvatarUrl
                ? (b.worker?.avatarUrl || b.workerAvatarUrl)!.startsWith('http')
                  ? (b.worker?.avatarUrl || b.workerAvatarUrl)!
                  : getMediaUrl((b.worker?.avatarUrl || b.workerAvatarUrl)!)
                : null;
            }

            let chatHistory: BookingChatMessage[] = [];
            try {
              chatHistory = await getBookingChatMessages(b.id);
            } catch {
              chatHistory = [];
            }

            const lastMessage = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
            const unreadCount = chatHistory.filter(
              (m) => !m.isRead && m.senderId?.toLowerCase() !== currentUserId?.toLowerCase()
            ).length;

            return {
              booking: b,
              categoryName,
              partnerName,
              partnerAvatar,
              partnerPhone,
              lastMessage,
              unreadCount,
            };
          })
        );

        // Sort by last message date or booking date descending
        items.sort((a, b) => {
          const dateA = a.lastMessage?.createdDate || a.booking.createdDate;
          const dateB = b.lastMessage?.createdDate || b.booking.createdDate;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });

        if (isMounted) {
          setConversations(items);
        }
      } catch (err) {
        console.warn('Error loading chat list summaries:', err);
      } finally {
        if (isMounted) {
          setLoadingMessages(false);
        }
      }
    }

    loadAllChatSummaries();

    return () => {
      isMounted = false;
    };
  }, [bookings, categories, currentUserId, isWorker, loadingBookings]);

  // Filter conversations
  const filteredConversations = React.useMemo(() => {
    return conversations.filter((item) => {
      const matchesSearch =
        item.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.booking.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.lastMessage?.content || '').toLowerCase().includes(searchQuery.toLowerCase());

      const statusNum = Number(item.booking.status);
      const isActive = statusNum >= BookingStatus.Pending && statusNum <= BookingStatus.PendingPayment;
      const isCompleted = statusNum === BookingStatus.Completed;

      if (selectedTab === 'active' && !isActive) return false;
      if (selectedTab === 'completed' && !isCompleted) return false;

      return matchesSearch;
    });
  }, [conversations, searchQuery, selectedTab]);

  const handleOpenChat = (bookingId: string) => {
    router.push(`/booking-chat?bookingId=${bookingId}` as any);
  };

  const renderConversationItem = ({ item }: { item: ConversationItem }) => {
    const { booking, categoryName, partnerName, partnerAvatar, lastMessage, unreadCount } = item;
    const statusNum = Number(booking.status);

    const isFinished = statusNum === BookingStatus.Completed || statusNum === BookingStatus.Cancelled;

    return (
      <Pressable style={styles.chatCard} onPress={() => handleOpenChat(booking.id)}>
        <View style={styles.avatarWrap}>
          {partnerAvatar ? (
            <Image source={{ uri: partnerAvatar }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialIcons name="person" size={24} color="#0F382C" />
            </View>
          )}
          {!isFinished && <View style={styles.activeDot} />}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.topRow}>
            <Text style={styles.partnerName} numberOfLines={1}>
              {partnerName}
            </Text>
            <Text style={styles.timeText}>
              {lastMessage ? formatTime(lastMessage.createdDate) : formatTime(booking.createdDate)}
            </Text>
          </View>

          <View style={styles.categoryBadgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{categoryName}</Text>
            </View>
            <Text style={styles.bookingIdSnippet}>#{booking.id.slice(-6).toUpperCase()}</Text>
          </View>

          <View style={styles.bottomRow}>
            <Text
              style={[
                styles.lastMsgText,
                unreadCount > 0 && styles.lastMsgTextUnread,
              ]}
              numberOfLines={1}>
              {lastMessage
                ? lastMessage.type === 1 || lastMessage.mediaUrl
                  ? '📷 [Hình ảnh]'
                  : lastMessage.content
                : 'Chưa có tin nhắn nào'}
            </Text>

            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>

        <MaterialIcons name="chevron-right" size={20} color="#818A91" style={{ marginLeft: 4 }} />
      </Pressable>
    );
  };

  const isLoading = loadingBookings || loadingMessages;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#0F382C" />
        </Pressable>
        <Text style={styles.headerTitle}>Danh sách hội thoại</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchBoxWrap}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#818A91" />
          <TextInput
            style={styles.searchInput}
            placeholder={isWorker ? 'Tìm tên khách hàng, dịch vụ...' : 'Tìm tên KTV, dịch vụ...'}
            placeholderTextColor="#818A91"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={18} color="#818A91" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        <Pressable
          style={[styles.tabBtn, selectedTab === 'all' && styles.tabBtnActive]}
          onPress={() => setSelectedTab('all')}>
          <Text style={[styles.tabBtnText, selectedTab === 'all' && styles.tabBtnTextActive]}>
            Tất cả
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, selectedTab === 'active' && styles.tabBtnActive]}
          onPress={() => setSelectedTab('active')}>
          <Text style={[styles.tabBtnText, selectedTab === 'active' && styles.tabBtnTextActive]}>
            Đang thực hiện
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, selectedTab === 'completed' && styles.tabBtnActive]}
          onPress={() => setSelectedTab('completed')}>
          <Text style={[styles.tabBtnText, selectedTab === 'completed' && styles.tabBtnTextActive]}>
            Hoàn thành
          </Text>
        </Pressable>
      </View>

      {/* Content List */}
      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#0F382C" />
          <Text style={styles.loadingText}>Đang tải danh sách hội thoại...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.booking.id}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetchBookings}
              colors={['#0F382C']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="chat-bubble-outline" size={56} color="#818A91" />
              <Text style={styles.emptyTitle}>Không có cuộc trò chuyện nào</Text>
              <Text style={styles.emptySubText}>
                {searchQuery
                  ? 'Không tìm thấy kết quả phù hợp với từ khóa tìm kiếm.'
                  : 'Bạn chưa có đơn dịch vụ nào có cuộc trò chuyện. Hãy đặt lịch dịch vụ ngay!'}
              </Text>
              {!isWorker && (
                <Pressable
                  style={styles.bookNowBtn}
                  onPress={() => router.replace('/home' as any)}>
                  <Text style={styles.bookNowBtnText}>Đặt dịch vụ ngay</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FBF9F5',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE6',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
    color: '#0F382C',
  },
  searchBoxWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F1EA',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#1C2526',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE6',
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F4F1EA',
  },
  tabBtnActive: {
    backgroundColor: '#0F382C',
  },
  tabBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#818A91',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#818A91',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
    shadowColor: '#0F382C',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2F7F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#059669',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  chatInfo: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partnerName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#1C2526',
    flex: 1,
  },
  timeText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
    marginLeft: 8,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: '#F2F7F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 10,
    color: '#0F382C',
  },
  bookingIdSnippet: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 10,
    color: '#818A91',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMsgText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
    flex: 1,
    marginRight: 8,
  },
  lastMsgTextUnread: {
    fontFamily: 'Montserrat_700Bold',
    color: '#1C2526',
  },
  unreadBadge: {
    backgroundColor: '#0F382C',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 10,
    color: '#ffffff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#1C2526',
    marginTop: 8,
  },
  emptySubText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
    textAlign: 'center',
    lineHeight: 18,
  },
  bookNowBtn: {
    backgroundColor: '#0F382C',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  bookNowBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#ffffff',
  },
});
