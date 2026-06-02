import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WorkerTabBar } from '@/components/layout/worker-tab-bar';
import { getWorkerBookings, Booking } from '@/services/api/bookings';
import { getWorkerCategoryIcon } from '@/utils/category-ui';
import { formatCurrency } from '@/utils/format';

export default function WorkerJobsScreen() {
  const insets = useSafeAreaInsets();
  const [jobsSubTab, setJobsSubTab] = React.useState<'active' | 'history'>('active');

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['workerBookings'],
    queryFn: () => getWorkerBookings(),
  });

  const activeJobs = bookings.filter(
    (b) => b.status === 2 || b.status === 3 || b.status === 4 || b.status === 5
  );
  const historyJobs = bookings.filter(
    (b) => b.status === 6 || b.status === 7 || b.status === 8 || b.status === 9
  );

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
              displayedJobs.map((job) => (
                <Pressable
                  key={job.id}
                  style={styles.jobCard}
                  onPress={() => router.push(`/worker-job-detail?id=${job.id}` as any)}>
                  <View style={styles.jobRow}>
                    <View style={[styles.jobIconBox, { backgroundColor: '#FFE6D5' }]}>
                      <MaterialIcons
                        name={getWorkerCategoryIcon(job.categoryId) as any}
                        size={24}
                        color="#FF8228"
                      />
                    </View>
                    <View style={styles.jobDetails}>
                      <View style={styles.jobTitleRow}>
                        <Text style={styles.jobTitle} numberOfLines={1}>
                          {job.description || 'Yêu cầu sửa chữa'}
                        </Text>
                        <Text style={styles.jobPrice}>
                          {formatCurrency(job.finalAmount || job.estimatedAmount || 150000)}
                        </Text>
                      </View>
                      <Text style={styles.jobAddressText} numberOfLines={1}>
                        {job.address}
                      </Text>
                      <Text style={styles.jobMetaText}>
                        Trạng thái: {job.status === 2 && 'Đã nhận'}
                        {job.status === 3 && ' Đang di chuyển'}
                        {job.status === 4 && ' Đã đến nơi'}
                        {job.status === 5 && ' Đang sửa'}
                        {job.status === 6 && ' Hoàn thành'}
                        {job.status === 7 && ' Đã hủy'}
                        {job.status === 9 && ' Chờ thanh toán'}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))
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
    borderColor: '#DDDDDD',
    padding: 16,
  },
  jobRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  jobIconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
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
    marginTop: 4,
  },
  jobMetaText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#818A91',
    marginTop: 6,
  },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#818A91' },
});
