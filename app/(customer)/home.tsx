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

const SPA_BANNER_CARDS = [
  {
    id: 'health',
    title: 'Sức khoẻ tại nhà',
    subtitle: 'Lấy ráy tai, massage & trị liệu',
    bgGradient: ['#D98A2B', '#B8721D'],
    icon: 'spa',
    category: 'suc-khoe',
    badge: 'Phổ biến nhất',
  },
  {
    id: 'beauty',
    title: 'Làm đẹp tại nhà',
    subtitle: 'Nails, wax, tẩy tế bào chết, skincare',
    bgGradient: ['#3D5E3E', '#2A432B'],
    icon: 'face',
    category: 'lam-dep',
    badge: 'Ưu đãi 20%',
  },
  {
    id: 'store',
    title: 'Địa điểm spa',
    subtitle: 'Ưu đãi giờ thấp điểm tại cửa hàng spa đối tác',
    tag: '📍 Tại cửa hàng - Trải nghiệm dịch vụ trực tiếp',
    bgGradient: ['#2C3E35', '#192620'],
    icon: 'storefront',
    category: 'dia-diem-spa',
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
  const [searchQuery, setSearchQuery] = React.useState('');
  const [currentCity, setCurrentCity] = React.useState('');
  const [currentLocationLoading, setCurrentLocationLoading] = React.useState(false);
  const [supportVisible, setSupportVisible] = React.useState(true);

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
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable
          style={styles.locationContainer}
          onPress={updateCurrentCity}
          disabled={currentLocationLoading}>
          <View style={styles.locationBadge}>
            <MaterialIcons name="person-pin-circle" size={20} color="#0F382C" />
          </View>
          <Text style={styles.locationText} numberOfLines={1}>
            {locationLabel}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={20} color="#0F382C" />
        </Pressable>

        <View style={styles.headerRightActions}>
          <Pressable style={styles.headerIconBtn} onPress={() => router.push('/(booking)/booking-chat' as any)}>
            <MaterialIcons name="chat-bubble-outline" size={22} color="#0F382C" />
          </Pressable>
          <Pressable style={styles.headerIconBtn} onPress={handleNotificationPress}>
            <MaterialIcons name="notifications-none" size={24} color="#0F382C" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={22} color="#818A91" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm dịch vụ spa, kỹ thuật viên..."
            placeholderTextColor="#9A9A9A"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* GlowCare Fixy Guarantee Strip */}
        <View style={styles.glowCareStrip}>
          <View style={styles.glowCareHeader}>
            <MaterialIcons name="verified-user" size={18} color="#0F382C" />
            <Text style={styles.glowCareTitle}>Cam kết Fixy Care</Text>
          </View>
          <View style={styles.glowCareBadges}>
            <View style={styles.glowBadgeItem}>
              <MaterialIcons name="check-circle" size={14} color="#0F382C" />
              <Text style={styles.glowBadgeText}>Không tiền tip</Text>
            </View>
            <View style={styles.glowBadgeItem}>
              <MaterialIcons name="check-circle" size={14} color="#0F382C" />
              <Text style={styles.glowBadgeText}>Không phí di chuyển</Text>
            </View>
            <View style={styles.glowBadgeItem}>
              <MaterialIcons name="check-circle" size={14} color="#0F382C" />
              <Text style={styles.glowBadgeText}>100% Lành mạnh</Text>
            </View>
          </View>
        </View>

        {/* Main Service Banner Cards (Luxury Cards matching Spa Theme) */}
        <View style={styles.bannerCardsContainer}>
          {SPA_BANNER_CARDS.map((card) => (
            <Pressable
              key={card.id}
              style={[
                styles.spaBannerCard,
                card.id === 'health' && { backgroundColor: '#D98A2B' },
                card.id === 'beauty' && { backgroundColor: '#3D5E3E' },
                card.id === 'store' && { backgroundColor: '#2C3E35' },
              ]}
              onPress={() => handleCategoryPress(card.category, card.title)}>
              <View style={styles.bannerCardContent}>
                {card.badge && (
                  <View style={styles.bannerBadgePill}>
                    <Text style={styles.bannerBadgeText}>{card.badge}</Text>
                  </View>
                )}
                <Text style={styles.bannerCardTitle}>{card.title}</Text>
                <Text style={styles.bannerCardSubtitle}>{card.subtitle}</Text>
                {card.tag && (
                  <View style={styles.bannerTagPill}>
                    <Text style={styles.bannerTagText}>{card.tag}</Text>
                  </View>
                )}
              </View>
              <View style={styles.bannerCardAction}>
                <View style={styles.arrowCircleBtn}>
                  <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />
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
          {FEATURED_TECHNICIANS.map((ktv) => (
            <Pressable
              key={ktv.id}
              style={styles.technicianCard}
              onPress={() => router.push(`/(customer)/worker-detail?id=${ktv.id}` as any)}>
              <View style={styles.technicianAvatarWrapper}>
                <Image source={{ uri: ktv.avatar }} style={styles.technicianAvatar} />
                <View style={[styles.statusBadge, { backgroundColor: ktv.badgeColor }]}>
                  <Text style={styles.statusBadgeText}>{ktv.badge}</Text>
                </View>
              </View>

              <View style={styles.technicianInfo}>
                <View style={styles.technicianHeaderRow}>
                  <Text style={styles.technicianName}>{ktv.name}</Text>
                  <Text style={styles.availabilityTime}>{ktv.availableTime}</Text>
                </View>
                <Text style={styles.specialtyText} numberOfLines={1}>{ktv.specialty}</Text>

                <View style={styles.ratingDistanceRow}>
                  <MaterialIcons name="star" size={16} color="#D4AF37" />
                  <Text style={styles.ratingScore}>{ktv.rating}</Text>
                  <Text style={styles.reviewCount}>({ktv.reviews} đánh giá)</Text>
                  <Text style={styles.dotDivider}>•</Text>
                  <MaterialIcons name="location-on" size={14} color="#818A91" />
                  <Text style={styles.distanceText}>{ktv.distance}</Text>
                </View>
              </View>

              <View style={styles.bookBtnWrapper}>
                <Pressable
                  style={styles.bookBtn}
                  onPress={() => router.push(`/(customer)/worker-detail?id=${ktv.id}` as any)}>
                  <Text style={styles.bookBtnText}>Đặt</Text>
                </Pressable>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Floating Support Button */}
      {supportVisible && (
        <View style={styles.floatingSupportBtn}>
          <Pressable
            style={styles.supportContent}
            onPress={() => router.push('/(customer)/create-support-ticket' as any)}>
            <MaterialIcons name="headset-mic" size={20} color="#ffffff" />
            <Text style={styles.supportText}>Hỗ trợ</Text>
          </Pressable>
          <Pressable style={styles.closeSupportBtn} onPress={() => setSupportVisible(false)}>
            <MaterialIcons name="close" size={14} color="#ffffff" />
          </Pressable>
        </View>
      )}

      {/* Bottom Navigation Tab Bar */}
      <BottomTabBar activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FBF9F5',
  },
  header: {
    height: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#EFECE6',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#F4F1EA',
  },
  locationBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: {
    color: '#0F382C',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    height: 40,
    width: 40,
    borderRadius: 20,
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
    paddingBottom: 120,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2DEC3',
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 14,
    marginBottom: 14,
    shadowColor: '#0F382C',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#1C2526',
  },
  glowCareStrip: {
    backgroundColor: '#F2F7F2',
    borderWidth: 1,
    borderColor: '#C6DFC6',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  glowCareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  glowCareTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#0F382C',
  },
  glowCareBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glowBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  glowBadgeText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#0F382C',
  },
  bannerCardsContainer: {
    gap: 14,
    marginBottom: 20,
  },
  spaBannerCard: {
    borderRadius: 20,
    padding: 18,
    minHeight: 140,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  bannerCardContent: {
    flex: 1,
    paddingRight: 12,
  },
  bannerBadgePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  bannerBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
  },
  bannerCardTitle: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 20,
    marginBottom: 4,
  },
  bannerCardSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  bannerTagPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  bannerTagText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
  },
  bannerCardAction: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
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
  technicianCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
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
  technicianAvatarWrapper: {
    position: 'relative',
  },
  technicianAvatar: {
    width: 68,
    height: 68,
    borderRadius: 14,
  },
  statusBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Montserrat_700Bold',
  },
  technicianInfo: {
    flex: 1,
  },
  technicianHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  technicianName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#1C2526',
  },
  availabilityTime: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#818A91',
  },
  specialtyText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 6,
  },
  ratingDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingScore: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#1C2526',
  },
  reviewCount: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
  },
  dotDivider: {
    color: '#D1D5DB',
    fontSize: 12,
  },
  distanceText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
  },
  bookBtnWrapper: {
    justifyContent: 'center',
  },
  bookBtn: {
    backgroundColor: '#0F382C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bookBtnText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
  },
  floatingSupportBtn: {
    position: 'absolute',
    bottom: 84,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F382C',
    borderRadius: 24,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  supportContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 6,
  },
  supportText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
  },
  closeSupportBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
