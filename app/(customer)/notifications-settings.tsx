import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getNotificationSettings,
  updateNotificationSettings,
  NotificationSettings,
} from '@/services/api/notifications';

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<NotificationSettings>({
    queryKey: ['notificationSettings'],
    queryFn: getNotificationSettings,
  });

  const updateMutation = useMutation({
    mutationFn: (newSettings: Partial<NotificationSettings>) =>
      updateNotificationSettings(newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
    },
    onError: () => {
      Alert.alert('Lỗi', 'Không thể cập nhật cài đặt. Vui lòng thử lại.');
    },
  });

  const handleToggle = (key: keyof NotificationSettings, value: boolean) => {
    if (!settings) return;
    updateMutation.mutate({ [key]: value });
  };

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable style={styles.headerButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#1b1c1c" />
        </Pressable>
        <Text style={styles.headerTitle}>Cài đặt thông báo</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#FF8228" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Loại sự kiện nhận thông báo</Text>
            <Text style={styles.sectionSubtitle}>
              Chọn các sự kiện bạn muốn nhận cập nhật từ Fixy.
            </Text>
          </View>

          <View style={styles.card}>
            {/* New Booking */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingLabelRow}>
                  <MaterialIcons name="event-note" size={22} color="#FF8228" />
                  <Text style={styles.settingLabel}>Đơn đặt lịch mới</Text>
                </View>
                <Text style={styles.settingDescription}>
                  Cập nhật khi có đơn đặt lịch mới hoặc thợ nhận đơn.
                </Text>
              </View>
              <Switch
                value={settings?.newBooking ?? false}
                onValueChange={(val) => handleToggle('newBooking', val)}
                trackColor={{ false: '#dcd9d9', true: '#ffdbc9' }}
                thumbColor={(settings?.newBooking ?? false) ? '#FF8228' : '#8b7265'}
                disabled={updateMutation.isPending}
              />
            </View>

            <View style={styles.divider} />

            {/* Payment */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingLabelRow}>
                  <MaterialIcons name="payment" size={22} color="#FF8228" />
                  <Text style={styles.settingLabel}>Giao dịch & Thanh toán</Text>
                </View>
                <Text style={styles.settingDescription}>
                  Biên lai thanh toán, hoàn tiền và số dư ví.
                </Text>
              </View>
              <Switch
                value={settings?.payment ?? false}
                onValueChange={(val) => handleToggle('payment', val)}
                trackColor={{ false: '#dcd9d9', true: '#ffdbc9' }}
                thumbColor={(settings?.payment ?? false) ? '#FF8228' : '#8b7265'}
                disabled={updateMutation.isPending}
              />
            </View>

            <View style={styles.divider} />

            {/* Status Update */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingLabelRow}>
                  <MaterialIcons name="build" size={22} color="#FF8228" />
                  <Text style={styles.settingLabel}>Cập nhật tiến độ đơn</Text>
                </View>
                <Text style={styles.settingDescription}>
                  Nhận tin tức khi thợ di chuyển, đã đến nơi, đang làm việc.
                </Text>
              </View>
              <Switch
                value={settings?.statusUpdate ?? false}
                onValueChange={(val) => handleToggle('statusUpdate', val)}
                trackColor={{ false: '#dcd9d9', true: '#ffdbc9' }}
                thumbColor={(settings?.statusUpdate ?? false) ? '#FF8228' : '#8b7265'}
                disabled={updateMutation.isPending}
              />
            </View>

            <View style={styles.divider} />

            {/* Promotions */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingLabelRow}>
                  <MaterialIcons name="local-offer" size={22} color="#FF8228" />
                  <Text style={styles.settingLabel}>Khuyến mãi & Tin tức</Text>
                </View>
                <Text style={styles.settingDescription}>
                  Các chương trình ưu đãi, giảm giá và cập nhật ứng dụng.
                </Text>
              </View>
              <Switch
                value={settings?.promotions ?? false}
                onValueChange={(val) => handleToggle('promotions', val)}
                trackColor={{ false: '#dcd9d9', true: '#ffdbc9' }}
                thumbColor={(settings?.promotions ?? false) ? '#FF8228' : '#8b7265'}
                disabled={updateMutation.isPending}
              />
            </View>
          </View>

          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>Kênh nhận thông báo</Text>
            <Text style={styles.sectionSubtitle}>
              Chọn cách bạn muốn nhận các bản cập nhật trên.
            </Text>
          </View>

          <View style={styles.card}>
            {/* viaPush */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingLabelRow}>
                  <MaterialIcons name="notifications-active" size={22} color="#FF8228" />
                  <Text style={styles.settingLabel}>Thông báo đẩy (App Push)</Text>
                </View>
                <Text style={styles.settingDescription}>
                  Hiển thị thông báo trên màn hình điện thoại.
                </Text>
              </View>
              <Switch
                value={settings?.viaPush ?? false}
                onValueChange={(val) => handleToggle('viaPush', val)}
                trackColor={{ false: '#dcd9d9', true: '#ffdbc9' }}
                thumbColor={(settings?.viaPush ?? false) ? '#FF8228' : '#8b7265'}
                disabled={updateMutation.isPending}
              />
            </View>

            <View style={styles.divider} />

            {/* viaInApp */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingLabelRow}>
                  <MaterialIcons name="phone-android" size={22} color="#FF8228" />
                  <Text style={styles.settingLabel}>Trong ứng dụng (In-app)</Text>
                </View>
                <Text style={styles.settingDescription}>
                  Lưu trữ trong hộp thư thông báo của tài khoản.
                </Text>
              </View>
              <Switch
                value={settings?.viaInApp ?? false}
                onValueChange={(val) => handleToggle('viaInApp', val)}
                trackColor={{ false: '#dcd9d9', true: '#ffdbc9' }}
                thumbColor={(settings?.viaInApp ?? false) ? '#FF8228' : '#8b7265'}
                disabled={updateMutation.isPending}
              />
            </View>

            <View style={styles.divider} />

            {/* viaEmail */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingLabelRow}>
                  <MaterialIcons name="mail-outline" size={22} color="#FF8228" />
                  <Text style={styles.settingLabel}>Thư điện tử (Email)</Text>
                </View>
                <Text style={styles.settingDescription}>
                  Gửi cập nhật quan trọng qua hòm thư điện tử.
                </Text>
              </View>
              <Switch
                value={settings?.viaEmail ?? false}
                onValueChange={(val) => handleToggle('viaEmail', val)}
                trackColor={{ false: '#dcd9d9', true: '#ffdbc9' }}
                thumbColor={(settings?.viaEmail ?? false) ? '#FF8228' : '#8b7265'}
                disabled={updateMutation.isPending}
              />
            </View>

            <View style={styles.divider} />

            {/* viaSms */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingLabelRow}>
                  <MaterialIcons name="sms" size={22} color="#FF8228" />
                  <Text style={styles.settingLabel}>Tin nhắn SMS</Text>
                </View>
                <Text style={styles.settingDescription}>
                  Gửi mã xác thực OTP & tin nhắn khẩn cấp qua SMS.
                </Text>
              </View>
              <Switch
                value={settings?.viaSms ?? false}
                onValueChange={(val) => handleToggle('viaSms', val)}
                trackColor={{ false: '#dcd9d9', true: '#C6DFC6' }}
                thumbColor={(settings?.viaSms ?? false) ? '#0F382C' : '#8b7265'}
                disabled={updateMutation.isPending}
              />
            </View>
          </View>

          <Text style={styles.footerInfo}>
            * Lưu ý: Các thông báo quan trọng liên quan đến bảo mật tài khoản và giao dịch thanh
            toán sẽ luôn được gửi để bảo vệ quyền lợi của bạn.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FBF9F5',
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
    borderColor: '#EFECE6',
    zIndex: 10,
  },
  headerButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#0F382C',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#0F382C',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#EFECE6',
    shadowColor: '#0F382C',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  settingInfo: {
    flex: 1,
    paddingRight: 16,
  },
  settingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  settingLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    color: '#1C2526',
  },
  settingDescription: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#EFECE6',
    marginHorizontal: 12,
  },
  footerInfo: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
    lineHeight: 16,
    paddingHorizontal: 12,
    marginTop: 20,
  },
});
