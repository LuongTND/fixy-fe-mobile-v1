import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getNotifications,
  markAllAsRead,
  markAsRead,
  Notification,
} from '@/services/api/notifications';
import { formatDateFriendly } from '@/utils/date';
import { parseDeepLink } from '@/utils/navigation';


export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const {
    data: notifications = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
      Alert.alert('Thành công', 'Đã đánh dấu tất cả thông báo là đã đọc.');
    },
  });

  const handleNotificationPress = async (item: Notification) => {
    if (!item.isRead) {
      markReadMutation.mutate(item.id);
    }
    
    // Parse the deepLink if provided
    const parsedRoute = parseDeepLink(item.deepLink);
    if (parsedRoute) {
      router.push({
        pathname: parsedRoute.pathname,
        params: parsedRoute.params,
      } as any);
      return;
    }

    // Fallback to meta.bookingId if deepLink parse fails
    if (item.meta?.bookingId) {
      router.push(`/booking-detail?bookingId=${item.meta.bookingId}` as any);
      return;
    }

    Alert.alert(item.title, item.body);
  };

  const getNotificationIcon = (type?: number) => {
    switch (type) {
      case 0: // Booking
        return { name: 'event-note', color: '#ff8228', bg: '#ffe6d5' };
      case 1: // Payment
        return { name: 'payment', color: '#4caf50', bg: '#e8f5e9' };
      case 2: // Review
        return { name: 'star-rate', color: '#ffb020', bg: '#fff8e1' };
      case 3: // Promo
        return { name: 'local-offer', color: '#01677d', bg: '#e7f8fc' };
      case 4: // System
      default:
        return { name: 'notifications', color: '#818a91', bg: '#fbf9f8' };
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const icon = getNotificationIcon(item.type);
    return (
      <Pressable
        style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
        onPress={() => handleNotificationPress(item)}>
        <View style={[styles.iconContainer, { backgroundColor: icon.bg }]}>
          <MaterialIcons name={icon.name as any} size={22} color={icon.color} />
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.titleText, !item.isRead && styles.unreadText]}>
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.messageText} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.dateText}>{formatDateFriendly(item.createdDate)}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable style={styles.headerButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#1b1c1c" />
        </Pressable>
        <Text style={styles.headerTitle}>Thông báo</Text>
        <View style={styles.headerRightActions}>
          <Pressable
            style={styles.headerButton}
            onPress={() => {
              if (notifications.some(n => !n.isRead)) {
                Alert.alert(
                  'Xác nhận',
                  'Đánh dấu đọc tất cả thông báo?',
                  [
                    { text: 'Hủy', style: 'cancel' },
                    { text: 'Đồng ý', onPress: () => markAllReadMutation.mutate() }
                  ]
                );
              } else {
                Alert.alert('Thông báo', 'Bạn không có thông báo chưa đọc.');
              }
            }}>
            <MaterialIcons name="done-all" size={22} color="#1b1c1c" />
          </Pressable>
          <Pressable
            style={styles.headerButton}
            onPress={() => router.push('/(customer)/notifications-settings' as any)}>
            <MaterialIcons name="settings" size={22} color="#1b1c1c" />
          </Pressable>
        </View>
      </View>

      {/* Main List */}
      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#FF8228" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={['#FF8228']}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 16 },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialIcons name="notifications-none" size={48} color="#818A91" />
              </View>
              <Text style={styles.emptyTitle}>Không có thông báo nào</Text>
              <Text style={styles.emptySubtitle}>
                Bạn sẽ thấy cập nhật về đơn hàng, khuyến mãi tại đây.
              </Text>
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
    backgroundColor: '#FBF9F8',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    height: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#DDDDDD',
    zIndex: 10,
  },
  headerButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#1b1c1c',
    textAlign: 'center',
    marginLeft: 12,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listContent: {
    paddingTop: 12,
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    shadowColor: '#000000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: '#fffdfb',
    borderColor: '#ffd3b5',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  titleText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#383838',
    flex: 1,
  },
  unreadText: {
    color: '#1b1c1c',
    fontFamily: 'Montserrat_700Bold',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF8228',
  },
  messageText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#574237',
    lineHeight: 18,
    marginBottom: 6,
  },
  dateText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFE6D5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#383838',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
    textAlign: 'center',
    lineHeight: 18,
  },
});
