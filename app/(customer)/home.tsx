import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import * as React from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/layout/bottom-tab-bar';
import { fetchCategories } from '@/services/api/categories';
import { getUnreadCount } from '@/services/api/notifications';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const BANNER_HEIGHT = Math.min(1744, Math.round(BANNER_WIDTH * 0.6));

const BANNER_SLIDES = [
  { id: 'fixy-banner-1', source: require('../../assets/fixy-banner-1.png') },
  { id: 'fixy-banner-2', source: require('../../assets/fixy-banner-2.png') },
  { id: 'fixy-banner-3', source: require('../../assets/fixy-banner-3.png') },
];

const CATEGORY_IMAGES = {
  water: require('../../assets/water.png'),
  hygiene: require('../../assets/hygiene.png'),
  housePaintRenovate: require('../../assets/house-paint-renovate.png'),
  furniture: require('../../assets/furniture.png'),
  bikeCar: require('../../assets/bike-car.png'),
  washingMachine: require('../../assets/washing-machine.png'),
  ac: require('../../assets/AC.png'),
  electric: require('../../assets/electric.png'),
  toiletPump: require('../../assets/toilet-pump.png'),
};

type HomeService = {
  id: string;
  name: string;
  image?: ImageSourcePropType;
  imageUrl?: string | null;
};

const SERVICES: HomeService[] = [
  { id: 'dien', name: 'Điện', image: CATEGORY_IMAGES.electric },
  { id: 'nuoc', name: 'Nước', image: CATEGORY_IMAGES.water },
  { id: 'dieuhoa', name: 'Điều hòa', image: CATEGORY_IMAGES.ac },
  { id: 'maygiat', name: 'Máy giặt', image: CATEGORY_IMAGES.washingMachine },
  { id: 'xemay', name: 'Xe máy - Ô tô', image: CATEGORY_IMAGES.bikeCar },
  { id: 'moc', name: 'Mộc - Nội thất', image: CATEGORY_IMAGES.furniture },
  { id: 'son', name: 'Sơn sửa nhà', image: CATEGORY_IMAGES.housePaintRenovate },
  { id: 'vesinh', name: 'Vệ sinh', image: CATEGORY_IMAGES.hygiene },
  { id: 'thongtac', name: 'Thông tắc bồn cầu', image: CATEGORY_IMAGES.toiletPump },
];

const FEATURED_CRAFTSMEN = [
  {
    id: 'thang',
    name: 'Nguyễn Văn Thắng',
    isPro: true,
    rating: 4.9,
    reviews: 128,
    completed: 256,
    distance: '2.1 km',
    price: 'Từ 150.000đ',
  },
  {
    id: 'duc',
    name: 'Lê Minh Đức',
    isPro: false,
    rating: 4.8,
    reviews: 96,
    completed: 189,
    distance: '2.8 km',
    price: 'Từ 140.000đ',
  },
];

