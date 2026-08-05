import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
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

import {
  searchSpaPartners,
  SpaPartner,
  SearchSpaPartnerParams,
} from '@/services/api/spa-partners';

const FALLBACK_SPA_THUMBNAILS = [
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=400&q=80',
];

function getSpaFallbackThumbnail(index: number): string {
  return FALLBACK_SPA_THUMBNAILS[index % FALLBACK_SPA_THUMBNAILS.length];
}

export default function SpaListScreen() {
  const insets = useSafeAreaInsets();
  const { categoryId, categoryName } = useLocalSearchParams<{
    categoryId: string;
    categoryName: string;
  }>();

  const [customerLocation, setCustomerLocation] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);

  React.useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setCustomerLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      }
    })();
  }, []);

  const searchParams: SearchSpaPartnerParams = {
    spaServiceCategoryId: categoryId,
    customerLat: customerLocation?.lat,
    customerLng: customerLocation?.lng,
    pageNumber: 1,
    pageSize: 20,
  };

  const {
    data: searchResult,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['spa-partners', categoryId, customerLocation?.lat, customerLocation?.lng],
    queryFn: () => searchSpaPartners(searchParams),
    enabled: !!categoryId,
    staleTime: 2 * 60 * 1000,
  });

  const spaPartners = searchResult?.items ?? [];

  const handleSpaPress = (spa: SpaPartner) => {
    router.push({
      pathname: '/(customer)/spa-detail',
      params: { spaId: spa.id },
    } as any);
  };

  const renderSpaCard = ({ item, index }: { item: SpaPartner; index: number }) => {
    const thumbUri = item.logoUrl || item.coverImageUrl || getSpaFallbackThumbnail(index);
    const primaryPromo = item.activePromotions.length > 0 ? item.activePromotions[0] : null;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.spaCard,
          pressed && styles.spaCardPressed,
        ]}
        onPress={() => handleSpaPress(item)}>
        {/* Top Info Row */}
        <View style={styles.cardTopRow}>
          {/* Left Thumbnail Image */}
          <Image
            source={{ uri: thumbUri }}
            style={styles.spaThumbnail}
            resizeMode="cover"
          />

          {/* Right Info Section */}
          <View style={styles.spaMainInfo}>
            <Text style={styles.spaName} numberOfLines={1}>
              {item.name}
            </Text>

            {/* Rating, Views, Distance Row */}
            <View style={styles.metricsRow}>
              <Text style={styles.ratingText}>{item.ratingAvg.toFixed(1)} ★</Text>
              <Text style={styles.metricDivider}>|</Text>
              <MaterialIcons name="visibility" size={13} color="#818A91" />
              <Text style={styles.metricsText}>{item.totalReviews * 43 + 120}</Text>
            </View>

            {/* Address / Distance Row */}
            <View style={styles.locationRow}>
              <MaterialIcons name="place" size={13} color="#0F382C" />
              <Text style={styles.distanceText}>
                {item.distanceKm != null ? `${item.distanceKm} km` : item.address}
              </Text>
            </View>
          </View>
        </View>

        {/* Divider Line */}
        <View style={styles.cardDivider} />

        {/* Bottom Promotion / Off-Peak Highlight Section */}
        {primaryPromo ? (
          <View style={styles.promoContainer}>
            <Text style={styles.promoDescription} numberOfLines={1}>
              {primaryPromo.description || primaryPromo.title}
            </Text>
            <View style={styles.discountPill}>
              <Text style={styles.discountPillText}>-{primaryPromo.discountPercent}%</Text>
            </View>
          </View>
        ) : (
          <View style={styles.promoContainer}>
            <Text style={styles.defaultPromoText} numberOfLines={1}>
              Đặt hẹn ngay để nhận ưu đãi từ spa
            </Text>
            <MaterialIcons name="chevron-right" size={18} color="#818A91" />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color="#0F382C" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {categoryName || 'Danh Sách Spa'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {spaPartners.length} spa uy tín
          </Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Filter Row Bar inspired by reference UI */}
      <View style={styles.filterBar}>
        <Pressable style={styles.filterIconButton}>
          <MaterialIcons name="tune" size={18} color="#0F382C" />
        </Pressable>
        <View style={styles.filterChip}>
          <Text style={styles.filterChipText}>Khu vực</Text>
          <MaterialIcons name="keyboard-arrow-down" size={16} color="#475569" />
        </View>
        <View style={[styles.filterChip, styles.filterChipActive]}>
          <MaterialIcons name="check" size={14} color="#0F382C" />
          <Text style={[styles.filterChipText, styles.filterChipTextActive]}>
            {categoryName || 'Dịch vụ'}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={16} color="#0F382C" />
        </View>
      </View>

      {/* Spa List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F382C" />
          <Text style={styles.loadingText}>Đang tải danh sách spa...</Text>
        </View>
      ) : spaPartners.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="storefront" size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Chưa có spa nào phù hợp</Text>
          <Text style={styles.emptySubtitle}>
            Hiện chưa tìm thấy spa nào cung cấp dịch vụ này trong khu vực.
          </Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Tải lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={spaPartners}
          keyExtractor={(item) => item.id}
          renderItem={renderSpaCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9F8F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F4F1EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
    color: '#0F382C',
  },
  headerSubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
    marginTop: 1,
  },

  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE6',
    gap: 8,
  },
  filterIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F4F1EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F4F1EA',
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: '#E6F0EB',
    borderWidth: 1,
    borderColor: '#CDE5E5',
  },
  filterChipText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#475569',
  },
  filterChipTextActive: {
    fontFamily: 'Montserrat_700Bold',
    color: '#0F382C',
  },

  listContent: {
    padding: 16,
  },

  // Spa Card (Inspired by Reference Image 2)
  spaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
    elevation: 2,
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  spaCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 14,
    marginRight: 12,
  },
  spaMainInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  spaName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#1C2526',
    marginBottom: 4,
  },
  metricsRow: {
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
  metricDivider: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  metricsText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  distanceText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#6B7280',
  },

  // Divider inside Card
  cardDivider: {
    height: 1,
    backgroundColor: '#F4F1EA',
    marginVertical: 10,
  },

  // Promo Row inside Card
  promoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoDescription: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#475569',
    flex: 1,
    marginRight: 8,
  },
  defaultPromoText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
  },
  discountPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  discountPillText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 11,
    color: '#DC2626',
  },

  // Loading & Empty
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: '#818A91',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  emptyTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#1C2526',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#0F382C',
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 14,
  },
  retryBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
});
