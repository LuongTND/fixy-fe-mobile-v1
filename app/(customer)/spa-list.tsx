import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  searchSpaPartners,
  SpaPartner,
  SearchSpaPartnerParams,
} from '@/services/api/spa-partners';

function getSpaFallbackThumbnail(_index: number): string | null {
  return null;
}

const QUICK_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'nearby', label: 'Gần tôi 📍' },
  { id: 'top_rated', label: 'Đánh giá cao ⭐️' },
  { id: 'promo', label: 'Có ưu đãi ⚡' },
  { id: 'off_peak', label: 'Giờ vàng 🕒' },
];

export default function SpaListScreen() {
  const insets = useSafeAreaInsets();
  const { categoryId, categoryName } = useLocalSearchParams<{
    categoryId: string;
    categoryName: string;
  }>();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState('all');
  const [customerLocation, setCustomerLocation] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setCustomerLocation({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          });
        }
      } catch (err) {
        console.warn('[SpaListScreen] Location request error', err);
      }
    })();
  }, []);

  const searchParams: SearchSpaPartnerParams = {
    spaServiceCategoryId: categoryId,
    customerLat: customerLocation?.lat,
    customerLng: customerLocation?.lng,
    minRating: activeFilter === 'top_rated' ? 4.5 : undefined,
    hasPromotion: activeFilter === 'promo' ? true : undefined,
    isOffPeakNow: activeFilter === 'off_peak' ? true : undefined,
    searchTerm: searchTerm.trim().length > 0 ? searchTerm.trim() : undefined,
    sortBy: activeFilter === 'nearby' ? 'distance' : activeFilter === 'top_rated' ? 'rating' : undefined,
    pageNumber: 1,
    pageSize: 30,
  };

  const {
    data: searchResult,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      'spa-partners',
      categoryId,
      customerLocation?.lat,
      customerLocation?.lng,
      activeFilter,
      searchTerm,
    ],
    queryFn: () => searchSpaPartners(searchParams),
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
    const thumbUri = item.coverImageUrl || item.logoUrl || getSpaFallbackThumbnail(index);
    const primaryPromo = item.activePromotions.length > 0 ? item.activePromotions[0] : null;
    const isTopRated = item.ratingAvg >= 4.8;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.spaCard,
          pressed && styles.spaCardPressed,
        ]}
        onPress={() => handleSpaPress(item)}>
        {/* Top Visual Container */}
        <View style={styles.imageWrapper}>
          {thumbUri ? (
            <Image
              source={{ uri: thumbUri }}
              style={styles.spaCardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.spaCardImage, { backgroundColor: '#E8E2D8', alignItems: 'center', justifyContent: 'center' }]}>
              <MaterialIcons name="spa" size={40} color="#C4B9A8" />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.65)']}
            style={styles.imageOverlayGradient}
          />

          {/* Top Left Floating Badges */}
          <View style={styles.floatingBadgeRow}>
            {isTopRated && (
              <View style={styles.badgeTopRated}>
                <FontAwesome5 name="award" size={10} color="#FFFFFF" />
                <Text style={styles.badgeTopRatedText}>Yêu Thích</Text>
              </View>
            )}

            {primaryPromo && (
              <View style={styles.badgePromoHighlight}>
                <MaterialIcons name="bolt" size={12} color="#FFFFFF" />
                <Text style={styles.badgePromoText}>Giảm {primaryPromo.discountPercent}%</Text>
              </View>
            )}
          </View>

          {/* Top Right Distance / Rating Badge */}
          <View style={styles.floatingRatingContainer}>
            <View style={styles.ratingBox}>
              <MaterialIcons name="star" size={13} color="#F59E0B" />
              <Text style={styles.ratingNumberText}>{item.ratingAvg.toFixed(1)}</Text>
              <Text style={styles.ratingCountText}>({item.totalReviews})</Text>
            </View>
          </View>
        </View>

        {/* Card Body Info */}
        <View style={styles.cardBody}>
          <View style={styles.nameHeaderRow}>
            <Text style={styles.spaName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.verifiedCheck}>
              <MaterialIcons name="verified" size={16} color="#0F382C" />
            </View>
          </View>

          {/* Address Line & Distance */}
          <View style={styles.locationInfoRow}>
            <MaterialIcons name="place" size={14} color="#0F382C" />
            <Text style={styles.addressText} numberOfLines={1}>
              {item.address}
            </Text>
            {item.distanceKm != null && (
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceBadgeText}>{item.distanceKm} km</Text>
              </View>
            )}
          </View>

          {/* Matched Services / Opening Hours */}
          <View style={styles.metaHighlightsRow}>
            <View style={styles.metaHighlightItem}>
              <Ionicons name="time-outline" size={13} color="#6B7280" />
              <Text style={styles.metaHighlightText}>
                {item.openingHours || '08:00 - 22:00'}
              </Text>
            </View>

            {item.phone && (
              <View style={styles.metaHighlightItem}>
                <Ionicons name="call-outline" size={12} color="#6B7280" />
                <Text style={styles.metaHighlightText}>Hotline sẵn sàng</Text>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Promotion Banner / Booking Action Footer */}
          {primaryPromo ? (
            <View style={styles.promoFooterBox}>
              <View style={styles.promoIconCircle}>
                <MaterialIcons name="local-offer" size={14} color="#B45309" />
              </View>
              <View style={styles.promoTextContent}>
                <Text style={styles.promoTitleText} numberOfLines={1}>
                  {primaryPromo.title}
                </Text>
                <Text style={styles.promoSubtext} numberOfLines={1}>
                  {primaryPromo.description || 'Áp dụng cho khách đặt qua ứng dụng Fixy'}
                </Text>
              </View>
              <View style={styles.bookNowPill}>
                <Text style={styles.bookNowText}>Đặt ngay</Text>
                <MaterialIcons name="chevron-right" size={14} color="#FFFFFF" />
              </View>
            </View>
          ) : (
            <View style={styles.standardFooterBox}>
              <Text style={styles.standardFooterText}>
                Dịch vụ chuyên nghiệp • Không gian thư thái
              </Text>
              <View style={styles.viewDetailPill}>
                <Text style={styles.viewDetailText}>Xem chi tiết</Text>
                <MaterialIcons name="arrow-forward" size={13} color="#0F382C" />
              </View>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Fixed Modern Top Navigation Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerTopRow}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.pressedState]}
            onPress={() => router.back()}>
            <MaterialIcons name="arrow-back-ios-new" size={18} color="#0F382C" />
          </Pressable>

          <View style={styles.headerCenterContent}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {categoryName ? `Spa: ${categoryName}` : 'Địa Điểm Spa'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {spaPartners.length} spa uy tín được xác thực
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.refreshHeaderBtn, pressed && styles.pressedState]}
            onPress={() => refetch()}>
            <MaterialIcons name="tune" size={18} color="#0F382C" />
          </Pressable>
        </View>

        {/* Integrated Search Input Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#818A91" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên Spa, địa chỉ, quận huyện..."
            placeholderTextColor="#9EA5AC"
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
          />
          {searchTerm.length > 0 && (
            <Pressable onPress={() => setSearchTerm('')} hitSlop={8}>
              <MaterialIcons name="cancel" size={18} color="#9EA5AC" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Quick Filter Horizontal Scrollbar */}
      <View style={styles.filterBarWrapper}>
        <FlatList
          horizontal
          data={QUICK_FILTERS}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
          renderItem={({ item }) => {
            const isSelected = activeFilter === item.id;
            return (
              <Pressable
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setActiveFilter(item.id)}>
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Spa List Rendering */}
      {isLoading ? (
        <View style={styles.skeletonContainer}>
          {[1, 2, 3].map((idx) => (
            <View key={idx} style={styles.skeletonCard}>
              <View style={styles.skeletonImage} />
              <View style={styles.skeletonBody}>
                <View style={styles.skeletonLineLong} />
                <View style={styles.skeletonLineShort} />
              </View>
            </View>
          ))}
        </View>
      ) : spaPartners.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBg}>
            <MaterialIcons name="storefront" size={38} color="#0F382C" />
          </View>
          <Text style={styles.emptyTitle}>Chưa có spa nào phù hợp</Text>
          <Text style={styles.emptySubtitle}>
            Không tìm thấy spa nào với từ khóa hoặc bộ lọc đã chọn. Hãy thử tìm kiếm lại!
          </Text>
          <Pressable
            style={styles.resetFilterBtn}
            onPress={() => {
              setSearchTerm('');
              setActiveFilter('all');
              refetch();
            }}>
            <MaterialIcons name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.resetFilterBtnText}>Đặt lại bộ lọc</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={spaPartners}
          keyExtractor={(item) => item.id}
          renderItem={renderSpaCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
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
  pressedState: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },

  // Header Container
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    zIndex: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F4F1EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenterContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
    color: '#0F382C',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 11,
    color: '#818A91',
    marginTop: 1,
  },
  refreshHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E6F0EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F1EA',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: '#0F382C',
    paddingVertical: 0,
  },

  // Filter Bar
  filterBarWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE6',
    paddingVertical: 10,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F4F1EA',
  },
  filterChipActive: {
    backgroundColor: '#0F382C',
  },
  filterChipText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // Main List Content
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Spa Card Styling
  spaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFECE6',
    elevation: 3,
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  spaCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },

  // Image Section
  imageWrapper: {
    height: 155,
    position: 'relative',
    width: '100%',
    backgroundColor: '#EFECE6',
  },
  spaCardImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
  },

  // Floating Badges
  floatingBadgeRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 6,
  },
  badgeTopRated: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F382C',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeTopRatedText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  badgePromoHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EF4444',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePromoText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },

  floatingRatingContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  ratingNumberText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#0F382C',
  },
  ratingCountText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 10.5,
    color: '#6B7280',
  },

  // Card Body
  cardBody: {
    padding: 14,
  },
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  spaName: {
    flex: 1,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16.5,
    color: '#0F382C',
    marginRight: 6,
  },
  verifiedCheck: {},

  locationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  addressText: {
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#6B7280',
  },
  distanceBadge: {
    backgroundColor: '#E6F0EB',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  distanceBadgeText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 10.5,
    color: '#0F382C',
  },

  metaHighlightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  metaHighlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaHighlightText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 11.5,
    color: '#6B7280',
  },

  cardDivider: {
    height: 1,
    backgroundColor: '#F4F1EA',
    marginVertical: 10,
  },

  // Promo Footer
  promoFooterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 14,
    gap: 8,
  },
  promoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoTextContent: {
    flex: 1,
  },
  promoTitleText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#92400E',
  },
  promoSubtext: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 10.5,
    color: '#B45309',
  },
  bookNowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B45309',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 2,
  },
  bookNowText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 11,
    color: '#FFFFFF',
  },

  // Standard Footer
  standardFooterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  standardFooterText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11.5,
    color: '#818A91',
    flex: 1,
  },
  viewDetailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F0EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  viewDetailText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 11.5,
    color: '#0F382C',
  },

  // Skeleton Loader
  skeletonContainer: {
    padding: 16,
    gap: 16,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    height: 220,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  skeletonImage: {
    height: 130,
    backgroundColor: '#EFECE6',
  },
  skeletonBody: {
    padding: 14,
    gap: 8,
  },
  skeletonLineLong: {
    width: '60%',
    height: 14,
    backgroundColor: '#EFECE6',
    borderRadius: 4,
  },
  skeletonLineShort: {
    width: '85%',
    height: 10,
    backgroundColor: '#F4F1EA',
    borderRadius: 4,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E6F0EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#0F382C',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12.5,
    color: '#818A91',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F382C',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  resetFilterBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
});