const CATEGORIES_UI_MAP: Record<string, { slug: string; image: ImageSourcePropType }> = {
  Điện: { slug: 'dien', image: CATEGORY_IMAGES.electric },
  'Sửa điện': { slug: 'dien', image: CATEGORY_IMAGES.electric },
  Nước: { slug: 'nuoc', image: CATEGORY_IMAGES.water },
  'Điều hòa': { slug: 'dieuhoa', image: CATEGORY_IMAGES.ac },
  'Điện lạnh': { slug: 'dieuhoa', image: CATEGORY_IMAGES.ac },
  'Máy giặt': { slug: 'maygiat', image: CATEGORY_IMAGES.washingMachine },
  'Xe máy': { slug: 'xemay', image: CATEGORY_IMAGES.bikeCar },
  'Ô tô': { slug: 'xemay', image: CATEGORY_IMAGES.bikeCar },
  Mộc: { slug: 'moc', image: CATEGORY_IMAGES.furniture },
  'Nội thất': { slug: 'moc', image: CATEGORY_IMAGES.furniture },
  Sơn: { slug: 'son', image: CATEGORY_IMAGES.housePaintRenovate },
  'Vệ sinh': { slug: 'vesinh', image: CATEGORY_IMAGES.hygiene },
  'Thông tắc': { slug: 'thongtac', image: CATEGORY_IMAGES.toiletPump },
  'Bồn cầu': { slug: 'thongtac', image: CATEGORY_IMAGES.toiletPump },
};

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeSlide, setActiveSlide] = React.useState(0);
  const [currentCity, setCurrentCity] = React.useState('');
  const [currentLocationLoading, setCurrentLocationLoading] = React.useState(false);

  const { data: apiCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
  });

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ['unreadNotificationCount'],
    queryFn: getUnreadCount,
  });

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
      console.warn('[home] Unable to get current city', error);
      setCurrentCity('');
    } finally {
      setCurrentLocationLoading(false);
    }
  }, []);

  React.useEffect(() => {
    updateCurrentCity();
  }, [updateCurrentCity]);

  const locationLabel = currentLocationLoading
    ? 'Đang lấy vị trí...'
    : currentCity || 'Chưa xác định vị trí';

  const categories = React.useMemo(() => {
    if (apiCategories.length === 0) {
      return SERVICES;
    }

    return apiCategories.map((c): HomeService => {
      let uiInfo = { slug: c.id, image: CATEGORY_IMAGES.electric };
      for (const [key, value] of Object.entries(CATEGORIES_UI_MAP)) {
        if (c.name.toLowerCase().includes(key.toLowerCase())) {
          uiInfo = value;
          break;
        }
      }
      return {
        id: c.id,
        name: c.name,
        image: uiInfo.image,
        imageUrl: c.imageUrl,
      };
    });
  }, [apiCategories]);

  const displayedCategories = React.useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery);
    if (!normalizedQuery) return categories;

    return categories.filter((service) =>
      normalizeSearchText(service.name).includes(normalizedQuery)
    );
  }, [categories, searchQuery]);

  const handleServicePress = (serviceId: string, serviceName: string) => {
    router.push({
      pathname: '/service-workers',
      params: {
        serviceId,
        serviceName,
      },
    } as any);
  };

  const handleNotificationPress = () => {
    router.push('/(customer)/notifications' as any);
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable
          style={styles.locationContainer}
          onPress={updateCurrentCity}
          disabled={currentLocationLoading}>
          <MaterialIcons name="location-on" size={24} color="#FF8228" />
          <Text style={styles.locationText} numberOfLines={1}>
            {locationLabel}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={20} color="#1B1C1C" />
        </Pressable>

        <Pressable style={styles.notificationBtn} onPress={handleNotificationPress}>
          <MaterialIcons name="notifications-none" size={26} color="#1B1C1C" />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search & Filter */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={22} color="#818A91" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm danh mục dịch vụ..."
              placeholderTextColor="#9A9A9A"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Hero Promotional Banner */}
        <View style={styles.bannerContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={BANNER_WIDTH}
            snapToAlignment="start"
            onMomentumScrollEnd={(event) => {
              const slideIndex = Math.round(event.nativeEvent.contentOffset.x / BANNER_WIDTH);
              setActiveSlide(Math.max(0, Math.min(slideIndex, BANNER_SLIDES.length - 1)));
            }}>
            {BANNER_SLIDES.map((slide) => (
              <Pressable
                key={slide.id}
                style={styles.bannerSlide}
                onPress={() => Alert.alert('Đặt ngay', 'Hãy chọn một danh mục dịch vụ bên dưới.')}>
                <Image source={slide.source} style={styles.bannerImage} resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.carouselDots}>
            {BANNER_SLIDES.map((slide, index) => (
              <View
                key={slide.id}
                style={[styles.carouselDot, activeSlide === index && styles.carouselDotActive]}
              />
            ))}
          </View>
        </View>

        {/* Service Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Danh mục dịch vụ</Text>
          <Pressable onPress={() => Alert.alert('Danh mục', 'Danh mục dịch vụ đầy đủ.')}>
            <Text style={styles.sectionLink}>Xem tất cả</Text>
          </Pressable>
        </View>

        <View style={styles.serviceGrid}>
          {displayedCategories.map((service) => (
            <Pressable
              key={service.id}
              style={styles.serviceItem}
              onPress={() => handleServicePress(service.id, service.name)}>
              <View style={styles.serviceIconFrame}>
                {service.imageUrl ? (
                  <Image
                    source={{ uri: service.imageUrl }}
                    style={styles.serviceIconImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Image
                    source={service.image}
                    style={styles.serviceIconImage}
                    resizeMode="contain"
                  />
                )}
              </View>
              <Text style={styles.serviceLabel} numberOfLines={2}>
                {service.name}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Featured Craftsmen */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Thợ nổi bật</Text>
          <Pressable onPress={() => Alert.alert('Thợ nổi bật', 'Danh sách thợ nổi bật.')}>
            <Text style={styles.sectionLink}>Xem tất cả</Text>
          </Pressable>
        </View>

        <View style={styles.craftsmenList}>
          {FEATURED_CRAFTSMEN.map((craftsman) => (
            <View key={craftsman.id} style={styles.craftsmanCard}>
              <View style={styles.craftsmanAvatarContainer}>
                <View style={styles.craftsmanAvatarPlaceholder}>
                  <MaterialIcons name="person" size={32} color="#818A91" />
                </View>
                <View style={styles.onlineDot} />
              </View>

              <View style={styles.craftsmanDetails}>
                <View style={styles.craftsmanNameRow}>
                  <Text style={styles.craftsmanName}>{craftsman.name}</Text>
                  {craftsman.isPro && (
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                  )}
                </View>

                <View style={styles.craftsmanRatingRow}>
                  <MaterialIcons name="star" size={16} color="#FFB020" />
                  <Text style={styles.craftsmanRatingText}>{craftsman.rating}</Text>
                  <Text style={styles.craftsmanMutedText}>({craftsman.reviews} đánh giá)</Text>
                  <Text style={styles.dividerDot}>•</Text>
                  <Text style={styles.craftsmanMutedText}>{craftsman.completed} đơn</Text>
                </View>

                <View style={styles.craftsmanDistanceRow}>
                  <MaterialIcons name="location-on" size={14} color="#818A91" />
                  <Text style={styles.craftsmanDistanceText}>{craftsman.distance}</Text>
                  <Text style={styles.craftsmanPriceText}>{craftsman.price}</Text>
                </View>
              </View>

              <Pressable
                style={styles.bookCraftsmanBtn}
                onPress={() => Alert.alert('Đặt thợ', `Đang kết nối với thợ ${craftsman.name}...`)}>
                <MaterialIcons name="chevron-right" size={24} color="#FF8228" />
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation Tab Bar */}
      <BottomTabBar activeTab="home" />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#DDDDDD',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#fbf9f8',
  },
  locationText: {
    color: '#1B1C1C',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
  },
  notificationBtn: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EA4335',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
  bannerContainer: {
    marginBottom: 28,
  },
  bannerSlide: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerGradient: {
    borderRadius: 16,
    height: 130,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  bannerCircleAccent: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  bannerCircleAccent2: {
    position: 'absolute',
    right: 20,
    bottom: -60,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  bannerLeft: {
    flex: 1.2,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  bannerTitle: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    marginBottom: 4,
  },
  bannerSubtitle: {
    color: '#FFE6D5',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    marginBottom: 12,
  },
  bannerCta: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  bannerCtaText: {
    color: '#F45100',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
  },
  bannerRight: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  craftsmanIllust: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeSparkle: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F45100',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  carouselDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D4D4D4',
  },
  carouselDotActive: {
    width: 16,
    backgroundColor: '#FF8228',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#383838',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
  },
  sectionLink: {
    color: '#FF8228',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  serviceItem: {
    width: (SCREEN_WIDTH - 32 - 36) / 4, // 4 items per row accounting for grid gaps
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceIconFrame: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  serviceIconImage: {
    width: 68,
    height: 68,
  },
  serviceLabel: {
    color: '#4A4A4A',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  craftsmenList: {
    gap: 12,
  },
  craftsmanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  craftsmanAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  craftsmanAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFE6D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#39B54A',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  craftsmanDetails: {
    flex: 1,
  },
  craftsmanNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  craftsmanName: {
    color: '#383838',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
  },
  proBadge: {
    backgroundColor: '#E7F8FC',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  proBadgeText: {
    color: '#01677d',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 9,
  },
  craftsmanRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  craftsmanRatingText: {
    color: '#1B1C1C',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
  },
  craftsmanMutedText: {
    color: '#818A91',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
  },
  dividerDot: {
    color: '#D4D4D4',
    fontSize: 12,
  },
  craftsmanDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  craftsmanDistanceText: {
    color: '#818A91',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    flex: 1,
  },
  craftsmanPriceText: {
    color: '#FF8228',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
  },
  bookCraftsmanBtn: {
    padding: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#EAE5E3',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
    paddingHorizontal: 12,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  activeIconIndicator: {
    width: 64,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE6D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveIconIndicator: {
    width: 64,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#818A91',
    marginTop: 4,
  },
  activeTabText: {
    color: '#622a00',
    fontFamily: 'Montserrat_700Bold',
  },
});
