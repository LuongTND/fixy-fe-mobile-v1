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

async function fetchAllWorkersByCategory(serviceIdOrGuid?: string, city?: string, customerLat?: number, customerLng?: number) {
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
      CustomerLat: customerLat,
      CustomerLng: customerLng,
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
  const [userLocation, setUserLocation] = React.useState<{ lat: number; lng: number } | null>(null);

  // Get device GPS coordinates for distance calculations
  React.useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      } catch (err) {
        console.warn('[service-workers] GPS location error:', err);
      }
    })();
  }, []);

  const { selectedCity } = useLocationStore();
  const [cityModalVisible, setCityModalVisible] = React.useState(false);

  const { data: apiWorkers = [], isLoading: loading } = useQuery<WorkerProfile[]>({
    queryKey: ['workersByCategory', serviceId || 'all', selectedCity, userLocation?.lat, userLocation?.lng],
    queryFn: () => fetchAllWorkersByCategory(serviceId, selectedCity, userLocation?.lat, userLocation?.lng),
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

  // Badge enum mapping: 0=NewArrival, 1=Updated, 2=Quality, 3=Gold
  const BADGE_CONFIG: Record<number, { text: string; color: string }> = {
    0: { text: 'Mới đến', color: '#4A90E2' },
    1: { text: 'Mới cập nhật', color: '#E05297' },
    2: { text: 'Chất lượng', color: '#E68A2E' },
    3: { text: 'Vàng', color: '#D4AF37' },
  };

  const renderKTVItem = ({ item }: { item: WorkerProfile | any }) => {
    const badge = BADGE_CONFIG[item.badge] || BADGE_CONFIG[0];

    // Arrival time label
    const arrivalLabel = item.estimatedArrivalMinutes != null
      ? `Dự kiến ${item.estimatedArrivalMinutes} phút`
      : (item.isOnline ? 'Đặt ngay' : '');

    const workerTargetId = item.id || item.workerProfileId;

    return (
      <Pressable
        style={styles.ktvCard}
        onPress={() => router.push(`/(customer)/worker-detail?id=${workerTargetId}` as any)}>
        <View style={styles.ktvAvatarWrapper}>
          {item.avatarUrl ? (
            <Image
              source={{ uri: item.avatarUrl }}
              style={styles.ktvAvatar}
            />
          ) : (
            <View style={[styles.ktvAvatar, styles.ktvAvatarPlaceholder]}>
              <MaterialIcons name="person" size={32} color="#A0AEC0" />
            </View>
          )}
          <View style={[styles.badgePill, { backgroundColor: badge.color }]}>
            <Text style={styles.badgePillText}>{badge.text}</Text>
          </View>
        </View>

        <View style={styles.ktvMainDetails}>
          <Text style={styles.ktvName} numberOfLines={1}>{item.fullName}</Text>

          <View style={styles.ratingDistanceRow}>
            <MaterialIcons name="star" size={16} color="#F59E0B" />
            <Text style={styles.ratingText}>{item.rating > 0 ? item.rating.toFixed(1) : '5.0'}</Text>
            <Text style={styles.reviewsText}>({item.reviewsCount} đánh giá)</Text>
          </View>

          <View style={styles.locationRow}>
            <MaterialIcons name="near-me" size={14} color="#818A91" />
            <Text style={styles.distanceText} numberOfLines={1}>
              {item.distance || item.city || item.address?.city || selectedCity || 'Đà Nẵng'}
            </Text>
          </View>
        </View>

        <View style={styles.rightColumn}>
          {arrivalLabel ? (
            <Text style={styles.ktvAvailability}>{arrivalLabel}</Text>
          ) : <View />}
          <Pressable
            style={styles.bookActionBtn}
            onPress={() => router.push(`/(customer)/worker-detail?id=${workerTargetId}` as any)}>
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
  ktvAvatarPlaceholder: {
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#F59E0B',
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
  rightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingVertical: 2,
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
