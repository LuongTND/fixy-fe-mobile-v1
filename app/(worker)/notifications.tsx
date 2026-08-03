import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
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

export default function WorkerNotificationsScreen() {
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

    // Fallback to meta.bookingId — worker uses the same booking detail screen
    if (item.meta?.bookingId) {
      router.push(`/worker-job-detail?id=${item.meta.bookingId}` as any);
      return;
    }

    Alert.alert(item.title, item.body);
  };

  const getNotificationIcon = (type?: number) => {
    switch (type) {
      case 0: // Booking
        return { name: 'event-note', color: '#0F382C', bg: '#F4F1EA' };
      case 1: // Payment
        return { name: 'payment', color: '#059669', bg: '#F2F7F2' };
      case 2: // Review
        return { name: 'star-rate', color: '#D4AF37', bg: '#FFFBF0' };
      case 3: // Promo
        return { name: 'local-offer', color: '#0F382C', bg: '#F4F1EA' };
      case 4: // System
      default:
        return { name: 'notifications', color: '#818a91', bg: '#F4F1EA' };
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const icon = getNotificationIcon(item.type);
    return (
      <Pressable
        className={`flex-row rounded-xl p-3 mb-3 border shadow-sm ${
          item.isRead ? 'bg-white border-[#EFECE6]' : 'bg-[#FBF9F5] border-[#0F382C]'
        }`}
        onPress={() => handleNotificationPress(item)}>
        <View 
          className="w-[42px] h-[42px] rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: icon.bg }}>
          <MaterialIcons name={icon.name as any} size={22} color={icon.color} />
        </View>
        <View className="flex-1 justify-center">
          <View className="flex-row items-center justify-between mb-1 gap-2">
            <Text 
              className={`text-sm flex-1 ${
                item.isRead 
                  ? 'text-gray-700 font-montserrat-semibold' 
                  : 'text-gray-900 font-montserrat-bold'
              }`}>
              {item.title}
            </Text>
            {!item.isRead && <View className="w-2 h-2 rounded-full bg-[#0F382C]" />}
          </View>
          <Text 
            className="text-xs text-[#4B5563] leading-5 mb-1.5 font-montserrat" 
            numberOfLines={2}>
            {item.body}
          </Text>
          <Text className="text-[11px] text-gray-400 font-montserrat">
            {formatDateFriendly(item.createdDate)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-[#FBF9F5]">
      {/* Top Header */}
      <View 
        className="h-24 flex-row items-center justify-between px-4 bg-white border-b border-[#EFECE6] z-10"
        style={{ paddingTop: insets.top }}>
        <Pressable className="p-2 items-center justify-center" onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#0F382C" />
        </Pressable>
        <Text className="flex-1 text-center text-lg text-[#0F382C] ml-3 font-montserrat-bold">
          Thông báo
        </Text>
        <View className="flex-row items-center gap-1">
          <Pressable
            className="p-2 items-center justify-center"
            onPress={() => {
              if (notifications.some((n) => !n.isRead)) {
                Alert.alert('Xác nhận', 'Đánh dấu đọc tất cả thông báo?', [
                  { text: 'Hủy', style: 'cancel' },
                  { text: 'Đồng ý', onPress: () => markAllReadMutation.mutate() },
                ]);
              } else {
                Alert.alert('Thông báo', 'Bạn không có thông báo chưa đọc.');
              }
            }}>
            <MaterialIcons name="done-all" size={22} color="#0F382C" />
          </Pressable>
        </View>
      </View>

      {/* Main List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0F382C" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={['#0F382C']} />
          }
          contentContainerStyle={{
            paddingTop: 12,
            paddingHorizontal: 16,
            paddingBottom: Math.max(insets.bottom, 16) + 16,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20 px-8">
              <View className="w-20 h-20 rounded-full bg-[#F4F1EA] items-center justify-center mb-4">
                <MaterialIcons name="notifications-none" size={48} color="#818A91" />
              </View>
              <Text className="text-base text-gray-800 mb-1.5 font-montserrat-bold">
                Không có thông báo nào
              </Text>
              <Text className="text-sm text-gray-400 text-center leading-5 font-montserrat">
                Bạn sẽ thấy cập nhật về đơn hàng và công việc tại đây.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
