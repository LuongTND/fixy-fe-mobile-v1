import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookingStatus } from '@/services/api/bookings';

const TIMELINE_STEPS = [
  { key: 'confirmed', label: 'Chờ xác nhận', statusThreshold: BookingStatus.Confirmed },
  { key: 'traveling', label: 'KTV đang di chuyển', statusThreshold: BookingStatus.Traveling },
  { key: 'arrived', label: 'Đã đến nơi', statusThreshold: BookingStatus.Arrived },
  { key: 'inprogress', label: 'Đang thực hiện', statusThreshold: BookingStatus.InProgress },
  { key: 'completed', label: 'Hoàn thành', statusThreshold: BookingStatus.Completed },
];

type StepState = 'done' | 'active' | 'pending';

function renderTimelineDot(state: StepState) {
  if (state === 'done') {
    return (
      <View style={styles.timelineDotDone}>
        <MaterialIcons name="check" size={14} color="#ffffff" />
      </View>
    );
  }

  if (state === 'active') {
    return (
      <View style={styles.timelineDotActive}>
        <View style={styles.timelinePulse} />
      </View>
    );
  }

  return <View style={styles.timelineDotPending} />;
}

export default function BookingTrackingScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    bookingId: string;
    status?: string;
    workerName?: string;
    workerPhone?: string;
    workerRating?: string;
    categoryName?: string;
  }>();

  const currentStatusNum = Number(params.status ?? BookingStatus.Traveling);

  const getStepState = (stepThreshold: number): StepState => {
    if (currentStatusNum > stepThreshold) return 'done';
    if (currentStatusNum === stepThreshold) return 'active';
    return 'pending';
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/orders' as any);
    }
  };

  const handleCallWorker = () => {
    if (params.workerPhone) {
      Linking.openURL(`tel:${params.workerPhone}`);
    } else {
      Alert.alert('Thông báo', 'Không có số điện thoại của KTV.');
    }
  };

  const handleChatWorker = () => {
    if (params.bookingId) {
      router.push({
        pathname: '/(booking)/booking-chat',
        params: { bookingId: params.bookingId },
      } as any);
    } else {
      Alert.alert('Thông báo', 'Không tìm thấy thông tin đơn hàng để mở chat.');
    }
  };

  const handleReport = () => {
    if (params.bookingId) {
      Alert.alert('Báo cáo sự cố', 'Bạn có muốn báo cáo sự cố với đơn hàng này?', [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Báo cáo',
          style: 'destructive',
          onPress: () => {
            router.push({
              pathname: '/(customer)/create-support-ticket',
              params: { bookingId: params.bookingId },
            } as any);
          },
        },
      ]);
    } else {
      Alert.alert('Thông báo', 'Không tìm thấy thông tin đơn hàng để tạo khiếu nại.');
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={handleGoBack}>
          <MaterialIcons name="arrow-back" size={24} color="#9a4600" />
        </Pressable>
        <Text style={styles.headerTitle}>Theo dõi đơn hàng</Text>
        <Pressable
          style={styles.headerBtn}
          onPress={() => Alert.alert('Trợ giúp', 'Liên hệ hỗ trợ: 1900-xxxx')}>
          <MaterialIcons name="help-outline" size={24} color="#9a4600" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Order Details Card */}
        <View style={styles.card}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mã đơn hàng</Text>
            <Text style={styles.detailValue}>#{params.bookingId?.slice(0, 8) ?? 'N/A'}</Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowBorder]}>
            <Text style={styles.detailLabel}>Dịch vụ</Text>
            <Text style={styles.detailValuePrimary}>{params.categoryName ?? 'Dịch vụ Spa'}</Text>
          </View>
          <View style={styles.etaRow}>
            <View style={styles.etaIcon}>
              <MaterialIcons name="schedule" size={22} color="#00677d" />
            </View>
            <View>
              <Text style={styles.etaLabel}>Dự kiến đến</Text>
              <Text style={styles.etaValue}>
                {currentStatusNum >= BookingStatus.Arrived ? 'Đã đến nơi' : '5 phút nữa'}
              </Text>
            </View>
          </View>
        </View>

        {/* Map Placeholder */}
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <MaterialIcons name="map" size={48} color="#818A91" />
            <Text style={styles.mapText}>Bản đồ theo dõi vị trí</Text>
          </View>
          {/* Worker marker */}
          <View style={[styles.mapMarker, { top: '40%', left: '30%' }]}>
            <MaterialIcons name="two-wheeler" size={18} color="#0F382C" />
          </View>
          {/* Destination marker */}
          <View style={[styles.mapMarkerPrimary, { top: '50%', left: '65%' }]}>
            <MaterialIcons name="home" size={18} color="#ffffff" />
          </View>
        </View>

        {/* Tracking Timeline */}
        <View style={styles.card}>
          <Text style={styles.timelineTitle}>Trạng thái</Text>
          {TIMELINE_STEPS.map((step, index) => {
            const state = getStepState(step.statusThreshold);
            const isLast = index === TIMELINE_STEPS.length - 1;

            return (
              <View key={step.key} style={styles.timelineItem}>
                {/* Connector line */}
                {!isLast && (
                  <View
                    style={[
                      styles.timelineLine,
                      state === 'done' && styles.timelineLineDone,
                      state === 'active' && styles.timelineLineActive,
                    ]}
                  />
                )}
                {/* Dot */}
                <View style={styles.timelineDotContainer}>{renderTimelineDot(state)}</View>
                {/* Label */}
                <View style={styles.timelineContent}>
                  <Text
                    style={[
                      styles.timelineLabel,
                      state === 'active' && styles.timelineLabelActive,
                      state === 'pending' && styles.timelineLabelPending,
                    ]}>
                    {step.label}
                  </Text>
                  {state === 'done' && <Text style={styles.timelineSubLabel}>Đã hoàn thành</Text>}
                  {state === 'active' && (
                    <Text style={styles.timelineSubLabelActive}>Đang thực hiện...</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* Worker Profile */}
        <View style={styles.workerCard}>
          <View style={styles.workerInfo}>
            <View style={styles.workerAvatar}>
              <MaterialIcons name="person" size={28} color="#818A91" />
            </View>
            <View>
              <Text style={styles.workerName}>{params.workerName ?? 'Nguyễn Văn Thắng'}</Text>
              <View style={styles.workerRatingRow}>
                <MaterialIcons name="star" size={14} color="#D4AF37" />
                <Text style={styles.workerRatingText}>
                  {params.workerRating ?? '4.9'} (đánh giá)
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.workerActions}>
            <Pressable style={styles.chatBtn} onPress={handleChatWorker}>
              <MaterialIcons name="chat" size={20} color="#00677d" />
            </Pressable>
            <Pressable style={styles.callBtn} onPress={handleCallWorker}>
              <MaterialIcons name="call" size={20} color="#004510" />
            </Pressable>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionBtnRow}>
          <Pressable style={styles.reportBtn} onPress={handleReport}>
            <Text style={styles.reportBtnText}>Báo cáo sự cố</Text>
          </Pressable>
          <Pressable style={styles.messageBtn} onPress={handleChatWorker}>
            <LinearGradient
              colors={['#9a4600', '#F45100']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.messageBtnGradient}>
              <Text style={styles.messageBtnText}>Nhắn tin KTV</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FBF9F8',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#DDDDDD',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    lineHeight: 24,
    color: '#1b1c1c',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 220,
    gap: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(221,221,221,0.5)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailRowBorder: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DDDDDD',
  },
  detailLabel: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#818A91',
  },
  detailValue: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    lineHeight: 21,
    color: '#1b1c1c',
  },
  detailValuePrimary: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    lineHeight: 21,
    color: '#0F382C',
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  etaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F7F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaLabel: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#818A91',
  },
  etaValue: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: '#1C2526',
  },
  mapContainer: {
    height: 192,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F4F1EA',
    borderWidth: 1,
    borderColor: '#EFECE6',
    position: 'relative',
    shadowColor: '#0F382C',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
  },
  mapMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F382C',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  mapMarkerPrimary: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F382C',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  timelineTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: '#1C2526',
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 24,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 11,
    top: 24,
    bottom: -4,
    width: 2,
    backgroundColor: '#EFECE6',
    zIndex: 0,
  },
  timelineLineDone: {
    backgroundColor: '#059669',
  },
  timelineLineActive: {
    backgroundColor: '#0F382C',
  },
  timelineDotContainer: {
    zIndex: 1,
  },
  timelineDotDone: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#C6DFC6',
  },
  timelinePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  timelineDotPending: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFEDEC',
    borderWidth: 2,
    borderColor: '#DDDDDD',
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  timelineLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    lineHeight: 21,
    color: '#1b1c1c',
  },
  timelineLabelActive: {
    color: '#F45100',
  },
  timelineLabelPending: {
    color: '#818A91',
  },
  timelineSubLabel: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#818A91',
  },
  timelineSubLabelActive: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#9a4600',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: '#DDDDDD',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -16 },
    elevation: 16,
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FBF9F8',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    marginBottom: 16,
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  workerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE6D5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffdbc9',
  },
  workerName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: '#1b1c1c',
  },
  workerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  workerRatingText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#574237',
  },
  workerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  chatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E7F8FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#82fc87',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  reportBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#dec0b1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    lineHeight: 21,
    color: '#ba1a1a',
  },
  messageBtn: {
    flex: 2,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
  },
  messageBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    lineHeight: 21,
    color: '#ffffff',
  },
});
