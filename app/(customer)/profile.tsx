import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BottomTabBar } from '@/components/layout/bottom-tab-bar';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getUserProfile, UserProfile } from '@/services/api/user';
import { useAuthStore } from '@/store/store';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((state) => state.logout);
  const target = useAuthStore((state) => state.target);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // Redirect to login if not authenticated, otherwise fetch profile
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login' as any);
      return;
    }

    async function fetchProfile() {
      try {
        const response = await getUserProfile();
        if (response.isSuccess) {
          setProfile(response.data);
        }
      } catch (error) {
        // Fallback to offline defaults
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [isAuthenticated]);



  function handleLogout() {
    setLogoutConfirmOpen(true);
  }

  async function confirmLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      setLogoutConfirmOpen(false);
      router.replace('/login' as any);
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <View style={styles.screen}>
      {/* TopAppBar */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Tài khoản</Text>
        <Pressable
          style={styles.headerButton}
          onPress={() => router.push('/(customer)/support-tickets' as any)}>
          <MaterialIcons name="help-outline" size={24} color="#9a4600" />
        </Pressable>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#FF8228" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 90 }, // Extra padding to avoid overlaying BottomNavBar
          ]}
          showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri:
                  profile?.avatarUrl ??
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuDopKrdEjn_YIPe8wWQUvOUP7Fg0rVJLe61nRSrAXfNowRvy_vcW1xwzyluNv_w-T1BTrTrQv9d3gFxIzlmfjybmiS8bZWbKxlqYHDKTC2SPQOOjLcvHtIdVtd-l4DkJ7HY4XyrGOQrl-a_WsMGYAQvdiNvcQ49Dz1ARPV3zT-thTZ012QOjHR9VSqie_b_W18k6NN0JhSH8SALrpDcA8xe0OI5Jxat8pY80opLG5-Ues6SaX4L53e-JIZkZdDu5L8Vb7bBrPhZ__g',
              }}
              style={styles.avatar}
              resizeMode="cover"
            />
            <Pressable
              style={styles.editAvatarButton}
              onPress={() => Alert.alert('Đổi ảnh đại diện', 'Tính năng đang được phát triển.')}>
              <MaterialIcons name="edit" size={14} color="#FFFFFF" />
            </Pressable>
          </View>
          <Text style={styles.profileName}>{profile?.fullName ?? ''}</Text>
          <Text style={styles.profilePhone}>{profile?.phone ?? target ?? ''}</Text>
        </View>

        {/* Section 1: Account */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tài khoản</Text>
          <View style={styles.cardContent}>
            <Pressable
              style={styles.item}
              onPress={() => Alert.alert('Thông tin cá nhân', 'Tính năng đang phát triển')}>
              <View style={styles.itemLeft}>
                <MaterialIcons name="person" size={22} color="#ff8228" />
                <Text style={styles.itemText}>Thông tin cá nhân</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#574237" />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.item} onPress={() => router.push('/saved-addresses' as any)}>
              <View style={styles.itemLeft}>
                <MaterialIcons name="location-on" size={22} color="#ff8228" />
                <Text style={styles.itemText}>Địa chỉ đã lưu</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#574237" />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.item} onPress={() => router.push('/user-wallet' as any)}>
              <View style={styles.itemLeft}>
                <MaterialIcons name="account-balance-wallet" size={22} color="#ff8228" />
                <Text style={styles.itemText}>Ví của tôi</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#574237" />
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={styles.item}
              onPress={() => Alert.alert('Phương thức thanh toán', 'Tính năng đang phát triển')}>
              <View style={styles.itemLeft}>
                <MaterialIcons name="payment" size={22} color="#ff8228" />
                <Text style={styles.itemText}>Phương thức thanh toán</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#574237" />
            </Pressable>
          </View>
        </View>

        {/* Section 2: Activity */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hoạt động</Text>
          <View style={styles.cardContent}>
            <Pressable
              style={styles.item}
              onPress={() => Alert.alert('Lịch sử đặt chỗ', 'Tính năng đang phát triển')}>
              <View style={styles.itemLeft}>
                <MaterialIcons name="history" size={22} color="#ff8228" />
                <Text style={styles.itemText}>Lịch sử đặt chỗ</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#574237" />
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={styles.item}
              onPress={() => Alert.alert('Voucher của tôi', 'Tính năng đang phát triển')}>
              <View style={styles.itemLeft}>
                <MaterialIcons name="local-offer" size={22} color="#ff8228" />
                <Text style={styles.itemText}>Voucher của tôi</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#574237" />
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={styles.item}
              onPress={() => Alert.alert('Đánh giá của tôi', 'Tính năng đang phát triển')}>
              <View style={styles.itemLeft}>
                <MaterialIcons name="star-rate" size={22} color="#ff8228" />
                <Text style={styles.itemText}>Đánh giá của tôi</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#574237" />
            </Pressable>
          </View>
        </View>

        {/* Section 3: General */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Chung</Text>
          <View style={styles.cardContent}>
            <Pressable
              style={styles.item}
              onPress={() => Alert.alert('Cài đặt', 'Tính năng đang phát triển')}>
              <View style={styles.itemLeft}>
                <MaterialIcons name="settings" size={22} color="#ff8228" />
                <Text style={styles.itemText}>Cài đặt</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#574237" />
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={styles.item}
              onPress={() => router.push('/(customer)/support-tickets' as any)}>
              <View style={styles.itemLeft}>
                <MaterialIcons name="support-agent" size={22} color="#ff8228" />
                <Text style={styles.itemText}>Trung tâm trợ giúp</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#574237" />
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={styles.item}
              onPress={() => Alert.alert('Về Fixy', 'Phiên bản 1.0.0')}>
              <View style={styles.itemLeft}>
                <MaterialIcons name="info" size={22} color="#ff8228" />
                <Text style={styles.itemText}>Về Fixy</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#574237" />
            </Pressable>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color="#ba1a1a" />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </Pressable>
        </View>
        </ScrollView>
      )}

      {/* BottomNavBar */}
      <BottomTabBar activeTab="profile" />

      <Modal visible={logoutConfirmOpen} transparent animationType="fade">
        <View style={styles.centeredModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!isLoggingOut) setLogoutConfirmOpen(false);
            }}
          />
          <View style={styles.logoutConfirmContent}>
            <Text style={styles.logoutConfirmTitle}>Đăng xuất</Text>
            <Text style={styles.logoutConfirmText}>Bạn có chắc chắn muốn đăng xuất?</Text>
            <View style={styles.logoutConfirmActions}>
              <Pressable
                style={styles.logoutCancelButton}
                onPress={() => setLogoutConfirmOpen(false)}
                disabled={isLoggingOut}
              >
                <Text style={styles.logoutCancelText}>Hủy</Text>
              </Pressable>
              <Pressable
                style={[styles.logoutConfirmButton, isLoggingOut && styles.logoutConfirmButtonDisabled]}
                onPress={confirmLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.logoutConfirmButtonText}>Đăng xuất</Text>
                )}
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
    backgroundColor: '#FBF9F8',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#1b1c1c',
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  profileHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  avatarContainer: {
    position: 'relative',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#9a4600',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 8,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#9a4600',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 22,
    color: '#1b1c1c',
  },
  profilePhone: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#574237',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    marginVertical: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#1b1c1c',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cardContent: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    color: '#1b1c1c',
  },
  divider: {
    height: 1,
    backgroundColor: '#DDDDDD',
    marginHorizontal: 12,
  },
  logoutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ba1a1a',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    minHeight: 44,
  },
  logoutText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#ba1a1a',
  },
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoutConfirmContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  logoutConfirmTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#1b1c1c',
    marginBottom: 8,
  },
  logoutConfirmText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#574237',
    marginBottom: 20,
  },
  logoutConfirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  logoutCancelButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutCancelText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#574237',
  },
  logoutConfirmButton: {
    minHeight: 44,
    minWidth: 120,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#ba1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutConfirmButtonDisabled: {
    opacity: 0.65,
  },
  logoutConfirmButtonText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#ffffff',
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
    backgroundColor: '#FFE6D5', // primary-container
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
