import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cleanSearchText, vietnamProvincesApi } from '@/services/api/provinces';
import { useLocationStore } from '@/store/store';

interface CitySelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCity?: (city: string) => void;
}

export function formatProvinceDisplayName(rawName: string): string {
  if (!rawName) return '';
  let cleaned = rawName.trim();
  if (/^Thành phố Hồ Chí Minh$/i.test(cleaned) || /^Tỉnh Hồ Chí Minh$/i.test(cleaned)) {
    return 'TP. Hồ Chí Minh';
  }
  cleaned = cleaned.replace(/^(Tỉnh|Thành phố)\s+/i, '');
  return cleaned;
}

export function extractProvinceFromGeocodePlace(
  place: Location.LocationGeocodedAddress | undefined,
  provincesList: string[]
): string {
  if (!place) return 'Đà Nẵng';

  const candidates = [place.region, place.city, place.subregion].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const cleaned = formatProvinceDisplayName(candidate);
    const cleanedNorm = cleanSearchText(cleaned);

    const matched = provincesList.find((p) => {
      const pNorm = cleanSearchText(p);
      return pNorm === cleanedNorm || pNorm.includes(cleanedNorm) || cleanedNorm.includes(pNorm);
    });

    if (matched) {
      return matched;
    }
  }

  const fallback = place.region || place.city || 'Đà Nẵng';
  return formatProvinceDisplayName(fallback);
}

export function CitySelectorModal({ visible, onClose, onSelectCity }: CitySelectorModalProps) {
  const insets = useSafeAreaInsets();
  const { selectedCity, setSelectedCity } = useLocationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [provinces, setProvinces] = useState<string[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCity, setGpsCity] = useState(selectedCity || 'Đà Nẵng');

  useEffect(() => {
    if (visible) {
      loadProvincesList();
    }
  }, [visible]);

  const loadProvincesList = async () => {
    try {
      setLoadingProvinces(true);
      const data = await vietnamProvincesApi.getProvinces();
      if (Array.isArray(data) && data.length > 0) {
        const formattedNames = data
          .map((p) => formatProvinceDisplayName(p.name))
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, 'vi'));
        setProvinces(formattedNames);
      }
    } catch (err) {
      console.warn('[CitySelectorModal] Error fetching provinces list:', err);
    } finally {
      setLoadingProvinces(false);
    }
  };

  const handleUpdateCurrentGpsLocation = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsLoading(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const detectedCity = extractProvinceFromGeocodePlace(place, provinces);
      if (detectedCity) {
        setGpsCity(detectedCity);
        handleSelectCity(detectedCity);
      }
    } catch (error) {
      console.warn('[CitySelectorModal] Unable to reverse geocode current GPS location', error);
    } finally {
      setGpsLoading(false);
    }
  };

  const filteredProvinces = useMemo(() => {
    if (!searchQuery.trim()) return provinces;
    const query = cleanSearchText(searchQuery);
    return provinces.filter((p) => cleanSearchText(p).includes(query));
  }, [provinces, searchQuery]);

  const handleSelectCity = (cityName: string) => {
    setSelectedCity(cityName);
    if (onSelectCity) {
      onSelectCity(cityName);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header bar */}
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={onClose}>
            <MaterialIcons name="arrow-back" size={24} color="#1B1C1C" />
          </Pressable>

          <View style={styles.searchInputWrapper}>
            <MaterialIcons name="search" size={20} color="#818A91" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm tỉnh thành..."
              placeholderTextColor="#9A9A9A"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <MaterialIcons name="cancel" size={18} color="#818A91" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Current GPS Location Row */}
        <View style={styles.currentGpsRow}>
          <View style={styles.gpsLeftColumn}>
            <View style={styles.gpsIconCircle}>
              <MaterialIcons name="my-location" size={20} color="#0F382C" />
            </View>
            <View>
              <Text style={styles.gpsLabel}>Vị trí hiện tại</Text>
              <Text style={styles.gpsCityName}>{gpsCity}</Text>
            </View>
          </View>

          <Pressable
            style={styles.refreshGpsBtn}
            onPress={handleUpdateCurrentGpsLocation}
            disabled={gpsLoading}>
            {gpsLoading ? (
              <ActivityIndicator size="small" color="#0F382C" />
            ) : (
              <>
                <MaterialIcons name="refresh" size={16} color="#0F382C" />
                <Text style={styles.refreshGpsText}>Cập nhật lại</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.divider} />

        {/* List of 63 Provinces & Cities */}
        {loadingProvinces ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#0F382C" />
            <Text style={styles.loadingText}>Đang tải danh sách tỉnh thành...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredProvinces}
            keyExtractor={(item, index) => `${item}-${index}`}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = item === selectedCity;
              return (
                <Pressable
                  style={[styles.provinceItem, isSelected && styles.provinceItemSelected]}
                  onPress={() => handleSelectCity(item)}>
                  <View style={styles.provinceIconCircle}>
                    <MaterialIcons
                      name="location-on"
                      size={18}
                      color="#0F382C"
                    />
                  </View>
                  <Text style={[styles.provinceName, isSelected && styles.provinceNameSelected]}>
                    {item}
                  </Text>
                  {isSelected && <MaterialIcons name="check" size={20} color="#0F382C" />}
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    padding: 6,
    borderRadius: 20,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F5F6',
    borderRadius: 24,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#1B1C1C',
  },
  currentGpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  gpsLeftColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gpsIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F2F7F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsLabel: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
  },
  gpsCityName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#1B1C1C',
    marginTop: 2,
  },
  refreshGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#F2F7F2',
  },
  refreshGpsText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#0F382C',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  listContent: {
    paddingBottom: 24,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: '#818A91',
  },
  provinceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 12,
  },
  provinceItemSelected: {
    backgroundColor: '#F2F7F2',
  },
  provinceIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F7F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  provinceName: {
    flex: 1,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#1B1C1C',
  },
  provinceNameSelected: {
    fontFamily: 'Montserrat_700Bold',
    color: '#0F382C',
  },
});
