import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import * as React from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/layout/bottom-tab-bar';
import { fetchCategories } from '@/services/api/categories';
import { getUnreadCount } from '@/services/api/notifications';
import { searchWorkers, WorkerProfile } from '@/services/api/workers';
import { CitySelectorModal } from '@/components/city-selector-modal';
import { useLocationStore } from '@/store/store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SPA_BANNER_CARDS = [
  {
    id: 'health',
    title: 'Sức khoẻ tại nhà',
    subtitle: 'Lấy ráy tai, massage & trị liệu',
    category: 'suc-khoe',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'beauty',
    title: 'Làm đẹp tại nhà',
    subtitle: 'Nails,wax, tẩy tế bào chết',
    category: 'lam-dep',
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'store',
    title: 'Địa điểm spa',
    subtitle: 'Ưu đãi giờ thấp điểm',
    tag: '📍 Tại cửa hàng',
    subtag: 'Trải nghiệm dịch vụ\ntrực tiếp tại cửa hàng',
    category: 'dia-diem-spa',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80',
  },
];

const FEATURED_TECHNICIANS = [
  {
    id: 'kim-hang',
    name: 'Kim Hằng',
    badge: 'Chất lượng',
    badgeColor: '#E68A2E',
    rating: 4.9,
    reviews: 135,
    distance: '100m',
    availableTime: 'Sớm nhất 12:00',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    specialty: 'Massage Dầu, Thái, Trị liệu cổ vai gáy',
  },
  {
    id: 'thanh-tran',
    name: 'Thanh Trần',
    badge: 'Mới đến',
    badgeColor: '#4A90E2',
    rating: 5.0,
    reviews: 2,
    distance: '1 km',
    availableTime: 'Sớm nhất 12:00',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
    specialty: 'Chăm sóc da mặt, Masa mặt',
  },
  {
    id: 'lyly',
    name: 'Lyly',
    badge: 'Mới cập nhật',
    badgeColor: '#E05297',
    rating: 5.0,
    reviews: 667,
    distance: '1 km',
    availableTime: 'Sớm nhất 12:00',
    avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=300&q=80',
    specialty: 'Nails, Wax lông, Tẩy tế bào chết',
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { selectedCity } = useLocationStore();
  const [cityModalVisible, setCityModalVisible] = React.useState(false);
  const [currentCity, setCurrentCity] = React.useState('');
  const [currentLocationLoading, setCurrentLocationLoading] = React.useState(false);

  const [userLocation, setUserLocation] = React.useState<{ lat: number; lng: number } | null>(null);

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
        console.warn('[home] GPS location error:', err);
      }
    })();
  }, []);

  const { data: apiCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
  });

  const { data: apiWorkers = [] } = useQuery<WorkerProfile[]>({
    queryKey: ['homeWorkers', selectedCity, userLocation?.lat, userLocation?.lng],
    queryFn: () =>
      searchWorkers({
        City: selectedCity,
        CustomerLat: userLocation?.lat,
        CustomerLng: userLocation?.lng,
        MinRating: 4.0,
        PageSize: 20,
      }),
  });

  // Sort featured workers: High Rating (4.5+) -> High Reviews Count -> Closest Distance
  const featuredWorkers = React.useMemo(() => {
    if (!apiWorkers || apiWorkers.length === 0) return [];
    return [...apiWorkers].sort((a, b) => {
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (Math.abs(ratingDiff) > 0.1) return ratingDiff;
      return (b.reviewsCount || 0) - (a.reviewsCount || 0);
    });
  }, [apiWorkers]);

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

  const locationLabel = currentCity ? currentCity : 'Đà Nẵng';

  const handleCategoryPress = (categoryId: string, categoryName: string) => {
    router.push({
      pathname: '/(customer)/service-workers',
      params: {
        serviceId: categoryId,
        serviceName: categoryName,
      },
    } as any);
  };

  const handleNotificationPress = () => {
    router.push('/(customer)/notifications' as any);
  };

  return (
    <View style={styles.screen}>
      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable
          style={styles.locationContainer}
          onPress={() => setCityModalVisible(true)}>
          <MaterialIcons name="location-on" size={16} color="#0F382C" />
          <Text style={styles.locationText} numberOfLines={1}>
            {selectedCity}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={16} color="#0F382C" />
        </Pressable>

        <View style={styles.headerRightActions}>
          <Pressable
            style={styles.headerIconBtn}
            onPress={() => router.push('/(booking)/chat-list' as any)}>
            <MaterialIcons name="chat-bubble-outline" size={18} color="#0F382C" />
          </Pressable>
          <Pressable style={styles.headerIconBtn} onPress={handleNotificationPress}>
            <MaterialIcons name="notifications-none" size={20} color="#0F382C" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Service Banner Cards */}
        <View style={styles.bannerCardsContainer}>
          {SPA_BANNER_CARDS.map((card) => (
            <Pressable
              key={card.id}
              style={styles.spaBannerCard}
              onPress={() => handleCategoryPress(card.category, card.title)}>
              {/* Full Background Image */}
              <Image source={{ uri: card.image }} style={styles.bannerCardBgImage} />

              {/* Warm Earth Brown Spa Gradient Overlay */}
              <LinearGradient
                colors={[
                  'rgba(148, 88, 36, 0.97)',
                  'rgba(148, 88, 36, 0.90)',
                  'rgba(148, 88, 36, 0.65)',
                  'rgba(148, 88, 36, 0.15)',
                  'rgba(148, 88, 36, 0.0)',
                ]}
                locations={[0, 0.35, 0.6, 0.85, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFillObject}
              />

              {/* Card Content Layer */}
              <View style={styles.bannerCardInner}>
                <View style={styles.bannerCardTextContent}>
                  <Text style={styles.bannerCardTitle}>{card.title}</Text>
                  <Text style={styles.bannerCardSubtitle}>{card.subtitle}</Text>
                </View>

                <View style={styles.bannerCardBottomRow}>
                  <View style={styles.arrowCircleBtnGlass}>
                    <MaterialIcons name="arrow-forward" size={22} color="#ffffff" />
                  </View>

                  {card.tag && (
                    <View style={styles.bannerStoreTagContainer}>
                      <View style={styles.bannerStoreTagPill}>
                        <Text style={styles.bannerStoreTagTitle}>{card.tag}</Text>
                      </View>
                      {card.subtag && (
                        <Text style={styles.bannerStoreTagSubtext}>{card.subtag}</Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Featured Technicians */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Kỹ thuật viên nổi bật</Text>
          <Pressable onPress={() => router.push('/(customer)/service-workers' as any)}>
            <Text style={styles.sectionLink}>Xem tất cả</Text>
          </Pressable>
        </View>

        <View style={styles.technicianList}>
          {(featuredWorkers.length > 0
            ? featuredWorkers
            : FEATURED_TECHNICIANS.map((f, idx) => ({
                id: f.id,
                workerProfileId: f.id,
                fullName: f.name,
                avatarUrl: f.avatar,
                rating: f.rating,
                reviewsCount: f.reviews,
                distance: f.distance,
                badge: idx % 3,
                estimatedArrivalMinutes: 20,
              }))
          ).map((item: any) => {
            const BADGE_CONFIG: Record<number, { text: string; color: string }> = {
              0: { text: 'Mới đến', color: '#4A90E2' },
              1: { text: 'Mới cập nhật', color: '#E05297' },
              2: { text: 'Chất lượng', color: '#E68A2E' },
              3: { text: 'Vàng', color: '#D4AF37' },
            };

            const badgeNum = typeof item.badge === 'number' ? item.badge : 0;
            const badge = BADGE_CONFIG[badgeNum] || BADGE_CONFIG[0];
            const arrivalLabel =
              item.estimatedArrivalMinutes != null
                ? `Dự kiến ${item.estimatedArrivalMinutes} phút`
                : (item.isOnline ? 'Đặt ngay' : (item.availableTime || 'Sớm nhất 12:00'));

            const workerTargetId = item.workerProfileId || item.id;
            const avatarUri = item.avatarUrl || item.avatar;

            return (
              <Pressable
                key={item.id || workerTargetId}
                style={styles.ktvCard}
                onPress={() => router.push(`/(customer)/worker-detail?id=${workerTargetId}` as any)}>
                <View style={styles.ktvAvatarWrapper}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.ktvAvatar} />
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
                  <Text style={styles.ktvName} numberOfLines={1}>
                    {item.fullName || item.name}
                  </Text>

                  <View style={styles.ratingDistanceRow}>
                    <MaterialIcons name="star" size={16} color="#F59E0B" />
                    <Text style={styles.ratingText}>
                      {item.rating > 0 ? (typeof item.rating === 'number' ? item.rating.toFixed(1) : item.rating) : '5.0'}
                    </Text>
                    <Text style={styles.reviewsText}>({item.reviewsCount ?? item.reviews ?? 0} đánh giá)</Text>
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
          })}
        </View>
      </ScrollView>

      {/* Bottom Navigation Tab Bar */}
      <BottomTabBar activeTab="home" />

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#EFECE6',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: '#F4F1EA',
  },
  locationText: {
    color: '#0F382C',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    maxWidth: 140,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconBtn: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: '#F4F1EA',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#DC2626',
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
    paddingBottom: 100,
  },

  bannerCardsContainer: {
    gap: 18,
    marginBottom: 26,
  },
  spaBannerCard: {
    height: 220,
    borderRadius: 26,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#73411B',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  bannerCardBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerCardInner: {
    flex: 1,
    padding: 22,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  bannerCardTextContent: {
    maxWidth: '65%',
  },
  bannerCardTitle: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 6,
  },
  bannerCardSubtitle: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  bannerCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
  },
  arrowCircleBtnGlass: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerStoreTagContainer: {
    marginLeft: 4,
    marginBottom: 2,
  },
  bannerStoreTagPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bannerStoreTagTitle: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
  },
  bannerStoreTagSubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 3,
    lineHeight: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#0F382C',
  },
  sectionLink: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#D4AF37',
  },
  technicianList: {
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
    marginVertical: 4,
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
});
