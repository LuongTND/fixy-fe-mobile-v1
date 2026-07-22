import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WorkerTabBar } from '@/components/layout/worker-tab-bar';
import { getWorkerBookings, Booking, BookingStatus } from '@/services/api/bookings';
import { fetchCategories } from '@/services/api/categories';
import { getWorkerCategoryIcon } from '@/utils/category-ui';
import { formatCurrency } from '@/utils/format';
import { formatDateTime } from '@/utils/date';
import { getWorkerProfileMe } from '@/services/api/workers';

const STATUS_STYLES: Record<number, { label: string; color: string; bg: string }> = {
  [BookingStatus.Pending]: { label: 'Chờ phản hồi', color: '#D97706', bg: '#FEF3C7' },
  [BookingStatus.Matching]: { label: 'Đang ghép cặp', color: '#EA580C', bg: '#FFEDD5' },
  [BookingStatus.Confirmed]: { label: 'Đã nhận', color: '#059669', bg: '#D1FAE5' },
  [BookingStatus.Traveling]: { label: 'Đang di chuyển', color: '#2563EB', bg: '#DBEAFE' },
  [BookingStatus.Arrived]: { label: 'Đã đến nơi', color: '#4F46E5', bg: '#EEF2FF' },
  [BookingStatus.InProgress]: { label: 'Đang sửa chữa', color: '#7C3AED', bg: '#F5F3FF' },
  [BookingStatus.Completed]: { label: 'Hoàn thành', color: '#059669', bg: '#D1FAE5' },
  [BookingStatus.Cancelled]: { label: 'Đã hủy', color: '#475569', bg: '#F1F5F9' },
  [BookingStatus.Disputed]: { label: 'Tranh chấp', color: '#DC2626', bg: '#FEE2E2' },
  [BookingStatus.PendingPayment]: { label: 'Chờ thanh toán', color: '#E11D48', bg: '#FFE4E6' },
};

export default function WorkerJobsScreen() {
  const insets = useSafeAreaInsets();
  const [jobsSubTab, setJobsSubTab] = React.useState<'active' | 'history'>('active');

  const { data: profile = null, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['workerProfileMe'],
    queryFn: getWorkerProfileMe,
    retry: false,
  });

  React.useEffect(() => {
    if (!isLoadingProfile) {
      if (profile === null) {
        router.replace('/(worker)/worker-setup' as any);
      }
    }
  }, [profile, isLoadingProfile]);

  const hasApprovedProfile = profile !== null && profile.status === 1;

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['workerBookings'],
    queryFn: () => getWorkerBookings(),
    enabled: hasApprovedProfile,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
  });

  const activeJobs = bookings.filter(
    (b) =>
      b.status === BookingStatus.Confirmed ||
      b.status === BookingStatus.Traveling ||
      b.status === BookingStatus.Arrived ||
      b.status === BookingStatus.InProgress
  );
  const historyJobs = bookings.filter(
    (b) =>
      b.status === BookingStatus.Completed ||
      b.status === BookingStatus.Cancelled ||
      b.status === BookingStatus.Disputed ||
      b.status === BookingStatus.PendingPayment
  );

  if (isLoadingProfile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fbf9f8' }}>
        <ActivityIndicator size="large" color="#FF8228" />
      </View>
    );
  }

  const displayedJobs = jobsSubTab === 'active' ? activeJobs : historyJobs;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerBtn} />
        <Text style={styles.headerTitle}>Công việc</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.subtabsHeader}>
        <Pressable
          style={[styles.subtabBtn, jobsSubTab === 'active' && styles.subtabBtnActive]}
          onPress={() => setJobsSubTab('active')}>
          <Text style={[styles.subtabText, jobsSubTab === 'active' && styles.subtabTextActive]}>
            Đang làm ({activeJobs.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.subtabBtn, jobsSubTab === 'history' && styles.subtabBtnActive]}
          onPress={() => setJobsSubTab('history')}>
          <Text style={[styles.subtabText, jobsSubTab === 'history' && styles.subtabTextActive]}>
            Lịch sử ({historyJobs.length})
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#FF8228" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.jobsList}>
            {displayedJobs.length > 0 ? (
              displayedJobs.map((job) => {
                const category = categories.find(
                  (c) => c.id === job.categoryId || c.code === job.categoryId
                );
                return (
                  <Pressable
                    key={job.id}
                    style={styles.jobCard}
                    onPress={() => router.push(`/worker-job-detail?id=${job.id}` as any)}>
                    <View style={styles.jobRow}>
                      {category?.imageUrl ? (
                        <View style={styles.jobIconBox}>
                          <Image
                            source={{ uri: category.imageUrl }}
                            style={{ width: 48, height: 48, borderRadius: 12 }}
                            resizeMode="contain"
                          />
                        </View>
                      ) : (
                        <View style={[styles.jobIconBox, { backgroundColor: '#FFE6D5' }]}>
                          <MaterialIcons
                            name={getWorkerCategoryIcon(job.categoryId) as any}
                            size={24}
                            color="#FF8228"
                          />
                        </View>
                      )}
                      <View style={styles.jobDetails}>
                        <View style={styles.jobTitleRow}>
                          <Text style={styles.jobTitle} numberOfLines={1}>
                            {job.description || 'Yêu cầu sửa chữa'}
                          </Text>
                          <Text style={styles.jobPrice}>
                            {formatCurrency(job.finalAmount || job.estimatedAmount || 150000)}
                          </Text>
                        </View>

                        <View style={styles.infoRow}>
                          <MaterialIcons name="place" size={14} color="#818A91" />
                          <Text style={styles.jobAddressText} numberOfLines={1}>
                            {job.address}
                          </Text>
                        </View>

                        <View style={styles.infoRow}>
                          <MaterialIcons name="access-time" size={14} color="#818A91" />
                          <Text style={styles.jobTimeText}>
                            {job.scheduledType === 0 ||
                            String(job.scheduledType).toLowerCase() === 'now'
                              ? 'Làm ngay'
                              : 'Hẹn lịch'}
                            {job.scheduledAt && ` • ${formatDateTime(job.scheduledAt)}`}
                          </Text>
                        </View>

                        {STATUS_STYLES[job.status] && (
                          <View style={styles.statusRow}>
                            <View
                              style={[
                                styles.statusBadge,
                                { backgroundColor: STATUS_STYLES[job.status].bg },
                              ]}>
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  { color: STATUS_STYLES[job.status].color },
                                ]}>
                                {STATUS_STYLES[job.status].label}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="assignment-late" size={40} color="#818A91" />
                <Text style={styles.emptyText}>Không có đơn hàng nào.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <WorkerTabBar activeTab="jobs" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fbf9f8' },
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
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1b1c1c' },
  subtabsHeader: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#DDDDDD',
  },
  subtabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subtabBtnActive: { borderBottomColor: '#FF8228' },
  subtabText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#818A91' },
  subtabTextActive: { color: '#FF8228', fontFamily: 'Montserrat_700Bold' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16, paddingBottom: 110 },
  jobsList: { gap: 16 },
  jobCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  jobRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  jobIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobDetails: { flex: 1 },
  jobTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  jobTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 14, color: '#1b1c1c', flex: 1 },
  jobPrice: { fontFamily: 'Montserrat_700Bold', fontSize: 14, color: '#FF8228' },
  jobAddressText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    flex: 1,
  },
  jobTimeText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
  },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#818A91' },
});
