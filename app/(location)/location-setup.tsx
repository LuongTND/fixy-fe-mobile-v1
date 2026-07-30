import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TurboModuleRegistry,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Address,
  createAddress,
  deleteAddress,
  getMyAddresses,
  updateAddress,
} from '@/services/api/addresses';
import { apiClient } from '@/services/api/client';

// Safe Dynamic Imports & Fallbacks for Mapping Modules
let MapLibreGL: any = null;
let isMapLibreSupported = false;

let MapViewRN: any = null;
let MarkerRN: any = null;
let PolylineRN: any = null;
let isReactNativeMapsSupported = false;

const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const msg = args[0];
  if (
    typeof msg === 'string' &&
    (msg.includes('Mapbox React Native') ||
      msg.includes('MapLibre') ||
      msg.includes('StyleURL') ||
      msg.includes('RNMapsAirModule') ||
      msg.includes('TurboModuleRegistry'))
  ) {
    // Suppress native mapping library registration warnings/errors inside Metro
    return;
  }
  originalConsoleError(...args);
};

// 1. Try loading MapLibre if the native module MLNModule is available
try {
  const hasMLNModule = NativeModules && NativeModules.MLNModule != null;
  if (hasMLNModule) {
    MapLibreGL = require('@maplibre/maplibre-react-native').default;
    if (MapLibreGL) {
      MapLibreGL.setAccessToken(null);
      isMapLibreSupported = true;
    }
  } else {
    console.log('[LocationSetup] MLNModule native module not registered in NativeModules.');
  }
} catch (e) {
  console.log('[LocationSetup] MapLibreGL loading failed:', e);
  isMapLibreSupported = false;
}

// 2. Try loading react-native-maps if the native module RNMapsAirModule is available
try {
  const hasRNMapsModule =
    TurboModuleRegistry &&
    typeof TurboModuleRegistry.get === 'function' &&
    TurboModuleRegistry.get('RNMapsAirModule') != null;
  if (hasRNMapsModule) {
    const RNMaps = require('react-native-maps');
    MapViewRN = RNMaps.default;
    MarkerRN = RNMaps.Marker;
    PolylineRN = RNMaps.Polyline;
    isReactNativeMapsSupported = !!MapViewRN;
  } else {
    console.log(
      '[LocationSetup] RNMapsAirModule native module not registered in TurboModuleRegistry.'
    );
  }
} catch (e) {
  console.log('[LocationSetup] react-native-maps loading failed:', e);
  isReactNativeMapsSupported = false;
} finally {
  console.error = originalConsoleError;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GOONG_API_KEY = Constants.expoConfig?.extra?.goongApiKey || '';
const GOONG_MAPTILES_API_KEY = Constants.expoConfig?.extra?.goongMaptilesApiKey || '';

const MAP_STYLE_URL = `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAPTILES_API_KEY}`;
const DEFAULT_CENTER: [number, number] = [105.83991, 21.028]; // [lng, lat] Hanoi

// No offline addresses fallback

// Helper to decode Goong/Google overview polyline points
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0,
    len = encoded.length;
  let lat = 0,
    lng = 0;

  while (index < len) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lng / 1e5, lat / 1e5]); // [longitude, latitude]
  }
  return points;
}

