import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { HubConnectionBuilder, LogLevel, HubConnection } from '@microsoft/signalr';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { BookingStatus, BookingTracking, getBookingTracking } from '@/services/api/bookings';
import { getDistanceAndDuration, getDirections, GOONG_MAPTILES_API_KEY, GOONG_API_KEY } from '@/services/api/goong';
import { useAuthStore } from '@/store/store';
import { getApiBaseUrl } from '@/config/env';

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

/** Build the booking hub URL from the API base URL */
function getBookingHubUrl(): string {
  try {
    const apiUrl = getApiBaseUrl(); // e.g. https://domain.com/api
    const baseUrl = apiUrl.replace(/\/api\/?$/, '');
    return `${baseUrl}/hubs/booking`;
  } catch {
    return '';
  }
}

export default function BookingTrackingScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);

  const params = useLocalSearchParams<{
    bookingId: string;
    status?: string;
    workerName?: string;
    workerPhone?: string;
    workerRating?: string;
    categoryName?: string;
    workerLat?: string;
    workerLng?: string;
    customerLat?: string;
    customerLng?: string;
  }>();

  const currentStatusNum = Number(params.status ?? BookingStatus.Traveling);

  // Live tracking data via REST polling (fallback)
  const { data: liveTracking = null } = useQuery({
    queryKey: ['bookingTracking', params.bookingId],
    queryFn: () => getBookingTracking(params.bookingId || ''),
    enabled: !!params.bookingId,
    refetchInterval: 10000,
  });

  // Realtime location from SignalR
  const [realtimeLocation, setRealtimeLocation] = React.useState<{
    lat: number;
    lng: number;
    updatedAt?: string;
  } | null>(null);

  // Parse coordinates — prefer realtime SignalR > REST polling > route params
  const parsedWLat = params.workerLat ? Number(params.workerLat) : undefined;
  const parsedWLng = params.workerLng ? Number(params.workerLng) : undefined;
  const parsedCLat = params.customerLat ? Number(params.customerLat) : undefined;
  const parsedCLng = params.customerLng ? Number(params.customerLng) : undefined;

  const liveWorkerLat =
    realtimeLocation?.lat ??
    (parsedWLat && !isNaN(parsedWLat) ? parsedWLat : liveTracking?.workerLat);
  const liveWorkerLng =
    realtimeLocation?.lng ??
    (parsedWLng && !isNaN(parsedWLng) ? parsedWLng : liveTracking?.workerLng);
  const liveCustomerLat = parsedCLat && !isNaN(parsedCLat) ? parsedCLat : 16.074988;
  const liveCustomerLng = parsedCLng && !isNaN(parsedCLng) ? parsedCLng : 108.228981;

  // Has valid coordinates for both worker and customer
  const hasWorkerCoords =
    liveWorkerLat !== undefined &&
    liveWorkerLng !== undefined &&
    !isNaN(liveWorkerLat) &&
    !isNaN(liveWorkerLng);
  const hasCustomerCoords = !isNaN(liveCustomerLat) && !isNaN(liveCustomerLng);

  // ETA via Goong Distance Matrix
  const { data: etaData = null } = useQuery({
    queryKey: ['trackingGoongEta', liveWorkerLat, liveWorkerLng, liveCustomerLat, liveCustomerLng],
    queryFn: () =>
      getDistanceAndDuration(
        { lat: liveWorkerLat!, lng: liveWorkerLng! },
        { lat: liveCustomerLat!, lng: liveCustomerLng! },
        'motorcycle'
      ),
    enabled: hasWorkerCoords && hasCustomerCoords,
    staleTime: 1000 * 30,
  });

  // Route polyline via Goong Directions
  const { data: routeData = null } = useQuery({
    queryKey: ['trackingGoongRoute', liveWorkerLat, liveWorkerLng, liveCustomerLat, liveCustomerLng],
    queryFn: () =>
      getDirections(
        { lat: liveWorkerLat!, lng: liveWorkerLng! },
        { lat: liveCustomerLat!, lng: liveCustomerLng! },
        'bike'
      ),
    enabled: hasWorkerCoords && hasCustomerCoords,
    staleTime: 1000 * 60,
  });

  // ========== SignalR BookingHub connection ==========
  React.useEffect(() => {
    if (!params.bookingId || !accessToken) return;

    const bookingHubUrl = getBookingHubUrl();
    if (!bookingHubUrl) return;

    let connection: HubConnection | null = null;
    let isActive = true;

    async function connectHub() {
      try {
        connection = new HubConnectionBuilder()
          .withUrl(bookingHubUrl, {
            accessTokenFactory: () => accessToken || '',
          })
          .withAutomaticReconnect()
          .configureLogging(LogLevel.Warning)
          .build();

        // Listen for real-time location updates from worker
        connection.on('ReceiveLocationUpdate', (dto: any) => {
          if (!isActive) return;
          const lat = dto?.Lat ?? dto?.lat;
          const lng = dto?.Lng ?? dto?.lng;
          if (lat !== undefined && lng !== undefined && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
            setRealtimeLocation({
              lat: Number(lat),
              lng: Number(lng),
              updatedAt: dto?.UpdatedAt ?? dto?.updatedAt ?? new Date().toISOString(),
            });
            // Also invalidate the REST query to keep data in sync
            queryClient.invalidateQueries({ queryKey: ['bookingTracking', params.bookingId] });
            queryClient.invalidateQueries({ queryKey: ['trackingGoongEta'] });
          }
        });

        // Listen for status updates
        connection.on('ReceiveStatusUpdate', (dto: any) => {
          if (!isActive) return;
          queryClient.invalidateQueries({ queryKey: ['bookingTracking', params.bookingId] });
          queryClient.invalidateQueries({ queryKey: ['booking', params.bookingId] });
        });

        await connection.start();
        console.log('[BookingTracking] Connected to BookingHub');

        // Join the booking group
        await connection.invoke('JoinBookingGroup', params.bookingId);
        console.log('[BookingTracking] Joined booking group:', params.bookingId);
      } catch (err) {
        console.warn('[BookingTracking] SignalR connection failed:', err);
      }
    }

    connectHub();

    return () => {
      isActive = false;
      if (connection) {
        connection
          .invoke('LeaveBookingGroup', params.bookingId)
          .catch(() => {})
          .finally(() => {
            connection?.stop().catch((err) =>
              console.warn('[BookingTracking] Error stopping hub:', err)
            );
          });
      }
    };
  }, [params.bookingId, accessToken]);

  // ========== WebView ref for updating map markers ==========
  const webViewRef = React.useRef<WebView>(null);

  // Update worker marker position when location changes
  React.useEffect(() => {
    if (webViewRef.current && hasWorkerCoords) {
      const js = `
        if (window.workerMarker) {
          window.workerMarker.setLngLat([${liveWorkerLng}, ${liveWorkerLat}]);
          window.map && window.map.panTo([${liveWorkerLng}, ${liveWorkerLat}]);
        }
        true;
      `;
      webViewRef.current.injectJavaScript(js);
    }
  }, [liveWorkerLat, liveWorkerLng]);

  // Update route line when route data changes
  React.useEffect(() => {
    if (webViewRef.current && routeData?.decodedCoords && routeData.decodedCoords.length > 0) {
      const coordsJson = JSON.stringify(routeData.decodedCoords);
      const js = `
        if (window.map && window.map.getSource('route')) {
          window.map.getSource('route').setData({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: ${coordsJson} }
          });
        }
        true;
      `;
      webViewRef.current.injectJavaScript(js);
    }
  }, [routeData]);

  // ========== Build Goong Map HTML ==========
  const mapHtml = React.useMemo(() => {
    const workerLng = liveWorkerLng ?? liveCustomerLng;
    const workerLat = liveWorkerLat ?? liveCustomerLat;

    // Calculate center and zoom
    let centerLng = liveCustomerLng;
    let centerLat = liveCustomerLat;
    let zoom = 14;

    if (hasWorkerCoords && hasCustomerCoords) {
      centerLng = (workerLng + liveCustomerLng) / 2;
      centerLat = (workerLat + liveCustomerLat) / 2;
      // Adjust zoom based on distance
      const latDiff = Math.abs(workerLat - liveCustomerLat);
      const lngDiff = Math.abs(workerLng - liveCustomerLng);
      const maxDiff = Math.max(latDiff, lngDiff);
      if (maxDiff > 0.1) zoom = 11;
      else if (maxDiff > 0.05) zoom = 12;
      else if (maxDiff > 0.02) zoom = 13;
      else zoom = 14;
    }

    // Route coordinates for initial line
    const routeCoords = routeData?.decodedCoords ?? [];
    const routeCoordsJson = JSON.stringify(routeCoords);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css" rel="stylesheet" />
  <style>
    body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; }
    .mapboxgl-ctrl-bottom-left, .mapboxgl-ctrl-bottom-right { display: none; }
    .worker-marker {
      width: 36px; height: 36px; border-radius: 50%;
      background: #0F382C; border: 3px solid #fff;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
    }
    .worker-marker svg { width: 20px; height: 20px; fill: #fff; }
    .customer-marker {
      width: 36px; height: 36px; border-radius: 50%;
      background: #E53935; border: 3px solid #fff;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .customer-marker svg { width: 18px; height: 18px; fill: #fff; }
    .pulse-ring {
      position: absolute; width: 50px; height: 50px; border-radius: 50%;
      border: 2px solid #0F382C; opacity: 0;
      animation: pulse 2s ease-out infinite;
      pointer-events: none;
    }
    @keyframes pulse {
      0% { transform: scale(0.5); opacity: 0.8; }
      100% { transform: scale(1.5); opacity: 0; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    goongjs.accessToken = '${GOONG_MAPTILES_API_KEY}';
    const map = new goongjs.Map({
      container: 'map',
      style: 'https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAPTILES_API_KEY}',
      center: [${centerLng}, ${centerLat}],
      zoom: ${zoom}
    });
    window.map = map;

    map.on('load', function() {
      // Add route line source and layer
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: ${routeCoordsJson}
          }
        }
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#0F382C',
          'line-width': 4,
          'line-opacity': 0.8
        }
      });

      // Fit bounds to show both markers
      ${hasWorkerCoords ? `
      try {
        var bounds = new goongjs.LngLatBounds();
        bounds.extend([${workerLng}, ${workerLat}]);
        bounds.extend([${liveCustomerLng}, ${liveCustomerLat}]);
        map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
      } catch(e) {}
      ` : ''}
    });

    // Worker marker with pulse animation
    ${hasWorkerCoords ? `
    var workerEl = document.createElement('div');
    workerEl.style.position = 'relative';
    workerEl.innerHTML = '<div class="pulse-ring"></div><div class="worker-marker"><svg viewBox="0 0 24 24"><path d="M19.44 9.03L15.41 5H11v2h3.59l2 2H5v2h12.59l-3.83 3.83.59.59L19.44 10.34c.38-.38.59-.88.59-1.41 0-.53-.21-1.04-.59-1.41zM8 16c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg></div>';
    window.workerMarker = new goongjs.Marker({ element: workerEl })
      .setLngLat([${workerLng}, ${workerLat}])
      .addTo(map);
    ` : ''}

    // Customer marker (destination)
    var custEl = document.createElement('div');
    custEl.innerHTML = '<div class="customer-marker"><svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>';
    new goongjs.Marker({ element: custEl })
      .setLngLat([${liveCustomerLng}, ${liveCustomerLat}])
      .addTo(map);
  </script>
