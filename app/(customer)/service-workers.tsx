import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import * as React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { searchWorkers, WorkerProfile } from '@/services/api/workers';
import { fetchCategories, getCategoryGuid } from '@/services/api/categories';
import { formatCurrency } from '@/utils/format';
import { useQuery } from '@tanstack/react-query';
import { CitySelectorModal } from '@/components/city-selector-modal';
import { useLocationStore } from '@/store/store';

const WORKERS_PAGE_SIZE = 50;
const MAX_WORKER_PAGES = 20;

const PRICE_RANGE_OPTIONS = [
  { label: 'Dưới 200k', min: 0, max: 200000 },
  { label: '200k - 500k', min: 200000, max: 500000 },
  { label: '500k - 1tr', min: 500000, max: 1000000 },
  { label: 'Trên 1tr', min: 1000000, max: 5000000 },
];

const RATING_OPTIONS = [4.0, 4.5, 4.8, 5.0];

function normalizeFilterText(value?: string | null) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function formatCompactCurrency(value: number) {
  if (value >= 1000000) return `${value / 1000000}tr`;
  return `${Math.round(value / 1000)}k`;
}

async function fetchAllWorkersByCategory(serviceIdOrGuid?: string, city?: string) {
  const workers: WorkerProfile[] = [];
  const categories = await fetchCategories();

  let categoryId: string | undefined;
  if (serviceIdOrGuid) {
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (guidRegex.test(serviceIdOrGuid)) {
      categoryId = serviceIdOrGuid;
    } else {
      const match = categories.find(
        (c) =>
          c.code.toLowerCase() === serviceIdOrGuid.toLowerCase() ||
          c.name.toLowerCase() === serviceIdOrGuid.toLowerCase()
      );
      if (match) {
        categoryId = match.id;
      }
    }
  }

  for (let pageNumber = 1; pageNumber <= MAX_WORKER_PAGES; pageNumber += 1) {
    const page = await searchWorkers({
      CategoryId: categoryId,
      City: city,
      PageNumber: pageNumber,
      PageSize: WORKERS_PAGE_SIZE,
    });

    workers.push(...page);

    if (page.length < WORKERS_PAGE_SIZE) {
      break;
    }
  }

  return workers;
}

const DEFAULT_SPA_KTVS: WorkerProfile[] = [
  {
    id: 'ktv-1',
    workerProfileId: 'ktv-1',
    userId: 'ktv-user-1',
    fullName: 'Kim Hằng',
    bio: '5 năm kinh nghiệm làm việc, các bài massage dầu, thái, đá nóng, Giác hơi, combo cạo mặt, masa mặt, lấy Ráy tai, Giác hơi lửa, tẩy tế bào chết toàn thân',
    rating: 4.9,
    reviewsCount: 135,
    completedJobsCount: 240,
    hourlyRate: 500000,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    specialties: ['Massage Dầu', 'Massage Thái', 'Giác hơi lửa'],
    isOnline: true,
    badgeText: 'Chất lượng',
    badgeColor: '#E68A2E',
    distanceText: '100m',
    availableTime: 'Sớm nhất 12:00',
  } as any,
  {
    id: 'ktv-2',
    workerProfileId: 'ktv-2',
    userId: 'ktv-user-2',
    fullName: 'Thanh Trần',
    bio: 'Chuyên viên chăm sóc da & массаж trị liệu',
    rating: 5.0,
    reviewsCount: 2,
    completedJobsCount: 18,
    hourlyRate: 450000,
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
    specialties: ['Chăm sóc da mặt', 'Massage body'],
    isOnline: true,
    badgeText: 'Mới đến',
    badgeColor: '#4A90E2',
    distanceText: '1 km',
    availableTime: 'Sớm nhất 12:00',
  } as any,
  {
    id: 'ktv-3',
    workerProfileId: 'ktv-3',
    userId: 'ktv-user-3',
    fullName: 'Như Ý',
    bio: 'KTV làm đẹp & Nails chuyên nghiệp tại nhà',
    rating: 5.0,
    reviewsCount: 1,
    completedJobsCount: 12,
    hourlyRate: 350000,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    specialties: ['Nails', 'Wax lông'],
    isOnline: true,
    badgeText: 'Mới đến',
    badgeColor: '#4A90E2',
    distanceText: '1 km',
    availableTime: 'Sớm nhất 12:00',
  } as any,
  {
    id: 'ktv-4',
    workerProfileId: 'ktv-4',
    userId: 'ktv-user-4',
    fullName: 'Phương Nguyễn',
    bio: 'KTV Spa & Trị liệu cổ vai gáy',
    rating: 5.0,
    reviewsCount: 3,
    completedJobsCount: 45,
    hourlyRate: 400000,
    avatarUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=300&q=80',
    specialties: ['Trị liệu cổ vai gáy', 'Bấm huyệt'],
    isOnline: true,
    badgeText: 'Mới đến',
    badgeColor: '#4A90E2',
    distanceText: '1 km',
    availableTime: 'Sớm nhất 12:00',
  } as any,
  {
    id: 'ktv-5',
    workerProfileId: 'ktv-5',
    userId: 'ktv-user-5',
    fullName: 'Lyly',
    bio: 'Top KTV Spa cao cấp với 600+ lượt đánh giá 5 sao',
    rating: 5.0,
    reviewsCount: 667,
    completedJobsCount: 890,
    hourlyRate: 600000,
    avatarUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=300&q=80',
    specialties: ['Massage đá nóng', 'Tẩy tế bào chết'],
    isOnline: true,
    badgeText: 'Mới cập nhật',
    badgeColor: '#E05297',
    distanceText: '1 km',
    availableTime: 'Sớm nhất 12:00',
  } as any,
];