export default function LocationSetupScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = React.useRef<any>(null);
  const rnMapRef = React.useRef<any>(null);

  // Map & location state
  const [currentCoord, setCurrentCoord] = React.useState<[number, number]>(DEFAULT_CENTER);
  const [selectedCoord, setSelectedCoord] = React.useState<[number, number] | null>(null);
  const [routeCoords, setRouteCoords] = React.useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = React.useState<{ distance: string; duration: string } | null>(
    null
  );

  // Address lists
  const [addresses, setAddresses] = React.useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = React.useState<string>('');

  // Search autocomplete state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<any[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [selectedPlaceInfo, setSelectedPlaceInfo] = React.useState<any>(null);

  // Modals & form state
  const [showSaveModal, setShowSaveModal] = React.useState(false);
  const [newLabel, setNewLabel] = React.useState('');
  const [newDetail, setNewDetail] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  // Load addresses on mount
  React.useEffect(() => {
    loadAddresses();
  }, []);

  // Fetch saved addresses from server
  const loadAddresses = async () => {
    try {
      const data = await getMyAddresses();
      if (data && data.length > 0) {
        setAddresses(data);
        const defaultAddr = data.find((a) => a.isDefault);
        if (defaultAddr && defaultAddr.id) {
          setSelectedAddressId(defaultAddr.id);
          setCurrentCoord([defaultAddr.lng, defaultAddr.lat]);
        } else if (data[0].id) {
          setSelectedAddressId(data[0].id);
          setCurrentCoord([data[0].lng, data[0].lat]);
        }
      } else {
        setAddresses([]);
      }
    } catch {
      setAddresses([]);
    }
  };

  // Autocomplete debouncing search
  React.useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(() => {
      fetchSuggestions();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const fetchSuggestions = async () => {
    setSearchLoading(true);
    try {
      const response = await fetch(
        `https://rsapi.goong.io/Place/AutoComplete?api_key=${GOONG_API_KEY}&input=${encodeURIComponent(
          searchQuery
        )}`
      );
      const data = await response.json();
      if (data.predictions) {
        setSuggestions(data.predictions);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle selecting a place from search dropdown
  const handleSelectSuggestion = async (item: any) => {
    setSuggestions([]);
    setSearchQuery(item.description);
    setSearchLoading(true);

    try {
      const response = await fetch(
        `https://rsapi.goong.io/Place/Detail?api_key=${GOONG_API_KEY}&place_id=${item.place_id}`
      );
      const data = await response.json();

      if (data.result && data.result.geometry) {
        const location = data.result.geometry.location;
        const coordinates: [number, number] = [location.lng, location.lat];
        setSelectedCoord(coordinates);
        setSelectedPlaceInfo(data.result);

        // Pan map camera to selected point if supported
        if (isMapLibreSupported) {
          cameraRef.current?.setCamera({
            centerCoordinate: coordinates,
            zoomLevel: 14,
            animationDuration: 1200,
          });
        } else if (isReactNativeMapsSupported) {
          rnMapRef.current?.animateToRegion(
            {
              latitude: coordinates[1],
              longitude: coordinates[0],
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            },
            1000
          );
        }

        // Request directions from current selected address or Hanoi center to new location
        calculateDirections(currentCoord, coordinates);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể lấy thông tin chi tiết địa điểm.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Get Directions route from Goong
  const calculateDirections = async (start: [number, number], end: [number, number]) => {
    try {
      const response = await fetch(
        `https://rsapi.goong.io/Direction?origin=${start[1]},${start[0]}&destination=${end[1]},${end[0]}&vehicle=car&api_key=${GOONG_API_KEY}`
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const points = route.overview_polyline.points;
        const decoded = decodePolyline(points);
        setRouteCoords(decoded);

        if (route.legs && route.legs.length > 0) {
          const leg = route.legs[0];
          setRouteInfo({
            distance: leg.distance.text,
            duration: leg.duration.text,
          });
        }
      }
    } catch (err) {
      console.error('Error calculating directions:', err);
    }
  };

  const handleUseCurrentLocation = async () => {
    setLoading(true);
    try {
      // 1. Request foreground location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập bị từ chối',
          'Vui lòng cấp quyền truy cập vị trí trong cài đặt hệ thống để sử dụng tính năng này.'
        );
        return;
      }

      // 2. Fetch current high accuracy location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      const currentLoc: [number, number] = [lng, lat];

      // Update maps center coordinates
      setCurrentCoord(currentLoc);
      setSelectedCoord(null);
      setRouteCoords([]);
      setRouteInfo(null);

      // Pan map camera to current location if supported
      if (isMapLibreSupported) {
        cameraRef.current?.setCamera({
          centerCoordinate: currentLoc,
          zoomLevel: 14,
          animationDuration: 800,
        });
      } else if (isReactNativeMapsSupported) {
        rnMapRef.current?.animateToRegion(
          {
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          800
        );
      }

      // 3. Reverse Geocode coordinate using Goong Maps API
      try {
        const response = await fetch(
          `https://rsapi.goong.io/Geocode?latlng=${lat},${lng}&api_key=${GOONG_API_KEY}`
        );
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const firstResult = data.results[0];
          setSearchQuery(firstResult.formatted_address || '');
          setSelectedPlaceInfo(firstResult);
          setSelectedCoord(currentLoc); // Keep it selected so the user can easily save it
        } else {
          setSearchQuery(`Vị trí tại [${lat.toFixed(5)}, ${lng.toFixed(5)}]`);
        }
      } catch (err) {
        console.error('Error reverse geocoding current location:', err);
        setSearchQuery(`Vị trí tại [${lat.toFixed(5)}, ${lng.toFixed(5)}]`);
      }
    } catch (err) {
      console.error('Error getting current location:', err);
      Alert.alert('Lỗi', 'Không thể lấy vị trí hiện tại của thiết bị.');
    } finally {
      setLoading(false);
    }
  };

  // Save currently selected place as a saved address
  const handleSaveAddress = async () => {
    if (!selectedCoord) {
      Alert.alert('Chưa chọn vị trí', 'Vui lòng chọn hoặc tìm kiếm một vị trí trên bản đồ.');
      return;
    }

    if (!newLabel.trim()) {
      Alert.alert('Nhập nhãn', 'Vui lòng nhập tên nhãn (ví dụ: Nhà riêng, Văn phòng...)');
      return;
    }

    setLoading(true);
    try {
      const city =
        selectedPlaceInfo?.address_components?.find((c: any) =>
          c.types.includes('administrative_area_level_1')
        )?.long_name || 'Thành phố Đà Nẵng';

      const district =
        selectedPlaceInfo?.address_components?.find((c: any) =>
          c.types.includes('administrative_area_level_2')
        )?.long_name || '';

      const ward =
        selectedPlaceInfo?.address_components?.find((c: any) =>
          c.types.includes('administrative_area_level_3')
        )?.long_name || '';

      const detail =
        newDetail.trim() ||
        searchQuery.trim() ||
        selectedPlaceInfo?.formatted_address ||
        'Địa chỉ đã chọn';

      const newAddressData: Omit<Address, 'id'> = {
        label: newLabel.trim(),
        city,
        district,
        ward,
        detail,
        lat: selectedCoord[1],
        lng: selectedCoord[0],
        isDefault: addresses.length === 0,
      };

      const saved = await createAddress(newAddressData);
      await loadAddresses();
      if (saved && saved.id) {
        setSelectedAddressId(saved.id);
      }
      setShowSaveModal(false);
      setNewLabel('');
      setNewDetail('');
      Alert.alert('Thành công', 'Địa chỉ đã được lưu lại.', [
        {
          text: 'OK',
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            }
          },
        },
      ]);
    } catch (err: any) {
      console.error('[location-setup] Error saving address:', err);
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể lưu địa chỉ.');
    } finally {
      setLoading(false);
    }
  };

  // Set default address
  const handleSetDefault = async (addr: Address) => {
    if (!addr.id) return;
    try {
      await updateAddress(addr.id, { ...addr, isDefault: true });
      await loadAddresses();
    } catch {
      Alert.alert('Lỗi', 'Không thể thiết lập địa chỉ mặc định.');
    }
  };

  // Delete saved address
  const handleDeleteAddress = async (id?: string) => {
    if (!id) return;
    Alert.alert('Xóa địa chỉ', 'Bạn có muốn xóa địa chỉ này khỏi danh sách đã lưu?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAddress(id);
            await loadAddresses();
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa địa chỉ.');
          }
        },
      },
    ]);
  };

  const handleContinue = async () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.get('/worker-profiles/me');
      if (response.status === 200 && response.data) {
        router.replace('/worker-home' as any);
      } else {
        router.replace('/home' as any);
      }
    } catch {
      router.replace('/home' as any);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={26} color="#1B1C1C" />
        </Pressable>
        <Text style={styles.brand}>Bản đồ dịch vụ</Text>
      </View>

      {/* Map Segment */}
      {isMapLibreSupported ? (
        <View style={styles.mapContainer}>
          <MapLibreGL.MapView styleURL={MAP_STYLE_URL} logoEnabled={false} style={styles.map}>
            <MapLibreGL.Camera ref={cameraRef} zoomLevel={11} centerCoordinate={currentCoord} />

            {/* Current default marker */}
            <MapLibreGL.PointAnnotation id="current-loc-annotation" coordinate={currentCoord}>
              <View style={styles.currentMarkerContainer}>
                <View style={styles.currentMarkerCore} />
              </View>
            </MapLibreGL.PointAnnotation>

            {/* Selected destination marker */}
            {selectedCoord && (
              <MapLibreGL.PointAnnotation
                id="selected-destination-annotation"
                coordinate={selectedCoord}>
                <View style={styles.selectedMarkerContainer}>
                  <MaterialIcons name="location-on" size={32} color="#F45100" />
                </View>
              </MapLibreGL.PointAnnotation>
            )}

            {/* Routing Polyline Layer */}
            {routeCoords.length > 0 && (
              <MapLibreGL.ShapeSource
                id="routeSource"
                shape={{
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: routeCoords,
                  },
                  properties: {},
                }}>
                <MapLibreGL.LineLayer
                  id="routeLayer"
                  style={{
                    lineColor: '#2E64FE',
                    lineWidth: 6,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              </MapLibreGL.ShapeSource>
            )}
          </MapLibreGL.MapView>

          {/* Floating Directions Route Summary */}
          {routeInfo && (
            <View style={styles.routeSummaryCard}>
              <View style={styles.routeSummaryRow}>
                <MaterialIcons name="directions-car" size={20} color="#FF8228" />
                <Text style={styles.routeText}>
                  Khoảng cách: <Text style={styles.routeBold}>{routeInfo.distance}</Text>
                </Text>
              </View>
              <View style={styles.routeSummaryRow}>
                <MaterialIcons name="access-time" size={20} color="#FF8228" />
                <Text style={styles.routeText}>
                  Thời gian đi: <Text style={styles.routeBold}>{routeInfo.duration}</Text>
                </Text>
              </View>
            </View>
          )}

          {/* Floating Save Location Button */}
          {selectedCoord && (
            <Pressable style={styles.floatingSaveBtn} onPress={() => setShowSaveModal(true)}>
              <MaterialIcons name="bookmark-outline" size={22} color="#ffffff" />
              <Text style={styles.floatingSaveText}>Lưu địa chỉ</Text>
            </Pressable>
          )}
        </View>
      ) : isReactNativeMapsSupported ? (
        /* Giao diện bản đồ tương tác react-native-maps trên di động (Expo Go / Dev Build) */
        <View style={styles.mapContainer}>
          <MapViewRN
            ref={rnMapRef}
            style={styles.map}
            initialRegion={{
              latitude: currentCoord[1],
              longitude: currentCoord[0],
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}>
            {/* Vị trí mặc định / hiện tại */}
            <MarkerRN
              coordinate={{ latitude: currentCoord[1], longitude: currentCoord[0] }}
              title="Vị trí mặc định"
            />

            {/* Điểm được tìm kiếm và chọn */}
            {selectedCoord && (
              <MarkerRN
                coordinate={{ latitude: selectedCoord[1], longitude: selectedCoord[0] }}
                title="Vị trí đã chọn"
                description={searchQuery}
                pinColor="#F45100"
              />
            )}

            {/* Vẽ đường đi giải mã từ Goong Directions */}
            {routeCoords.length > 0 && (
              <PolylineRN
                coordinates={routeCoords.map((c) => ({
                  latitude: c[1],
                  longitude: c[0],
                }))}
                strokeColor="#2E64FE"
                strokeWidth={5}
              />
            )}
          </MapViewRN>

          {/* Floating Directions Route Summary */}
          {routeInfo && (
            <View style={styles.routeSummaryCard}>
              <View style={styles.routeSummaryRow}>
                <MaterialIcons name="directions-car" size={20} color="#FF8228" />
                <Text style={styles.routeText}>
                  Khoảng cách: <Text style={styles.routeBold}>{routeInfo.distance}</Text>
                </Text>
              </View>
              <View style={styles.routeSummaryRow}>
                <MaterialIcons name="access-time" size={20} color="#FF8228" />
                <Text style={styles.routeText}>
                  Thời gian đi: <Text style={styles.routeBold}>{routeInfo.duration}</Text>
                </Text>
              </View>
            </View>
          )}

          {/* Floating Save Location Button */}
          {selectedCoord && (
            <Pressable style={styles.floatingSaveBtn} onPress={() => setShowSaveModal(true)}>
              <MaterialIcons name="bookmark-outline" size={22} color="#ffffff" />
              <Text style={styles.floatingSaveText}>Lưu địa chỉ</Text>
            </Pressable>
          )}
        </View>
      ) : (
        /* Giao diện bản đồ giả lập trên Web hoặc khi không có native module nào */
        <View style={styles.webFallbackContainer}>
          <View style={styles.mockMapBackground}>
            {/* Grid background */}
            <View style={styles.mockMapGrid} />

            {/* Hanoi center location */}
            <View style={[styles.mockMapPoint, { top: '50%', left: '35%' }]}>
              <View style={styles.currentMarkerContainer}>
                <View style={styles.currentMarkerCore} />
              </View>
              <Text style={styles.mockMapPointText}>Vị trí của bạn</Text>
            </View>

            {/* Selected destination pin */}
            {selectedCoord && (
              <View style={[styles.mockMapPoint, { top: '30%', left: '60%' }]}>
                <MaterialIcons name="location-on" size={32} color="#F45100" />
                <Text style={styles.mockMapPointTextSelected}>Điểm đã chọn</Text>
              </View>
            )}

            {/* Simulated route line */}
            {routeInfo && <View style={styles.mockRouteLine} />}

            <View style={styles.mockMapOverlay}>
              <MaterialIcons name="info-outline" size={16} color="#622a00" />
              <Text style={styles.mockMapOverlayText}>
                Đang chạy chế độ bản đồ giả lập (Expo Go)
              </Text>
            </View>
          </View>

          {/* Floating Directions Route Summary */}
          {routeInfo && (
            <View style={styles.routeSummaryCard}>
              <View style={styles.routeSummaryRow}>
                <MaterialIcons name="directions-car" size={20} color="#FF8228" />
                <Text style={styles.routeText}>
                  Khoảng cách: <Text style={styles.routeBold}>{routeInfo.distance}</Text>
                </Text>
              </View>
              <View style={styles.routeSummaryRow}>
                <MaterialIcons name="access-time" size={20} color="#FF8228" />
                <Text style={styles.routeText}>
                  Thời gian đi: <Text style={styles.routeBold}>{routeInfo.duration}</Text>
                </Text>
              </View>
            </View>
          )}

          {/* Floating Save Location Button */}
          {selectedCoord && (
            <Pressable style={styles.floatingSaveBtn} onPress={() => setShowSaveModal(true)}>
              <MaterialIcons name="bookmark-outline" size={22} color="#ffffff" />
              <Text style={styles.floatingSaveText}>Lưu địa chỉ</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Inputs and Addresses Segment */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.searchSection}>
          {/* Autocomplete Input Search */}
          <View style={styles.searchBarContainer}>
            <MaterialIcons name="search" size={24} color="#818A91" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm địa chỉ hoặc nhập thủ công"
              placeholderTextColor="#9A9A9A"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchLoading ? (
              <ActivityIndicator size="small" color="#FF8228" style={styles.searchLoader} />
            ) : searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color="#818A91" />
              </Pressable>
            ) : null}
          </View>

          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {suggestions.map((item, index) => (
                <Pressable
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => handleSelectSuggestion(item)}>
                  <MaterialIcons name="location-on" size={18} color="#818A91" />
                  <Text style={styles.suggestionText} numberOfLines={2}>
                    {item.description}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Current location triggers */}
          <Pressable
            style={styles.currentLocationBtn}
            onPress={handleUseCurrentLocation}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#FF8228" />
            ) : (
              <>
                <MaterialIcons name="my-location" size={20} color="#FF8228" />
                <Text style={styles.currentLocationText}>Dùng vị trí hiện tại</Text>
              </>
            )}
          </Pressable>

          {/* Address List CRUD */}
          <View style={styles.addressListContainer}>
            <Text style={styles.sectionTitle}>Địa chỉ đã lưu</Text>

            {addresses.map((item) => (
              <Pressable
                key={item.id}
                style={[
                  styles.addressCard,
                  selectedAddressId === item.id && styles.addressCardSelected,
                ]}
                onPress={() => {
                  if (item.id) {
                    setSelectedAddressId(item.id);
                    const coord: [number, number] = [item.lng, item.lat];
                    setCurrentCoord(coord);
                    if (isMapLibreSupported) {
                      cameraRef.current?.setCamera({
                        centerCoordinate: coord,
                        zoomLevel: 14,
                        animationDuration: 1000,
                      });
                    } else if (isReactNativeMapsSupported) {
                      rnMapRef.current?.animateToRegion(
                        {
                          latitude: coord[1],
                          longitude: coord[0],
                          latitudeDelta: 0.02,
                          longitudeDelta: 0.02,
                        },
                        1000
                      );
                    }
                  }
                }}>
                <View style={styles.addressIconWrapper}>
                  <MaterialIcons name="place" size={24} color="#FF8228" />
                </View>

                <View style={styles.addressDetails}>
                  <View style={styles.addressLabelRow}>
                    <Text style={styles.addressLabel}>{item.label}</Text>
                    {item.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Mặc định</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.addressBody}>
                    {item.detail}, {item.ward}, {item.district}, {item.city}
                  </Text>
                </View>

                <View style={styles.addressActions}>
                  {!item.isDefault && (
                    <Pressable style={styles.actionBtn} onPress={() => handleSetDefault(item)}>
                      <MaterialIcons name="check" size={20} color="#818A91" />
                    </Pressable>
                  )}
                  <Pressable style={styles.actionBtn} onPress={() => handleDeleteAddress(item.id)}>
                    <MaterialIcons name="delete-outline" size={20} color="#BA1A1A" />
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Modal Dialog for saving an address */}
      <Modal visible={showSaveModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Lưu địa chỉ mới</Text>

            <View style={styles.modalForm}>
              <Text style={styles.modalLabel}>Nhãn địa chỉ</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ví dụ: Nhà riêng, Công ty, Bố mẹ..."
                placeholderTextColor="#9A9A9A"
                value={newLabel}
                onChangeText={setNewLabel}
              />

              <Text style={styles.modalLabel}>Địa chỉ chi tiết (tùy chọn)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputArea]}
                multiline
                numberOfLines={3}
                placeholder="Số nhà, ngõ ngách, tên tòa nhà..."
                placeholderTextColor="#9A9A9A"
                value={newDetail}
                onChangeText={setNewDetail}
              />
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowSaveModal(false)}>
                <Text style={styles.modalBtnCancelText}>Hủy</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleSaveAddress}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalBtnSaveText}>Lưu lại</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Persistent Bottom bar */}
      <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Tiếp tục</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#DDDDDD',
    zIndex: 10,
  },
  backButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    marginLeft: 6,
    color: '#383838',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
  },
  mapContainer: {
    height: 300,
    width: '100%',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  currentMarkerContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 112, 233, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  currentMarkerCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0070E9',
  },
  selectedMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeSummaryCard: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  routeSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeText: {
    color: '#383838',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
  },
  routeBold: {
    fontFamily: 'Montserrat_700Bold',
    color: '#FF8228',
  },
  floatingSaveBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF8228',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  floatingSaveText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
  webFallbackContainer: {
    height: 300,
    width: '100%',
    position: 'relative',
  },
  mockMapBackground: {
    flex: 1,
    backgroundColor: '#e5e9f0',
    position: 'relative',
    overflow: 'hidden',
  },
  mockMapGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
    borderWidth: 1,
    borderColor: '#4c566a',
    borderStyle: 'dashed',
  },
  mockMapPoint: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockMapPointText: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#0070E9',
    marginTop: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0070E9',
  },
  mockMapPointTextSelected: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#F45100',
    marginTop: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F45100',
  },
  mockRouteLine: {
    position: 'absolute',
    top: '38%',
    left: '38%',
    width: '24%',
    height: 2,
    borderWidth: 1.5,
    borderColor: '#2E64FE',
    borderStyle: 'dashed',
    transform: [{ rotate: '-35deg' }],
  },
  mockMapOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFE6D5',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF8228',
  },
  mockMapOverlayText: {
    color: '#622a00',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    height: 52,
    paddingHorizontal: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: '#383838',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 15,
  },
  searchLoader: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    maxHeight: 200,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderColor: '#f5f3f2',
  },
  suggestionText: {
    flex: 1,
    color: '#383838',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
  },
  currentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#FF8228',
    borderRadius: 10,
    height: 46,
    marginBottom: 20,
    marginTop: 8,
  },
  currentLocationText: {
    color: '#FF8228',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
  addressListContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    color: '#383838',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    marginBottom: 14,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  addressCardSelected: {
    borderColor: '#FF8228',
  },
  addressIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE6D5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addressDetails: {
    flex: 1,
  },
  addressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  addressLabel: {
    color: '#383838',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
  },
  defaultBadge: {
    backgroundColor: '#E7F8FC',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    color: '#01677d',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 9,
  },
  addressBody: {
    color: '#818A91',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  actionBtn: {
    padding: 6,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fbf9f8',
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderColor: '#efedec',
  },
  continueButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FF8228',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF8228',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  continueButtonText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  modalTitle: {
    color: '#383838',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalForm: {
    gap: 12,
    marginBottom: 20,
  },
  modalLabel: {
    color: '#4A4A4A',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 12,
    color: '#383838',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    backgroundColor: '#fbf9f8',
  },
  modalInputArea: {
    height: 72,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtn: {
    borderRadius: 10,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalBtnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  modalBtnCancelText: {
    color: '#818A91',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
  modalBtnSave: {
    backgroundColor: '#FF8228',
    minWidth: 100,
  },
  modalBtnSaveText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
});