</body>
</html>
    `;
  }, [
    hasWorkerCoords,
    hasCustomerCoords,
    // Only rebuild HTML on initial load, not on every location update
    // Location updates are handled via injectJavaScript
  ]);

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
          <MaterialIcons name="arrow-back" size={24} color="#0F382C" />
        </Pressable>
        <Text style={styles.headerTitle}>Theo dõi đơn hàng</Text>
        <Pressable
          style={styles.headerBtn}
          onPress={() => Alert.alert('Trợ giúp', 'Liên hệ hỗ trợ: 1900-xxxx')}>
          <MaterialIcons name="help-outline" size={24} color="#0F382C" />
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
              <MaterialIcons name="schedule" size={22} color="#0F382C" />
            </View>
            <View>
              <Text style={styles.etaLabel}>Dự kiến đến</Text>
              <Text style={styles.etaValue}>
                {currentStatusNum >= BookingStatus.Arrived
                  ? 'Đã đến nơi'
                  : etaData
                  ? `${etaData.durationText} (${etaData.distanceText})`
                  : 'Đang cập nhật...'}
              </Text>
            </View>
          </View>
        </View>

        {/* Goong Map */}
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            style={styles.mapWebView}
            scrollEnabled={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
          {/* ETA overlay on map */}
          {etaData && (
            <View style={styles.mapEtaOverlay}>
              <MaterialIcons name="two-wheeler" size={16} color="#0F382C" />
              <Text style={styles.mapEtaText}>
                {etaData.durationText} • {etaData.distanceText}
              </Text>
            </View>
          )}
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
              <MaterialIcons name="chat" size={20} color="#0F382C" />
            </Pressable>
            <Pressable style={styles.callBtn} onPress={handleCallWorker}>
              <MaterialIcons name="call" size={20} color="#0F382C" />
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
              colors={['#0F382C', '#164839']}
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
    height: 280,
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
  mapWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  mapEtaOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  mapEtaText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#0F382C',
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
    color: '#0F382C',
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
    color: '#0F382C',
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
