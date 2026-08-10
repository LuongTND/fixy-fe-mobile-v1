import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WorkerTabBar } from '@/components/layout/worker-tab-bar';
import { Booking, getWorkerBookings, getWallet } from '@/services/api/bookings';
import { fetchCategories } from '@/services/api/categories';
import { getWorkerProfileMe, updateWorkingStatus } from '@/services/api/workers';
import { getUserProfile } from '@/services/api/user';
import { getWorkerCategoryIcon } from '@/utils/category-ui';
import { formatCurrency } from '@/utils/format';
import { getUnreadCount } from '@/services/api/notifications';

export default function WorkerHomeScreen() {
  const insets = useSafeAreaInsets();
  const [isReady, setIsReady] = React.useState(true);

  // Queries
  const { data: profile = null, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['workerProfileMe'],
    queryFn: getWorkerProfileMe,
    retry: false,
  });

  React.useEffect(() => {
    if (profile) {
      setIsReady(profile.isAcceptingJobs ?? profile.isOnline ?? true);
    }
  }, [profile]);

  const handleToggleStatus = async (value: boolean) => {
    setIsReady(value);
    try {
      await updateWorkingStatus(value);
    } catch (err) {
      console.warn('[worker-home] Failed to update working status:', err);
    }
  };

  const { data: userProfileResponse = null } = useQuery({
    queryKey: ['userProfile'],
    queryFn: getUserProfile,
    retry: false,
  });
  const userProfile = userProfileResponse?.data ?? null;

  const hasApprovedProfile = profile !== null && profile.status === 1;

  const { data: wallet = null } = useQuery({
    queryKey: ['walletSummary'],
    queryFn: getWallet,
    enabled: hasApprovedProfile,
  });

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ['workerBookings'],
    queryFn: () => getWorkerBookings(),
    enabled: hasApprovedProfile,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
  });

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ['unreadNotificationCount'],
    queryFn: getUnreadCount,
    enabled: hasApprovedProfile,
  });

  if (isLoadingProfile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF9F5' }}>
        <ActivityIndicator size="large" color="#0F382C" />
      </View>
    );
  }

  // Filter Bookings (incoming jobs)
  const incomingJobs = bookings.filter((b) => b.status === 0 || b.status === 1);

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerLeft}>
          {(profile?.avatarUrl || userProfile?.avatarUrl) ? (
            <Image
              source={{ uri: (profile?.avatarUrl || userProfile?.avatarUrl) ?? undefined }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: '#D6CFC4', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ fontSize: 16, fontFamily: 'Montserrat_700Bold', color: '#0F382C' }}>
                {(profile?.fullName || userProfile?.fullName || '').charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.greetingText}>
              Chào, {profile?.fullName || userProfile?.fullName || 'Đối tác'}!
            </Text>
            <Text style={styles.roleText}>Đối tác kỹ thuật viên</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            style={styles.notificationButton}
            onPress={() => router.push('/(booking)/chat-list' as any)}>
            <MaterialIcons name="chat-bubble-outline" size={24} color="#383838" />
          </Pressable>
          <Pressable
            style={styles.notificationButton}
            onPress={() => router.push('/(worker)/notifications' as any)}>
            <MaterialIcons name="notifications-none" size={26} color="#383838" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!hasApprovedProfile ? (
          <View>
            {profile === null && (
              <View style={styles.bannerCard}>
                <View style={[styles.bannerIconCircle, { backgroundColor: '#F2F7F2' }]}>
                  <MaterialIcons name="person-add" size={36} color="#0F382C" />
                </View>
                <Text style={styles.bannerTitle}>Hoàn thành thiết lập hồ sơ</Text>
                <Text style={styles.bannerDesc}>
                  Chào mừng bạn đến với Fixy! Để bắt đầu nhận các yêu cầu dịch vụ spa và nâng cao thu nhập, vui lòng cập nhật thông tin cá nhân, định danh CCCD và dịch vụ cung cấp.
                </Text>
                <Pressable
                  style={styles.bannerBtn}
                  onPress={() => router.push('/(worker)/worker-setup' as any)}>
                  <Text style={styles.bannerBtnText}>Thiết lập hồ sơ ngay</Text>
                </Pressable>
              </View>
            )}

            {profile?.status === 0 && (
              <View style={styles.bannerCard}>
                <View style={[styles.bannerIconCircle, { backgroundColor: '#F2F7F2' }]}>
                  <MaterialIcons name="hourglass-empty" size={36} color="#0F382C" />
                </View>
                <Text style={styles.bannerTitle}>Hồ sơ đang chờ duyệt</Text>
                <Text style={styles.bannerDesc}>
                  Đội ngũ quản trị viên của chúng tôi đang kiểm tra và đối chiếu các thông tin của bạn. Quá trình kiểm duyệt này thường mất từ 24 - 48 giờ. Bạn sẽ nhận được thông báo ngay khi hoàn tất.
                </Text>
                <Pressable
                  style={[styles.bannerBtn, { backgroundColor: '#818A91' }]}
                  disabled={true}>
                  <Text style={styles.bannerBtnText}>Hồ sơ đang chờ duyệt...</Text>
                </Pressable>
              </View>
            )}

            {profile?.status === 2 && (
              <View style={styles.bannerCard}>
                <View style={[styles.bannerIconCircle, { backgroundColor: '#FFF1E8' }]}>
                  <MaterialIcons name="report-problem" size={36} color="#D97706" />
                </View>
                <Text style={styles.bannerTitle}>Yêu cầu bị từ chối</Text>
                <Text style={styles.bannerDesc}>
                  Hồ sơ của bạn không được phê duyệt. Vui lòng kiểm tra lý do và cập nhật lại thông tin để gửi phê duyệt lại.
                </Text>
                {profile.rejectReason ? (
                  <View style={styles.rejectReasonBox}>
                    <Text style={styles.rejectReasonLabel}>Lý do từ chối:</Text>
                    <Text style={styles.rejectReasonText}>{profile.rejectReason}</Text>
                  </View>
                ) : null}
                <Pressable
                  style={styles.bannerBtn}
                  onPress={() => router.push({ pathname: '/(worker)/worker-setup', params: { edit: 'true' } } as any)}>
                  <Text style={styles.bannerBtnText}>Chỉnh sửa & Nộp lại</Text>
                </Pressable>
              </View>
            )}

            {profile?.status === 3 && (
              <View style={styles.bannerCard}>
                <View style={[styles.bannerIconCircle, { backgroundColor: '#FEE2E2' }]}>
                  <MaterialIcons name="lock" size={36} color="#BA1A1A" />
                </View>
                <Text style={styles.bannerTitle}>Tài khoản tạm khóa</Text>
                <Text style={styles.bannerDesc}>
                  Tài khoản đối tác kỹ thuật viên của bạn hiện đang tạm thời bị khóa. Vui lòng liên hệ với bộ phận CSKH hoặc đường dây nóng hotline để được trợ giúp giải đáp thắc mắc.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <>
            {/* Earnings Summary */}
            <View style={styles.earningsCardWrapper}>
              <LinearGradient
                colors={['#0F382C', '#164839']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.earningsCard}>
                <View style={styles.earningsHeader}>
                  <Text style={styles.earningsLabel}>Số dư ví hiện tại</Text>
                  <MaterialIcons name="account-balance-wallet" size={22} color="#ffffff" />
                </View>
                <Text style={styles.earningsValue}>{formatCurrency(wallet?.balance)}</Text>
              </LinearGradient>
            </View>

            {/* Working Status Switch */}
            <View style={styles.statusCard}>
              <View style={styles.statusInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.statusTitle}>Trạng thái làm việc</Text>
                  {profile?.isBusy && (
                    <View style={{ backgroundColor: '#FFF1E8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ fontSize: 10, color: '#D97706', fontFamily: 'Montserrat_700Bold' }}>Đang có ca làm</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.statusSubtitle}>
                  {profile?.isBusy
                    ? 'Đang bận thực hiện ca làm việc'
                    : isReady
                    ? 'Sẵn sàng nhận việc tự động'
                    : 'Tạm nghỉ nhận việc'}
                </Text>
              </View>
              <Switch
                value={isReady}
                onValueChange={handleToggleStatus}
                trackColor={{ false: '#dcd9d9', true: '#C6DFC6' }}
                thumbColor={isReady ? '#0F382C' : '#818A91'}
              />
            </View>

            {/* Incoming Job Requests */}
            <View style={styles.jobsSection}>
              <Text style={styles.sectionTitle}>Yêu cầu công việc mới ({incomingJobs.length})</Text>

              <View style={styles.jobsList}>
                {incomingJobs.length > 0 ? (
                  incomingJobs.map((job) => {
                    const category = categories.find(
                      (c) => c.id === job.categoryId || c.code === job.categoryId
                    );
                    return (
                      <View key={job.id} style={styles.jobCard}>
                        <View style={styles.jobRow}>
                          {category?.imageUrl ? (
                            <View style={styles.jobIconBox}>
                              <Image
                                source={{ uri: category.imageUrl }}
                                style={{ width: 48, height: 48, borderRadius: 10 }}
                                resizeMode="contain"
                              />
                            </View>
                          ) : (
                            <View style={[styles.jobIconBox, { backgroundColor: '#FFE6D5' }]}>
                              <MaterialIcons
                                name={getWorkerCategoryIcon(job.categoryId) as any}
                                size={24}
                                color="#0F382C"
                              />
                            </View>
                          )}
                          <View style={styles.jobDetails}>
                            <View style={styles.jobTitleRow}>
                              <Text style={styles.jobTitle} numberOfLines={1}>
                                {job.description || category?.name || 'Yêu cầu dịch vụ Spa'}
                              </Text>
                              <Text style={styles.jobPrice}>
                                {formatCurrency(job.finalPrice || job.finalAmount || job.estimatedAmount || job.estimatedPrice || 0)}
                              </Text>
                            </View>
                            <View style={styles.jobMetaRow}>
                              <View style={styles.metaItem}>
                                <MaterialIcons name="location-on" size={14} color="#818A91" />
                                <Text style={styles.metaText} numberOfLines={1}>
                                  {job.address}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>

                        <View style={styles.jobActions}>
                          <Pressable
                            style={styles.detailsButton}
                            onPress={() => router.push(`/worker-job-detail?id=${job.id}` as any)}>
                            <Text style={styles.detailsButtonText}>Xem chi tiết</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyContainer}>
                    <MaterialIcons name="hourglass-empty" size={36} color="#818A91" />
                    <Text style={styles.emptyText}>Đang chờ yêu cầu công việc mới...</Text>
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom Navigation Tab Bar */}
      <WorkerTabBar activeTab="home" />
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
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#dec0b1',
    backgroundColor: '#efedec',
  },
  greetingText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#9a4600',
  },
  roleText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
    marginTop: 1,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  earningsCardWrapper: {
    borderRadius: 16,
    shadowColor: '#9a4600',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 16,
  },
  earningsCard: {
    borderRadius: 16,
    padding: 16,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  earningsLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#ffffff',
    opacity: 0.9,
  },
  earningsValue: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 30,
    color: '#ffffff',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#1b1c1c',
  },
  statusSubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
    marginTop: 2,
  },
  jobsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#1b1c1c',
    marginBottom: 12,
    flexShrink: 1,
  },
  jobsList: {
    gap: 16,
  },
  jobCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  jobIconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobDetails: {
    flex: 1,
  },
  jobTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  jobTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#1b1c1c',
    flex: 1,
  },
  jobPrice: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#0F382C',
  },
  jobMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  metaText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#818A91',
  },
  jobActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderColor: '#efedec',
    marginTop: 12,
    paddingTop: 10,
  },
  detailsButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#0F382C',
  },
  detailsButtonText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#ffffff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#818A91',
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
  bannerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 24,
    alignItems: 'center',
    gap: 16,
    width: '100%',
    marginTop: 20,
  },
  bannerIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#1b1c1c',
    textAlign: 'center',
  },
  bannerDesc: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
    lineHeight: 20,
    textAlign: 'center',
  },
  bannerBtn: {
    height: 48,
    backgroundColor: '#0F382C',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: 8,
    width: '100%',
  },
  bannerBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#ffffff',
  },
  rejectReasonBox: {
    backgroundColor: '#FFF1E8',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFD3B8',
    width: '100%',
  },
  rejectReasonLabel: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#ba1a1a',
    marginBottom: 4,
  },
  rejectReasonText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#383838',
    lineHeight: 18,
  },
});
