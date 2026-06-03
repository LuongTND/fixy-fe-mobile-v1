import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Address, deleteAddress, getMyAddresses, updateAddress } from '@/services/api/addresses';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function SavedAddressesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: addresses = [], isLoading } = useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const data = await getMyAddresses();
      return data || [];
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (addr: Address) => updateAddress(addr.id!, { ...addr, isDefault: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (err, addr) => {
      // Optimistic cache fallback
      queryClient.setQueryData<Address[]>(['addresses'], (old) =>
        (old || []).map((a) => ({
          ...a,
          isDefault: a.id === addr.id,
        }))
      );
      Alert.alert('Lỗi', 'Không thể thiết lập địa chỉ mặc định.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (err, id) => {
      // Optimistic cache fallback
      queryClient.setQueryData<Address[]>(['addresses'], (old) =>
        (old || []).filter((a) => a.id !== id)
      );
      Alert.alert('Lỗi', 'Không thể xóa địa chỉ.');
    },
  });

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

  // Select suitable icon based on address label name
  const getAddressIcon = (label: string) => {
    const norm = label.toLowerCase();
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
          <ActivityIndicator size="large" color="#FF8228" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.addressListContainer}>
            {addresses.map((item) => (
              <View key={item.id} style={styles.addressCard}>
                <View style={styles.addressIconWrapper}>
                  <MaterialIcons name={getAddressIcon(item.label)} size={24} color="#FF8228" />
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

      {/* Floating Add New Address Button */}
      <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable style={styles.addButton} onPress={() => router.push('/location-setup' as any)}>
          <MaterialIcons name="add" size={22} color="#ffffff" />
          <Text style={styles.addButtonText}>Thêm địa chỉ mới</Text>
        </Pressable>
      </View>
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 4,
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
    backgroundColor: '#fbf9f8',
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderColor: '#efedec',
  },
  addButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FF8228',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#FF8228',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  addButtonText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
  },
});
