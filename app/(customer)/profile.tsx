import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
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
  const [selectedLanguage, setSelectedLanguage] = React.useState('Tiếng Việt');

  useFocusEffect(
    React.useCallback(() => {
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
        } catch {
          // Offline fallback
        } finally {
          setLoading(false);
        }
      }

      fetchProfile();
    }, [isAuthenticated])
  );

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
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Tài khoản</Text>
        <Pressable
          style={styles.headerButton}
          onPress={() => router.push('/(customer)/support-tickets' as any)}>
          <MaterialIcons name="headset-mic" size={22} color="#0F382C" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0F382C" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}>
          {/* User Profile Header */}
          <View style={styles.userHeaderCard}>
            <View style={styles.avatarWrapper}>
              <Image
                source={{
                  uri:
                    profile?.avatarUrl ??
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                }}
                style={styles.avatarImage}
              />
              <Pressable
                style={styles.cameraBadge}
                onPress={() => router.push('/(customer)/profile-info' as any)}>
                <MaterialIcons name="photo-camera" size={14} color="#ffffff" />
              </Pressable>
            </View>

            <View style={styles.userMeta}>
              <Text style={styles.userNameText}>{profile?.fullName || 'Tấn Đại'}</Text>
              <Text style={styles.userPhoneText}>{profile?.phone || target || '09xxxxxxxx'}</Text>
            </View>
          </View>

          {/* VIP Membership Banner Card */}
          <View style={styles.vipBannerCard}>
            <View style={styles.vipLeft}>
              <View style={styles.crownCircle}>
                <MaterialIcons name="workspace-premium" size={22} color="#D4AF37" />
              </View>
              <View>
                <Text style={styles.vipTitleText}>Đăng ký trở thành hội viên</Text>
                <Text style={styles.vipSubtitleText}>Nhận voucher 20% & Ưu tiên xếp lịch KTV</Text>
              </View>
            </View>
            <View style={styles.vipPillBadge}>
              <Text style={styles.vipPillText}>VIP</Text>
            </View>
          </View>

          {/* Dual Action Cards Matching Spec 4.10 */}
          <View style={styles.dualCardsRow}>
            <Pressable
              style={styles.actionCard}
              onPress={() => router.push('/(worker)/worker-setup' as any)}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#E6F0EB' }]}>
                <MaterialIcons name="handshake" size={22} color="#0F382C" />
              </View>
              <Text style={styles.actionCardTitle}>Trở thành</Text>
              <Text style={styles.actionCardSub}>Đối tác Fixy</Text>
            </Pressable>

            <Pressable
              style={styles.actionCard}
              onPress={() => Alert.alert('Giới thiệu bạn bè', 'Chia sẻ mã giới thiệu của bạn để cả 2 nhận ngay Voucher 50k!')}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <MaterialIcons name="card-giftcard" size={22} color="#D97706" />
              </View>
              <Text style={styles.actionCardTitle}>Giới thiệu</Text>
              <Text style={styles.actionCardSub}>bạn bè 🎁</Text>
            </Pressable>
          </View>

          {/* Menu Items Group Matching Spec 4.10 */}
          <View style={styles.menuGroupCard}>
            <Pressable
              style={styles.menuItemRow}
              onPress={() => router.push('/(customer)/orders' as any)}>
              <View style={styles.menuLeft}>
                <MaterialIcons name="assignment" size={22} color="#0F382C" />
                <Text style={styles.menuItemText}>Lịch sử hoạt động</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#818A91" />
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              style={styles.menuItemRow}
              onPress={() => router.push('/(customer)/profile-info' as any)}>
              <View style={styles.menuLeft}>
                <MaterialIcons name="person-outline" size={22} color="#0F382C" />
                <Text style={styles.menuItemText}>Thông tin cá nhân</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#818A91" />
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              style={styles.menuItemRow}
              onPress={() =>
                Alert.alert('Ngôn ngữ', 'Chọn ngôn ngữ hiển thị ứng dụng', [
                  { text: 'Tiếng Việt', onPress: () => setSelectedLanguage('Tiếng Việt') },
                  { text: 'English', onPress: () => setSelectedLanguage('English') },
                  { text: '한국어', onPress: () => setSelectedLanguage('한국어') },
                ])
              }>
              <View style={styles.menuLeft}>
                <MaterialIcons name="language" size={22} color="#0F382C" />
                <Text style={styles.menuItemText}>Ngôn ngữ</Text>
              </View>
              <View style={styles.menuRightValue}>
                <Text style={styles.valueText}>{selectedLanguage}</Text>
                <MaterialIcons name="chevron-right" size={22} color="#818A91" />
              </View>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable style={styles.menuItemRow} onPress={() => Alert.alert('Quốc gia', 'Khu vực hiện tại: Vietnam 🇻🇳')}>
              <View style={styles.menuLeft}>
                <MaterialIcons name="public" size={22} color="#0F382C" />
                <Text style={styles.menuItemText}>Quốc gia</Text>
              </View>
              <View style={styles.menuRightValue}>
                <Text style={styles.valueText}>🇻🇳 Vietnam</Text>
                <MaterialIcons name="chevron-right" size={22} color="#818A91" />
              </View>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              style={styles.menuItemRow}
              onPress={() => Alert.alert('Về Fixy', 'FIXY – SPA TẠI NHÀ\nNền tảng kết nối Kỹ thuật viên Spa & Khách hàng.\nPhiên bản 1.0 (2026)')}>
              <View style={styles.menuLeft}>
                <MaterialIcons name="info-outline" size={22} color="#0F382C" />
                <Text style={styles.menuItemText}>Về chúng tôi</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#818A91" />
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable style={styles.menuItemRow} onPress={handleLogout}>
              <View style={styles.menuLeft}>
                <MaterialIcons name="logout" size={22} color="#DC2626" />
                <Text style={[styles.menuItemText, { color: '#DC2626' }]}>Đăng xuất</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#818A91" />
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* Logout Confirmation Modal */}
      <Modal visible={logoutConfirmOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.logoutModal}>
            <Text style={styles.logoutModalTitle}>Xác nhận đăng xuất</Text>
            <Text style={styles.logoutModalBody}>Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?</Text>
            <View style={styles.logoutModalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setLogoutConfirmOpen(false)}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </Pressable>
              <Pressable style={styles.confirmLogoutBtn} onPress={confirmLogout}>
                <Text style={styles.confirmLogoutBtnText}>Đăng xuất</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation Tab Bar */}
      <BottomTabBar activeTab="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FBF9F5',
  },
  header: {
    height: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#EFECE6',
  },
  headerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#1C2526',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F4F1EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  userHeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  userMeta: {
    flex: 1,
  },
  userNameText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#1C2526',
  },
  userPhoneText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  vipBannerCard: {
    backgroundColor: '#1C2526',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  vipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  crownCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipTitleText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#ffffff',
  },
  vipSubtitleText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#D4AF37',
    marginTop: 2,
  },
  vipPillBadge: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vipPillText: {
    color: '#1C2526',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
  },
  dualCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionCardTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#1C2526',
  },
  actionCardSub: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  menuGroupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    color: '#1C2526',
  },
  menuRightValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: '#6B7280',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#EFECE6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoutModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
  },
  logoutModalTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#1C2526',
    marginBottom: 8,
  },
  logoutModalBody: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  logoutModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F4F1EA',
  },
  cancelBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#4B5563',
  },
  confirmLogoutBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#DC2626',
  },
  confirmLogoutBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#ffffff',
  },
});
