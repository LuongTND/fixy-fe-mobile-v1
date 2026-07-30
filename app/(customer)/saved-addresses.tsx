import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Address, createAddress, deleteAddress, getMyAddresses, updateAddress } from '@/services/api/addresses';
import {
  cleanSearchText,
  ProvinceOption,
  vietnamProvincesApi,
  WardOption,
} from '@/services/api/provinces';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export default function SavedAddressesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Address List Query
  const { data: addresses = [], isLoading } = useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const data = await getMyAddresses();
      return data || [];
    },
  });

  // Fetch Vietnam Provinces API
  const { data: provinces = [] } = useQuery<ProvinceOption[]>({
    queryKey: ['provincesList'],
    queryFn: vietnamProvincesApi.getProvinces,
  });

  // Manual Add Modal States
  const [showManualModal, setShowManualModal] = React.useState(false);
  const [pickerMode, setPickerMode] = React.useState<'form' | 'province' | 'ward'>('form');

  const [label, setLabel] = React.useState('');
  const [detail, setDetail] = React.useState('');
  const [ward, setWard] = React.useState('');
  const [city, setCity] = React.useState('Thành phố Đà Nẵng');

  const [selectedProvinceCode, setSelectedProvinceCode] = React.useState<number | null>(null);
  const [selectedProvinceName, setSelectedProvinceName] = React.useState('Thành phố Đà Nẵng');

  // Search filters
  const [provinceSearch, setProvinceSearch] = React.useState('');
  const [wardSearch, setWardSearch] = React.useState('');

  // Fetch Wards for Selected Province
  const { data: wards = [], isLoading: isLoadingWards } = useQuery<WardOption[]>({
    queryKey: ['wardsList', selectedProvinceCode],
    queryFn: () => (selectedProvinceCode ? vietnamProvincesApi.getWardsForProvince(selectedProvinceCode) : []),
    enabled: !!selectedProvinceCode,
  });

  // Auto-select Da Nang or default province when provinces load
  React.useEffect(() => {
    if (provinces.length > 0 && !selectedProvinceCode) {
      const daNang = provinces.find((p) => cleanSearchText(p.name).includes('da nang')) || provinces[0];
      if (daNang) {
        setSelectedProvinceCode(daNang.code);
        setSelectedProvinceName(daNang.name);
        setCity(daNang.name);
      }
    }
  }, [provinces]);

  // Set Default Mutation
  const setDefaultMutation = useMutation({
    mutationFn: (addr: Address) => updateAddress(addr.id!, { ...addr, isDefault: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (err, addr) => {
      queryClient.setQueryData<Address[]>(['addresses'], (old) =>
        (old || []).map((a) => ({
          ...a,
          isDefault: a.id === addr.id,
        }))
      );
      Alert.alert('Lỗi', 'Không thể thiết lập địa chỉ mặc định.');
    },
  });

  // Delete Address Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (err, id) => {
      queryClient.setQueryData<Address[]>(['addresses'], (old) =>
        (old || []).filter((a) => a.id !== id)
      );
      Alert.alert('Lỗi', 'Không thể xóa địa chỉ.');
    },
  });

  // Create Manual Address Mutation
  const createMutation = useMutation({
    mutationFn: (newAddr: Omit<Address, 'id'>) => createAddress(newAddr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setShowManualModal(false);
      resetManualForm();
      Alert.alert('Thành công', 'Đã thêm địa chỉ mới.');
    },
    onError: (err: any) => {
      console.error('[saved-addresses] Error creating address:', err);
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể thêm địa chỉ.');
    },
  });

  const resetManualForm = () => {
    setLabel('');
    setDetail('');
    setWard('');
    setPickerMode('form');
  };

  const handleCreateManualAddress = () => {
    if (!label.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên nhãn (ví dụ: Nhà riêng, Văn phòng...)');
      return;
    }
    if (!detail.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập chi tiết số nhà, tên đường.');
      return;
    }

    createMutation.mutate({
      label: label.trim(),
      detail: detail.trim(),
      ward: ward.trim() || 'Phường Hải Châu 1',
      city: city.trim() || 'Thành phố Đà Nẵng',
      lat: 0,
      lng: 0,
      isDefault: addresses.length === 0,
    });
  };

  const handleSetDefault = (addr: Address) => {
    if (!addr.id) return;
    setDefaultMutation.mutate(addr);
  };

  const handleDeleteAddress = (id?: string) => {
    if (!id) return;
    Alert.alert('Xóa địa chỉ', 'Bạn có muốn xóa địa chỉ này khỏi danh sách đã lưu?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  };

  const getAddressIcon = (labelName: string) => {
    const norm = (labelName || '').toLowerCase();
    if (norm.includes('nhà') || norm.includes('home')) {
      return 'home';
    }
    if (
      norm.includes('công ty') ||
      norm.includes('văn phòng') ||
      norm.includes('work') ||
      norm.includes('cơ quan')
    ) {
      return 'business';
    }
    return 'place';
  };

  // Filtered lists for pickers
  const filteredProvinces = provinces.filter((p) =>
    cleanSearchText(p.name).includes(cleanSearchText(provinceSearch))
  );

  const filteredWards = wards.filter((w) =>
    cleanSearchText(w.name).includes(cleanSearchText(wardSearch))
  );

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={26} color="#1B1C1C" />
        </Pressable>
        <Text style={styles.brand}>Địa chỉ đã lưu</Text>
      </View>

      {/* Main Content */}
      {isLoading && addresses.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0F382C" />
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="location-off" size={60} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Chưa có địa chỉ nào</Text>
          <Text style={styles.emptySub}>
            Thêm địa chỉ thủ công hoặc chọn từ bản đồ GPS để đặt dịch vụ nhanh chóng.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.addressListContainer}>
            {addresses.map((item) => (
              <View key={item.id || item.label} style={styles.addressCard}>
                <View style={styles.addressIconWrapper}>
                  <MaterialIcons name={getAddressIcon(item.label)} size={24} color="#0F382C" />
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
                    {[item.detail, item.ward, item.district, item.city].filter(Boolean).join(', ')}
                  </Text>
                </View>

                <View style={styles.addressActions}>
                  {!item.isDefault && (
                    <Pressable style={styles.actionBtn} onPress={() => handleSetDefault(item)}>
                      <MaterialIcons name="check-circle-outline" size={22} color="#818A91" />
                    </Pressable>
                  )}
                  <Pressable style={styles.actionBtn} onPress={() => handleDeleteAddress(item.id)}>
                    <MaterialIcons name="delete-outline" size={22} color="#BA1A1A" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Floating Bottom Actions (Manual Entry + GPS Map) */}
      <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          style={styles.manualButton}
          onPress={() => {
            setPickerMode('form');
            setShowManualModal(true);
          }}>
          <MaterialIcons name="edit" size={20} color="#0F382C" />
          <Text style={styles.manualButtonText}>Nhập thủ công</Text>
        </Pressable>

        <Pressable style={styles.gpsButton} onPress={() => router.push('/location-setup' as any)}>
          <MaterialIcons name="map" size={20} color="#ffffff" />
          <Text style={styles.gpsButtonText}>Định vị GPS</Text>
        </Pressable>
      </View>

      {/* Manual Add Address Single Modal (Supports View Switching) */}
      <Modal visible={showManualModal} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowManualModal(false)} />
          <View style={styles.modalContent}>
            {pickerMode === 'form' ? (
              /* VIEW 1: FORM NHẬP */
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Thêm địa chỉ thủ công</Text>
                  <Pressable onPress={() => setShowManualModal(false)} style={styles.modalCloseBtn}>
                    <MaterialIcons name="close" size={22} color="#6B7280" />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={styles.inputLabel}>Tên nhãn địa chỉ *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ví dụ: Nhà riêng, Công ty, Căn hộ..."
                    placeholderTextColor="#9CA3AF"
                    value={label}
                    onChangeText={setLabel}
                  />

                  {/* Province Selector Button */}
                  <Text style={styles.inputLabel}>Tỉnh / Thành phố *</Text>
                  <Pressable
                    style={styles.selectorBtn}
                    onPress={() => setPickerMode('province')}>
                    <Text style={[styles.selectorBtnText, !selectedProvinceName && { color: '#9CA3AF' }]}>
                      {selectedProvinceName || 'Chọn Tỉnh / Thành phố'}
                    </Text>
                    <MaterialIcons name="chevron-right" size={22} color="#6B7280" />
                  </Pressable>

                  {/* Ward Selector Button */}
                  <Text style={styles.inputLabel}>Phường / Xã</Text>
                  <Pressable
                    style={[styles.selectorBtn, !selectedProvinceCode && { opacity: 0.5 }]}
                    onPress={() => {
                      if (!selectedProvinceCode) {
                        Alert.alert('Thông báo', 'Vui lòng chọn Tỉnh / Thành phố trước.');
                        return;
                      }
                      setPickerMode('ward');
                    }}>
                    <Text style={[styles.selectorBtnText, !ward && { color: '#9CA3AF' }]}>
                      {ward || 'Chọn Phường / Xã'}
                    </Text>
                    <MaterialIcons name="chevron-right" size={22} color="#6B7280" />
                  </Pressable>

                  <Text style={styles.inputLabel}>Chi tiết số nhà, tên đường *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ví dụ: 123 Nguyễn Văn Linh"
                    placeholderTextColor="#9CA3AF"
                    value={detail}
                    onChangeText={setDetail}
                  />

                  <Pressable
                    style={[styles.saveModalBtn, createMutation.isPending && styles.saveModalBtnDisabled]}
                    onPress={handleCreateManualAddress}
                    disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.saveModalBtnText}>Lưu địa chỉ</Text>
                    )}
                  </Pressable>
                </ScrollView>
              </>
            ) : pickerMode === 'province' ? (
              /* VIEW 2: CHỌN TỈNH / THÀNH PHỐ */
              <>
                <View style={styles.modalHeader}>
                  <Pressable onPress={() => setPickerMode('form')} style={styles.backPickerBtn}>
                    <MaterialIcons name="arrow-back" size={22} color="#0F382C" />
                  </Pressable>
                  <Text style={styles.modalTitle}>Chọn Tỉnh / Thành phố</Text>
                  <View style={{ width: 24 }} />
                </View>

                <View style={styles.searchBox}>
                  <MaterialIcons name="search" size={20} color="#9CA3AF" style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm Tỉnh / Thành phố..."
                    placeholderTextColor="#9CA3AF"
                    value={provinceSearch}
                    onChangeText={setProvinceSearch}
                  />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 350 }}>
                  {filteredProvinces.map((p) => (
                    <Pressable
                      key={p.code}
                      style={styles.pickerItemRow}
                      onPress={() => {
                        setSelectedProvinceCode(p.code);
                        setSelectedProvinceName(p.name);
                        setCity(p.name);
                        setWard('');
                        setPickerMode('form');
                        setProvinceSearch('');
                      }}>
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedProvinceCode === p.code && styles.pickerItemActive,
                        ]}>
                        {p.name}
                      </Text>
                      {selectedProvinceCode === p.code && (
                        <MaterialIcons name="check" size={20} color="#0F382C" />
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : (
              /* VIEW 3: CHỌN PHƯỜNG / XÃ */
              <>
                <View style={styles.modalHeader}>
                  <Pressable onPress={() => setPickerMode('form')} style={styles.backPickerBtn}>
                    <MaterialIcons name="arrow-back" size={22} color="#0F382C" />
                  </Pressable>
                  <Text style={styles.modalTitle}>Chọn Phường / Xã</Text>
                  <View style={{ width: 24 }} />
                </View>

                <View style={styles.searchBox}>
                  <MaterialIcons name="search" size={20} color="#9CA3AF" style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm Phường / Xã..."
                    placeholderTextColor="#9CA3AF"
                    value={wardSearch}
                    onChangeText={setWardSearch}
                  />
                </View>

                {isLoadingWards ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#0F382C" />
                  </View>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 350 }}>
                    {filteredWards.map((w) => (
                      <Pressable
                        key={w.code}
                        style={styles.pickerItemRow}
                        onPress={() => {
                          setWard(w.name);
                          setPickerMode('form');
                          setWardSearch('');
                        }}>
                        <Text
                          style={[
                            styles.pickerItemText,
                            ward === w.name && styles.pickerItemActive,
                          ]}>
                          {w.name}
                        </Text>
                        {ward === w.name && <MaterialIcons name="check" size={20} color="#0F382C" />}
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FBF9F5',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#EFECE6',
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#0F382C',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#1C2526',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    marginTop: 12,
  },
  emptySub: {
    color: '#6B7280',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  scrollContent: {
    padding: 16,
  },
  addressListContainer: {
    marginTop: 8,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFECE6',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0F382C',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  addressIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F4F1EA',
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
    marginBottom: 4,
  },
  addressLabel: {
    color: '#1C2526',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
  },
  defaultBadge: {
    backgroundColor: '#F2F7F2',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#C6DFC6',
  },
  defaultBadgeText: {
    color: '#0F382C',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 9,
  },
  addressBody: {
    color: '#818A91',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 8,
  },
  actionBtn: {
    padding: 4,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FBF9F5',
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderColor: '#EFECE6',
    flexDirection: 'row',
    gap: 12,
    zIndex: 99,
    elevation: 10,
  },
  manualButton: {
    flex: 1,
    height: 50,
    borderRadius: 20,
    backgroundColor: '#E6F0EB',
    borderWidth: 1,
    borderColor: '#B8D4C8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  manualButtonText: {
    color: '#0F382C',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
  },
  gpsButton: {
    flex: 1,
    height: 50,
    borderRadius: 20,
    backgroundColor: '#0F382C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#0F382C',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  gpsButtonText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  modalTitle: {
    color: '#0F382C',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
  },
  modalCloseBtn: {
    padding: 4,
  },
  backPickerBtn: {
    padding: 4,
    marginRight: 8,
  },
  inputLabel: {
    color: '#374151',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    color: '#111827',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
  },
  selectorBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorBtnText: {
    color: '#111827',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
  },
  saveModalBtn: {
    height: 50,
    borderRadius: 20,
    backgroundColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  saveModalBtnDisabled: {
    opacity: 0.6,
  },
  saveModalBtnText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#1F2937',
  },
  pickerItemRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerItemText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#374151',
  },
  pickerItemActive: {
    fontFamily: 'Montserrat_700Bold',
    color: '#0F382C',
  },
});
