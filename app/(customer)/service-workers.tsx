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
import { getCategoryGuid } from '@/services/api/categories';
import { formatCurrency } from '@/utils/format';

import { useQuery } from '@tanstack/react-query';

const WORKERS_PAGE_SIZE = 50;
const MAX_WORKER_PAGES = 20;

const PRICE_RANGE_OPTIONS = [
  { label: 'Dưới 150k', min: 0, max: 150000 },
  { label: '150k - 300k', min: 150000, max: 300000 },
  { label: '300k - 500k', min: 300000, max: 500000 },
  { label: 'Trên 500k', min: 500000, max: 2000000 },
];

const RATING_OPTIONS = [4, 4.5, 4.8, 5];

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

async function fetchAllWorkersByCategory(categoryId: string) {
  if (!categoryId) return [];

  const workers: WorkerProfile[] = [];

  for (let pageNumber = 1; pageNumber <= MAX_WORKER_PAGES; pageNumber += 1) {
    const page = await searchWorkers({
      CategoryId: categoryId,
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
  const [filtersApplied, setFiltersApplied] = React.useState(false);
  const [priceRange, setPriceRange] = React.useState(PRICE_RANGE_OPTIONS[1]);
  const [minRating, setMinRating] = React.useState(4.5);
  const [isOnlineOnly, setIsOnlineOnly] = React.useState(false);
  const [currentCity, setCurrentCity] = React.useState('');
  const [currentLocationLoading, setCurrentLocationLoading] = React.useState(false);

  React.useEffect(() => {
    setSearchQuery('');
    setFiltersApplied(false);
  }, [serviceId]);

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

  const normalizedSearchQuery = searchQuery.trim();
  const parsedMinPrice = filtersApplied ? priceRange.min : undefined;
  const parsedMaxPrice = filtersApplied ? priceRange.max : undefined;
  const parsedMinRating = filtersApplied ? minRating : undefined;
  const parsedIsOnline = filtersApplied && isOnlineOnly ? true : undefined;
  const filterCity = filtersApplied ? currentCity : undefined;
  const categoryId = getCategoryGuid(serviceId || '');
  const locationLabel = currentLocationLoading
    ? 'Đang lấy vị trí...'
    : currentCity || 'Chưa xác định vị trí';

  const { data: categoryWorkers = [], isLoading: loading } = useQuery<WorkerProfile[]>({
    queryKey: ['workersByCategory', categoryId],
    queryFn: () => fetchAllWorkersByCategory(categoryId),
    enabled: !!serviceId,
  });

  const workers = React.useMemo(() => {
    const normalizedCity = normalizeFilterText(filterCity);
    const normalizedSearch = normalizeFilterText(normalizedSearchQuery);

    return categoryWorkers.filter((worker) => {
      if (normalizedSearch) {
        const searchableText = normalizeFilterText(
          [worker.fullName, worker.bio, ...worker.specialties].join(' ')
        );
        if (!searchableText.includes(normalizedSearch)) return false;
      }

      if (normalizedCity && !normalizeFilterText(worker.address?.city).includes(normalizedCity)) {
        return false;
      }

      if (parsedMinPrice !== undefined && worker.basePrice < parsedMinPrice) return false;
      if (parsedMaxPrice !== undefined && worker.basePrice > parsedMaxPrice) return false;
      if (parsedMinRating !== undefined && worker.rating < parsedMinRating) return false;
      if (parsedIsOnline !== undefined && Boolean(worker.isOnline) !== parsedIsOnline) return false;

      return true;
    });
  }, [
    categoryWorkers,
    filterCity,
    normalizedSearchQuery,
    parsedIsOnline,
    parsedMaxPrice,
    parsedMinPrice,
    parsedMinRating,
  ]);

  const clearFilters = () => {
    setPriceRange(PRICE_RANGE_OPTIONS[1]);
    setMinRating(4.5);
    setIsOnlineOnly(false);
    setFiltersApplied(false);
  };

  const applyFilters = () => {
    setFiltersApplied(true);
    setFilterModalOpen(false);
  };

  const adjustPriceRange = (direction: -1 | 1) => {
    setPriceRange((current) => {
      const min = Math.max(0, current.min + direction * 50000);
      const max = Math.max(min + 50000, current.max + direction * 50000);
      return { label: `${formatCompactCurrency(min)} - ${formatCompactCurrency(max)}`, min, max };
    });
  };

  const adjustRating = (direction: -1 | 1) => {
    setMinRating((current) =>
      Math.max(1, Math.min(5, Number((current + direction * 0.5).toFixed(1))))
    );
  };

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
            Từ <Text style={styles.priceAmount}>{formatCurrency(item.basePrice)}</Text>
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
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={22} color="#818A91" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm thợ trong danh mục..."
              placeholderTextColor="#9A9A9A"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <Pressable style={styles.filterButton} onPress={() => setFilterModalOpen(true)}>
            <MaterialIcons name="tune" size={22} color="#FF8228" />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF8228" />
        </View>
      ) : (
        <FlatList
          data={workers}
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

      <Modal visible={filterModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFilterModalOpen(false)} />
          <View style={styles.filterModal}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Bộ lọc thợ</Text>
              <Pressable onPress={() => setFilterModalOpen(false)}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>

            <Text style={styles.filterLabel}>Khu vực tìm kiếm</Text>
            <Pressable style={styles.locationFilterBox} onPress={updateCurrentCity}>
              <MaterialIcons name="location-on" size={18} color="#FF8228" />
              <Text style={styles.locationFilterText}>{locationLabel}</Text>
              <MaterialIcons name="refresh" size={18} color="#FF8228" />
            </Pressable>

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
            <View style={styles.stepperRow}>
              <Pressable style={styles.stepperBtn} onPress={() => adjustPriceRange(-1)}>
                <MaterialIcons name="remove" size={18} color="#FF8228" />
              </Pressable>
              <Text style={styles.stepperValue}>
                {formatCompactCurrency(priceRange.min)} - {formatCompactCurrency(priceRange.max)}
              </Text>
              <Pressable style={styles.stepperBtn} onPress={() => adjustPriceRange(1)}>
                <MaterialIcons name="add" size={18} color="#FF8228" />
              </Pressable>
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
                    <MaterialIcons name="star" size={14} color={active ? '#ffffff' : '#FFB020'} />
                    <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                      {rating.toFixed(1)}+
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.stepperRow}>
              <Pressable style={styles.stepperBtn} onPress={() => adjustRating(-1)}>
                <MaterialIcons name="remove" size={18} color="#FF8228" />
              </Pressable>
              <Text style={styles.stepperValue}>{minRating.toFixed(1)} sao trở lên</Text>
              <Pressable style={styles.stepperBtn} onPress={() => adjustRating(1)}>
                <MaterialIcons name="add" size={18} color="#FF8228" />
              </Pressable>
            </View>

            <View style={styles.filterSwitchRow}>
              <View style={styles.filterSwitchTextCol}>
                <Text style={styles.filterSwitchTitle}>Chỉ hiện thợ đang online</Text>
                <Text style={styles.filterSwitchCaption}>
                  Ưu tiên kỹ thuật viên sẵn sàng nhận việc
                </Text>
              </View>
              <Switch
                value={isOnlineOnly}
                onValueChange={setIsOnlineOnly}
                trackColor={{ false: '#dcd9d9', true: '#ffdbc9' }}
                thumbColor={isOnlineOnly ? '#FF8228' : '#8b7265'}
              />
            </View>

            <View style={styles.filterActions}>
              <Pressable style={styles.clearFilterBtn} onPress={clearFilters}>
                <Text style={styles.clearFilterText}>Xóa lọc</Text>
              </Pressable>
              <Pressable style={styles.applyFilterBtn} onPress={applyFilters}>
                <Text style={styles.applyFilterText}>Áp dụng</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBar: {
    flex: 1,
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
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  filterModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#f5f3f2',
    paddingBottom: 12,
    marginBottom: 16,
  },
  filterModalTitle: {
    color: '#383838',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
  },
  filterLabel: {
    color: '#818A91',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    marginBottom: 8,
  },
  locationFilterBox: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE6D5',
    backgroundColor: '#FFF8F4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  locationFilterText: {
    flex: 1,
    color: '#574237',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
  },
  optionChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  optionChip: {
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionChipActive: {
    backgroundColor: '#FF8228',
    borderColor: '#FF8228',
  },
  optionChipText: {
    color: '#574237',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
  },
  optionChipTextActive: {
    color: '#ffffff',
  },
  ratingChip: {
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  stepperRow: {
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE6D5',
    backgroundColor: '#FFF8F4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    flex: 1,
    textAlign: 'center',
    color: '#383838',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
  },
  filterSwitchRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  filterSwitchTextCol: {
    flex: 1,
  },
  filterSwitchTitle: {
    color: '#383838',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
  },
  filterSwitchCaption: {
    color: '#818A91',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
  },
  clearFilterBtn: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearFilterText: {
    color: '#818A91',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
  },
  applyFilterBtn: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#FF8228',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyFilterText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
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
