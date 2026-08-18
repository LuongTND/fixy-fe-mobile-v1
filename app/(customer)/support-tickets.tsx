import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getSupportTickets, SupportStatus, SupportTicket } from '@/services/api/support';
import { formatDateTime } from '@/utils/date';
import { getCategoryLabel, getPriorityStyle, getStatusStyle } from '@/utils/support';

type FilterType = 'all' | 'active' | 'resolved';

export default function SupportTicketsScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = React.useState<FilterType>('all');

  const {
    data: tickets = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<SupportTicket[]>({
    queryKey: ['supportTickets'],
    queryFn: () => getSupportTickets(),
  });

  const filteredTickets = React.useMemo(() => {
    return tickets.filter((t) => {
      if (filter === 'active') {
        return t.status === SupportStatus.Open || t.status === SupportStatus.InProgress;
      }
      if (filter === 'resolved') {
        return t.status === SupportStatus.Resolved || t.status === SupportStatus.Closed;
      }
      return true;
    });
  }, [tickets, filter]);

  const renderItem = ({ item }: { item: SupportTicket }) => {
    const priority = getPriorityStyle(item.priority);
    const status = getStatusStyle(item.status);
    const categoryLabel = getCategoryLabel(item.category);

    return (
      <Pressable
        style={styles.ticketCard}
        onPress={() => router.push(`/support-ticket-detail?id=${item.id}` as any)}>
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: status.bg }]}>
              <Text style={[styles.badgeText, { color: status.color }]}>{status.text}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: priority.bg }]}>
              <Text style={[styles.badgeText, { color: priority.color }]}>{priority.text}</Text>
            </View>
          </View>
          <Text style={styles.cardDate}>{formatDateTime(item.createdDate)}</Text>
        </View>

        <Text style={styles.cardSubject} numberOfLines={1}>
          {item.subject}
        </Text>
        <Text style={styles.cardDesc} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.categoryInfo}>
            <MaterialIcons name="label-outline" size={16} color="#818A91" />
            <Text style={styles.categoryText}>{categoryLabel}</Text>
          </View>
          {item.bookingId && (
            <View style={styles.bookingLink}>
              <MaterialIcons name="link" size={16} color="#01677d" />
              <Text style={styles.bookingLinkText}>Liên kết đặt chỗ</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable style={styles.headerButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={18} color="#1b1c1c" />
        </Pressable>
        <Text style={styles.headerTitle}>Hỗ trợ & Khiếu nại</Text>
        <Pressable
          style={styles.headerButton}
          onPress={() => router.push('/(customer)/create-support-ticket' as any)}>
          <MaterialIcons name="add" size={24} color="#0F382C" />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, filter === 'all' && styles.activeTab]}
          onPress={() => setFilter('all')}>
          <Text style={[styles.tabText, filter === 'all' && styles.activeTabText]}>Tất cả</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, filter === 'active' && styles.activeTab]}
          onPress={() => setFilter('active')}>
          <Text style={[styles.tabText, filter === 'active' && styles.activeTabText]}>
            Đang xử lý
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, filter === 'resolved' && styles.activeTab]}
          onPress={() => setFilter('resolved')}>
          <Text style={[styles.tabText, filter === 'resolved' && styles.activeTabText]}>
            Đã đóng
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0F382C" />
        </View>
      ) : (
        <FlatList
          data={filteredTickets}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={['#0F382C']} />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 70 },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialIcons name="support-agent" size={48} color="#818A91" />
              </View>
              <Text style={styles.emptyTitle}>Chưa có yêu cầu hỗ trợ nào</Text>
              <Text style={styles.emptySubtitle}>
                Nếu gặp bất kỳ vấn đề gì, hãy gửi yêu cầu hỗ trợ. Chúng tôi sẽ giải quyết trong 24h.
              </Text>
              <Pressable
                style={styles.emptyCta}
                onPress={() => router.push('/(customer)/create-support-ticket' as any)}>
                <Text style={styles.emptyCtaText}>Tạo yêu cầu ngay</Text>
              </Pressable>
            </View>
          }
        />
      )}

      {/* Floating Create Button */}
      {tickets.length > 0 && (
        <Pressable
          style={[styles.fab, { bottom: Math.max(insets.bottom, 16) + 16 }]}
          onPress={() => router.push('/(customer)/create-support-ticket' as any)}>
          <MaterialIcons name="add" size={28} color="#ffffff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FBF9F5',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#EFECE6',
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
    color: '#0F382C',
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#EFECE6',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  activeTab: {
    borderColor: '#0F382C',
  },
  tabText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#818A91',
  },
  activeTabText: {
    color: '#0F382C',
    fontFamily: 'Montserrat_700Bold',
  },
  listContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  ticketCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFECE6',
    shadowColor: '#0F382C',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 11,
  },
  cardDate: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
  },
  cardSubject: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#1C2526',
    marginBottom: 6,
  },
  cardDesc: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#EFECE6',
    paddingTop: 10,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#818A91',
  },
  bookingLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingLinkText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#0F382C',
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
    backgroundColor: '#F4F1EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#1C2526',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  emptyCta: {
    backgroundColor: '#0F382C',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#ffffff',
  },
  fab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F382C',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