export default function ServiceWorkersScreen() {
  const insets = useSafeAreaInsets();
  const { serviceId, serviceName } = useLocalSearchParams<{
    serviceId: string;
    serviceName: string;
  }>();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterModalOpen, setFilterModalOpen] = React.useState(false);
  const [activeFilterChip, setActiveFilterChip] = React.useState<'near' | 'popular' | 'all'>('near');
  const [priceRange, setPriceRange] = React.useState(PRICE_RANGE_OPTIONS[1]);
  const [minRating, setMinRating] = React.useState(4.5);
  const [currentCity, setCurrentCity] = React.useState('');
  const [currentLocationLoading, setCurrentLocationLoading] = React.useState(false);

  const updateCurrentCity = React.useCallback(async () => {
    setCurrentLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCurrentCity('');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setCurrentCity((place?.city || place?.subregion || place?.region || '').trim());
    } catch (error) {
      console.warn('[service-workers] Unable to get current city', error);
      setCurrentCity('');
    } finally {
      setCurrentLocationLoading(false);
    }
  }, []);

  React.useEffect(() => {
    updateCurrentCity();
  }, [updateCurrentCity]);

  const { selectedCity } = useLocationStore();
  const [cityModalVisible, setCityModalVisible] = React.useState(false);

  const { data: apiWorkers = [], isLoading: loading } = useQuery<WorkerProfile[]>({
    queryKey: ['workersByCategory', serviceId || 'all', selectedCity],
    queryFn: () => fetchAllWorkersByCategory(serviceId, selectedCity),
    enabled: true,
  });

  const workerList = apiWorkers;

  const filteredWorkers = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return workerList.filter((item) => {
      if (query && !item.fullName.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [workerList, searchQuery]);

  const renderKTVItem = ({ item }: { item: WorkerProfile | any }) => {
    const badgeText = item.badgeText || (item.rating >= 4.9 ? 'Chất lượng' : 'Mới đến');
    const badgeColor = item.badgeColor || (item.rating >= 4.9 ? '#E68A2E' : '#4A90E2');

    return (
      <Pressable
        style={styles.ktvCard}
        onPress={() => router.push(`/(customer)/worker-detail?id=${item.id}` as any)}>
        <View style={styles.ktvAvatarWrapper}>
          <Image
            source={{ uri: item.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80' }}
            style={styles.ktvAvatar}
          />
          <View style={[styles.badgePill, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgePillText}>{badgeText}</Text>
          </View>
        </View>

        <View style={styles.ktvMainDetails}>
          <View style={styles.ktvHeaderRow}>
            <Text style={styles.ktvName}>{item.fullName}</Text>
            <Text style={styles.ktvAvailability}>{item.availableTime || 'Sớm nhất 12:00'}</Text>
          </View>

          <View style={styles.ratingDistanceRow}>
            <MaterialIcons name="star" size={15} color="#D4AF37" />
            <Text style={styles.ratingText}>{item.rating || 5.0}</Text>
            <Text style={styles.reviewsText}>({item.reviewsCount || 10} đánh giá)</Text>
          </View>

          <View style={styles.locationRow}>
            <MaterialIcons name="near-me" size={14} color="#818A91" />
            <Text style={styles.distanceText}>{item.distanceText || '100m'}</Text>
          </View>
        </View>

        <View style={styles.actionColumn}>
          <Pressable
            style={styles.bookActionBtn}
            onPress={() => router.push(`/(customer)/worker-detail?id=${item.id}` as any)}>
            <Text style={styles.bookActionText}>Đặt</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header Matching Image 3 */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#0F382C" />
        </Pressable>

        <Pressable style={styles.locationDropdown} onPress={() => setCityModalVisible(true)}>
          <Text style={styles.locationDropdownText}>{selectedCity}</Text>
          <MaterialIcons name="keyboard-arrow-down" size={18} color="#0F382C" />
        </Pressable>

        <View style={styles.searchHeaderInputWrapper}>
          <MaterialIcons name="search" size={18} color="#818A91" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchHeaderInput}
            placeholder="Tìm kiếm kỹ thuật vi..."
            placeholderTextColor="#9A9A9A"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <Pressable style={styles.iconBtn}>
          <MaterialIcons name="favorite-border" size={22} color="#0F382C" />
        </Pressable>
      </View>

      {/* Filter Chips Bar Matching Image 3 */}
      <View style={styles.filterChipsRow}>
        <Pressable style={styles.filterIconButton} onPress={() => setFilterModalOpen(true)}>
          <MaterialIcons name="tune" size={18} color="#0F382C" />
        </Pressable>

        <Pressable
          style={[styles.chipItem, activeFilterChip === 'near' && styles.chipItemActive]}
          onPress={() => setActiveFilterChip('near')}>
          <Text style={[styles.chipText, activeFilterChip === 'near' && styles.chipTextActive]}>
            Gần tôi
          </Text>
        </Pressable>

        <Pressable
          style={[styles.chipItem, activeFilterChip === 'popular' && styles.chipItemActive]}
          onPress={() => setActiveFilterChip('popular')}>
          <Text style={[styles.chipText, activeFilterChip === 'popular' && styles.chipTextActive]}>
            Đặt nhiều
          </Text>
        </Pressable>

        <Pressable style={styles.chipDropdownItem} onPress={() => setFilterModalOpen(true)}>
          <Text style={styles.chipDropdownText}>Loại dịch vụ</Text>
          <MaterialIcons name="keyboard-arrow-down" size={16} color="#4B5563" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0F382C" />
        </View>
      ) : (
        <FlatList
          data={filteredWorkers}
          keyExtractor={(item) => item.id}
          renderItem={renderKTVItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="person-off" size={48} color="#818A91" />
              <Text style={styles.emptyText}>Chưa có kỹ thuật viên nào tại {selectedCity}.</Text>
            </View>
          }
        />
      )}

      {/* Filter Modal */}
      <Modal visible={filterModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFilterModalOpen(false)} />
          <View style={styles.filterModal}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Bộ lọc Kỹ thuật viên</Text>
              <Pressable onPress={() => setFilterModalOpen(false)}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>

            <Text style={styles.filterLabel}>Khoảng giá</Text>
            <View style={styles.optionChipGrid}>
              {PRICE_RANGE_OPTIONS.map((option) => {
                const active = priceRange.min === option.min && priceRange.max === option.max;
                return (
                  <Pressable
                    key={option.label}
                    style={[styles.optionChip, active && styles.optionChipActive]}
                    onPress={() => setPriceRange(option)}>
                    <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.filterLabel}>Đánh giá tối thiểu</Text>
            <View style={styles.optionChipGrid}>
              {RATING_OPTIONS.map((rating) => {
                const active = minRating === rating;
                return (
                  <Pressable
                    key={rating}
                    style={[styles.ratingChip, active && styles.optionChipActive]}
                    onPress={() => setMinRating(rating)}>
                    <MaterialIcons name="star" size={14} color={active ? '#ffffff' : '#D4AF37'} />
                    <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                      {rating.toFixed(1)}+
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.applyFilterBtn} onPress={() => setFilterModalOpen(false)}>
              <Text style={styles.applyFilterBtnText}>Áp dụng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* City Selector Modal */}
      <CitySelectorModal
        visible={cityModalVisible}
        onClose={() => setCityModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FBF9F5',
  },
  header: {
    height: 86,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#EFECE6',
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F4F1EA',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  locationDropdownText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#0F382C',
  },
  searchHeaderInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F1EA',
    borderRadius: 20,
    height: 38,
    paddingHorizontal: 12,
  },
  searchHeaderInput: {
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#1C2526',
  },
  filterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#EFECE6',
  },
  filterIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4F1EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#F4F1EA',
  },
  chipItemActive: {
    backgroundColor: '#0F382C',
  },
  chipText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#4B5563',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  chipDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#F4F1EA',
  },
  chipDropdownText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#4B5563',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 14,
    gap: 12,
  },
  ktvCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#EFECE6',
    shadowColor: '#0F382C',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  ktvAvatarWrapper: {
    position: 'relative',
  },
  ktvAvatar: {
    width: 80,
    height: 80,
    borderRadius: 14,
  },
  badgePill: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopLeftRadius: 14,
    borderBottomRightRadius: 10,
  },
  badgePillText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
  },
  ktvMainDetails: {
    flex: 1,
  },
  ktvHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ktvName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#1C2526',
  },
  ktvAvailability: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#818A91',
  },
  ratingDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  ratingText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#1C2526',
  },
  reviewsText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#6B7280',
  },
  actionColumn: {
    justifyContent: 'center',
  },
  bookActionBtn: {
    backgroundColor: '#0F382C',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
  },
  bookActionText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#818A91',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 14,
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterModalTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
    color: '#0F382C',
  },
  filterLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#1C2526',
    marginTop: 6,
  },
  optionChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#F4F1EA',
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#F4F1EA',
  },
  optionChipActive: {
    backgroundColor: '#0F382C',
  },
  optionChipText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#4B5563',
  },
  optionChipTextActive: {
    color: '#ffffff',
  },
  applyFilterBtn: {
    backgroundColor: '#0F382C',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  applyFilterBtnText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
  },
});
