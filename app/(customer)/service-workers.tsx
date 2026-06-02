import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getWorkersByService, WorkerProfile } from '@/services/api/workers';

import { useQuery } from '@tanstack/react-query';

export default function ServiceWorkersScreen() {
  const insets = useSafeAreaInsets();
  const { serviceId, serviceName } = useLocalSearchParams<{
    serviceId: string;
    serviceName: string;
  }>();

  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: workers = [], isLoading: loading } = useQuery<WorkerProfile[]>({
    queryKey: ['workers', serviceId],
    queryFn: () => getWorkersByService(serviceId || ''),
    enabled: !!serviceId,
  });

  const filteredWorkers = workers.filter((w) =>
    w.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderWorkerItem = ({ item }: { item: WorkerProfile }) => (
    <Pressable
      style={styles.workerCard}
      onPress={() => router.push(`/worker-detail?id=${item.id}` as any)}>
      <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
      {item.isPro && (
        <View style={styles.proLabel}>
          <Text style={styles.proText}>PRO</Text>
        </View>
      )}

      <View style={styles.workerInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.workerName}>{item.fullName}</Text>
          <View style={styles.ratingBox}>
            <MaterialIcons name="star" size={16} color="#FFB020" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        </View>

        <Text style={styles.bioText} numberOfLines={2}>
          {item.bio}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialIcons name="done-all" size={14} color="#818A91" />
            <Text style={styles.statText}>{item.completedJobs} đơn</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="navigation" size={14} color="#818A91" />
            <Text style={styles.statText}>{item.distance}</Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.priceText}>
            Từ <Text style={styles.priceAmount}>{item.basePrice.toLocaleString()}đ</Text>
          </Text>
          <Pressable
            style={styles.selectButton}
            onPress={() => router.push(`/worker-detail?id=${item.id}` as any)}>
            <Text style={styles.selectButtonText}>Chọn thợ</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={26} color="#1B1C1C" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {serviceName || 'Danh sách thợ'}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={22} color="#818A91" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm thợ theo tên..."
            placeholderTextColor="#9A9A9A"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF8228" />
        </View>
      ) : (
        <FlatList
          data={filteredWorkers}
          keyExtractor={(item) => item.id}
          renderItem={renderWorkerItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Quick Match Card */}
              <View style={styles.quickMatchCard}>
                <View style={styles.quickMatchLeft}>
                  <View style={styles.quickMatchIconWrapper}>
                    <MaterialIcons name="bolt" size={28} color="#FF8228" />
                  </View>
                  <View style={styles.quickMatchInfo}>
                    <Text style={styles.quickMatchTitle}>Kết nối nhanh</Text>
                    <Text style={styles.quickMatchSubtitle}>
                      Hệ thống tự động tìm thợ tốt nhất ở gần bạn ngay lập tức.
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={styles.quickMatchBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/booking-setup',
                      params: { categoryId: serviceId, autoMatch: 'true' },
                    } as any)
                  }>
                  <Text style={styles.quickMatchBtnText}>Đặt ngay</Text>
                </Pressable>
              </View>

              <Text style={styles.sectionTitle}>Danh sách kỹ thuật viên</Text>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="person-off" size={48} color="#818A91" />
              <Text style={styles.emptyText}>Không tìm thấy thợ phù hợp.</Text>
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
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#efedec',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbf9f8',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    height: 44,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: '#383838',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
  },
  quickMatchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFE6D5',
    borderWidth: 1,
    borderColor: '#FF8228',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  quickMatchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  quickMatchIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickMatchInfo: {
    flex: 1,
  },
  quickMatchTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#622a00',
  },
  quickMatchSubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#9a4600',
    marginTop: 2,
    lineHeight: 14,
  },
  quickMatchBtn: {
    backgroundColor: '#FF8228',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  quickMatchBtnText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#383838',
    marginBottom: 16,
  },
  workerCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 14,
    marginBottom: 16,
    position: 'relative',
    shadowColor: '#000000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#efedec',
  },
  proLabel: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#FF8228',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 8,
  },
  workerInfo: {
    flex: 1,
    marginLeft: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  workerName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#383838',
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#383838',
  },
  bioText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    lineHeight: 16,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#818A91',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#f5f3f2',
    paddingTop: 10,
  },
  priceText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
  },
  priceAmount: {
    fontFamily: 'Montserrat_700Bold',
    color: '#FF8228',
    fontSize: 15,
  },
  selectButton: {
    backgroundColor: '#FFE6D5',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  selectButtonText: {
    color: '#FF8228',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#818A91',
  },
});
