import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';

import { Address, getMyAddresses } from '@/services/api/addresses';
import { createDraft } from '@/services/api/bookings';
import { uploadMediaFiles } from '@/services/api/media';
import { checkAvailability } from '@/services/api/workers';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/services/api/client';

const TIME_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

export default function BookingSetupScreen() {
  const insets = useSafeAreaInsets();
  const { categoryId, workerProfileId, workerUserId, autoMatch } = useLocalSearchParams<{
    categoryId: string;
    workerProfileId?: string;
    workerUserId?: string;
    autoMatch: string;
  }>();

  // Address State from TanStack Query
  const { data: addresses = [], isLoading: loading } = useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: getMyAddresses,
  });

  const [selectedAddress, setSelectedAddress] = React.useState<Address | null>(null);
  const [showAddressModal, setShowAddressModal] = React.useState(false);

  // Form states
  const [description, setDescription] = React.useState('');
  const [scheduledType, setScheduledType] = React.useState<number>(0); // 0 = NOW, 1 = SCHEDULED
  const [selectedDateId, setSelectedDateId] = React.useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = React.useState<string>(TIME_SLOTS[0]);
  const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
  const [activePreviewImage, setActivePreviewImage] = React.useState<string | null>(null);
  const [checkingAvailability, setCheckingAvailability] = React.useState(false);

  // Generate next 7 days for scheduler
  const daysList = React.useMemo(() => {
    const days = [];
    const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const id = d.toISOString().split('T')[0];
      days.push({
        id,
        weekday: weekdays[d.getDay()],
        dayLabel: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`,
        dateObj: d,
      });
    }
    return days;
  }, []);

  React.useEffect(() => {
    // Select today's date by default
    if (daysList.length > 0) {
      setSelectedDateId(daysList[0].id);
    }
  }, [daysList]);

  // Set default address when loaded
  React.useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddress) {
      const def = addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddress(def);
    }
  }, [addresses, selectedAddress]);

  const createBookingMutation = useMutation({
    mutationFn: async (params: {
      description: string;
      selectedImages: string[];
      scheduledType: number;
      scheduledAt?: string;
    }) => {
      // Step A: Upload photos if any
      let uploadedIds: string[] = [];
      if (params.selectedImages.length > 0) {
        uploadedIds = await uploadMediaFiles(params.selectedImages);
      }

      // Step B: Create draft
      const payload = {
        categoryId: categoryId || 'dien',
        description: params.description.trim(),
        mediaIds: uploadedIds,
        addressId: selectedAddress?.id,
        address: `${selectedAddress?.detail}, ${selectedAddress?.ward}, ${selectedAddress?.district}, ${selectedAddress?.city}`,
        lat: selectedAddress?.lat ?? 0,
        lng: selectedAddress?.lng ?? 0,
        scheduledType: params.scheduledType,
        scheduledAt: params.scheduledAt,
        workerProfileId: workerProfileId || undefined,
        autoMatch: autoMatch === 'true',
      };

      return createDraft(payload);
    },
    onSuccess: (draft) => {
      if (draft.id) {
        router.push(`/booking-checkout?draftId=${draft.id}&workerUserId=${workerUserId || ''}` as any);
      } else {
        throw new Error('No draft ID returned');
      }
    },
    onError: (error) => {
      console.error('Error in handleContinue:', error);
      const msg = getApiErrorMessage(error);
      Alert.alert('Lỗi', msg);
    },
  });

  const submitLoading = createBookingMutation.isPending || checkingAvailability;

  const handlePickImage = async () => {
    if (selectedImages.length >= 5) {
      Alert.alert('Giới hạn', 'Bạn chỉ có thể chọn tối đa 5 hình ảnh.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 5 - selectedImages.length,
        quality: 0.5,
      });

      if (!result.canceled) {
        const uris = result.assets.map((asset) => asset.uri);
        setSelectedImages((prev) => [...prev, ...uris].slice(0, 5));
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh từ thư viện.');
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContinue = async () => {
    if (!selectedAddress) {
      Alert.alert('Chưa có địa chỉ', 'Vui lòng thêm hoặc chọn địa chỉ nhận thợ.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Nhập mô tả', 'Vui lòng nhập mô tả sự cố để thợ nắm rõ công việc.');
      return;
    }

    // Calculate scheduledAt string if scheduled
    let scheduledAt: string | undefined = undefined;
    if (scheduledType === 1) {
      const targetDay = daysList.find((d) => d.id === selectedDateId);
      if (targetDay) {
        const [hours, minutes] = selectedTimeSlot.split(':');
        const scheduledDateObj = new Date(targetDay.dateObj);
        scheduledDateObj.setHours(parseInt(hours, 10));
        scheduledDateObj.setMinutes(parseInt(minutes, 10));
        scheduledDateObj.setSeconds(0);
        scheduledAt = scheduledDateObj.toISOString();
      }
    } else {
      scheduledAt = new Date().toISOString();
    }

    if (workerProfileId && scheduledAt) {
      setCheckingAvailability(true);
      try {
        const isAvailable = await checkAvailability(workerProfileId, scheduledAt);
        if (!isAvailable) {
          Alert.alert(
            'Thợ không khả dụng',
            'Kỹ thuật viên không làm việc hoặc đã đăng ký nghỉ vào khung giờ này.'
          );
          return;
        }
      } finally {
        setCheckingAvailability(false);
      }
    }

    createBookingMutation.mutate({
      description,
      selectedImages,
      scheduledType,
      scheduledAt,
    });
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
        <Text style={styles.brand}>Đặt lịch sửa chữa</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF8228" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Section: Location Address Selection */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="my-location" size={20} color="#FF8228" />
              <Text style={styles.sectionTitle}>Địa chỉ nhận thợ</Text>
            </View>

            {selectedAddress ? (
              <View style={styles.addressDisplayRow}>
                <View style={styles.addressTextCol}>
                  <Text style={styles.addressLabel}>{selectedAddress.label}</Text>
                  <Text style={styles.addressDetailText}>
                    {selectedAddress.detail}, {selectedAddress.ward}, {selectedAddress.district},{' '}
                    {selectedAddress.city}
                  </Text>
                </View>
                <Pressable
                  style={styles.changeAddressBtn}
                  onPress={() => {
                    if (addresses.length > 0) {
                      setShowAddressModal(true);
                    } else {
                      router.push('/saved-addresses' as any);
                    }
                  }}>
                  <Text style={styles.changeAddressText}>Thay đổi</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.addAddressPrompt}
                onPress={() => router.push('/saved-addresses' as any)}>
                <MaterialIcons name="add-location" size={24} color="#FF8228" />
                <Text style={styles.addAddressPromptText}>Thêm địa chỉ giao nhận thợ</Text>
              </Pressable>
            )}
          </View>

          {/* Section: Schedule Setting */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="access-time" size={20} color="#FF8228" />
              <Text style={styles.sectionTitle}>Thời gian sửa chữa</Text>
            </View>

            {/* Schedule Type Tabs */}
            <View style={styles.tabsRow}>
              <Pressable
                style={[styles.tabBtn, scheduledType === 0 && styles.tabBtnActive]}
                onPress={() => setScheduledType(0)}>
                <Text style={[styles.tabBtnText, scheduledType === 0 && styles.tabBtnTextActive]}>
                  Ngay bây giờ
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tabBtn, scheduledType === 1 && styles.tabBtnActive]}
                onPress={() => setScheduledType(1)}>
                <Text style={[styles.tabBtnText, scheduledType === 1 && styles.tabBtnTextActive]}>
                  Đặt lịch sau
                </Text>
              </Pressable>
            </View>

            {/* DateTime Selector (Visible only if SCHEDULED selected) */}
            {scheduledType === 1 && (
              <View style={styles.dateTimeSelectorContainer}>
                {/* Horizontal Date Picker */}
                <Text style={styles.fieldLabel}>Chọn ngày hẹn:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.datePickerScroll}>
                  {daysList.map((day) => {
                    const isSelected = day.id === selectedDateId;
                    return (
                      <Pressable
                        key={day.id}
                        style={[styles.dateChip, isSelected && styles.dateChipActive]}
                        onPress={() => setSelectedDateId(day.id)}>
                        <Text
                          style={[styles.dateChipWeekday, isSelected && styles.dateChipTextActive]}>
                          {day.weekday}
                        </Text>
                        <Text style={[styles.dateChipDay, isSelected && styles.dateChipTextActive]}>
                          {day.dayLabel}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Grid Time Picker */}
                <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Chọn khung giờ:</Text>
                <View style={styles.timeGrid}>
                  {TIME_SLOTS.map((slot) => {
                    const isSelected = slot === selectedTimeSlot;
                    return (
                      <Pressable
                        key={slot}
                        style={[styles.timeChip, isSelected && styles.timeChipActive]}
                        onPress={() => setSelectedTimeSlot(slot)}>
                        <Text
                          style={[styles.timeChipText, isSelected && styles.timeChipTextActive]}>
                          {slot}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Section: Description of issues */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="description" size={20} color="#FF8228" />
              <Text style={styles.sectionTitle}>Mô tả sự cố & yêu cầu</Text>
            </View>

            <TextInput
              style={styles.issueInput}
              multiline
              numberOfLines={4}
              placeholder="Vui lòng mô tả chi tiết vấn đề (ví dụ: máy điều hòa Panasonic chảy nước ở dàn lạnh, quạt gió kêu to...)"
              placeholderTextColor="#9A9A9A"
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />

            <View style={styles.photoSectionDivider} />

            <View style={styles.sectionHeader}>
              <MaterialIcons name="photo-camera" size={20} color="#FF8228" />
              <Text style={styles.sectionTitle}>Hình ảnh hiện trạng sự cố (Tối đa 5)</Text>
            </View>

            <View style={styles.imagesContainer}>
              {selectedImages.map((uri, index) => (
                <View key={uri} style={styles.imageWrapper}>
                  <Pressable onPress={() => setActivePreviewImage(uri)}>
                    <Image source={{ uri }} style={styles.previewImage} />
                  </Pressable>
                  <Pressable
                    style={styles.removeImageBtn}
                    onPress={() => handleRemoveImage(index)}
                  >
                    <MaterialIcons name="close" size={14} color="#ffffff" />
                  </Pressable>
                </View>
              ))}

              {selectedImages.length < 5 && (
                <Pressable style={styles.addImageBtn} onPress={handlePickImage}>
                  <MaterialIcons name="add-a-photo" size={24} color="#FF8228" />
                  <Text style={styles.addImageText}>Thêm ảnh</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.imageLimitText}>
              Chọn hình ảnh sắc nét giúp kỹ thuật viên dễ dàng đánh giá sự cố.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Floating Continue Button */}
      <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable
          style={[
            styles.continueButton,
            (!selectedAddress || submitLoading) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedAddress || submitLoading}>
          {submitLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.continueButtonText}>Tiếp tục</Text>
          )}
        </Pressable>
      </View>

      {/* Address Selection Modal */}
      <Modal visible={showAddressModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn địa chỉ nhận thợ</Text>
              <Pressable onPress={() => setShowAddressModal(false)}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {addresses.map((item) => (
                <Pressable
                  key={item.id}
                  style={[
                    styles.modalAddressItem,
                    selectedAddress?.id === item.id && styles.modalAddressItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedAddress(item);
                    setShowAddressModal(false);
                  }}>
                  <MaterialIcons name="place" size={22} color="#FF8228" />
                  <View style={styles.modalAddressTextCol}>
                    <Text style={styles.modalAddressLabel}>{item.label}</Text>
                    <Text style={styles.modalAddressBody}>
                      {item.detail}, {item.ward}, {item.district}, {item.city}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              style={styles.modalAddBtn}
              onPress={() => {
                setShowAddressModal(false);
                router.push('/saved-addresses' as any);
              }}>
              <MaterialIcons name="add" size={20} color="#FF8228" />
              <Text style={styles.modalAddBtnText}>Thêm địa chỉ mới</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Full-screen Image Preview Modal */}
      <Modal
        visible={activePreviewImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActivePreviewImage(null)}>
        <Pressable
          style={styles.previewOverlay}
          onPress={() => setActivePreviewImage(null)}>
          {activePreviewImage ? (
            <Image
              source={{ uri: activePreviewImage }}
              style={styles.previewFullImage}
              resizeMode="contain"
            />
          ) : null}
          <Pressable
            style={styles.previewCloseBtn}
            onPress={() => setActivePreviewImage(null)}>
            <MaterialIcons name="close" size={24} color="#ffffff" />
          </Pressable>
        </Pressable>
      </Modal>
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#383838',
  },
  addressDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fbf9f8',
    borderWidth: 1,
    borderColor: '#efedec',
    borderRadius: 10,
    padding: 12,
  },
  addressTextCol: {
    flex: 1,
    marginRight: 8,
  },
  addressLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#383838',
    marginBottom: 2,
  },
  addressDetailText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    lineHeight: 16,
  },
  changeAddressBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  changeAddressText: {
    color: '#FF8228',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
  },
  addAddressPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFE6D5',
    borderWidth: 1,
    borderColor: '#FF8228',
    borderRadius: 10,
    height: 52,
  },
  addAddressPromptText: {
    color: '#FF8228',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#efedec',
    borderRadius: 8,
    padding: 4,
    height: 48,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#818A91',
  },
  tabBtnTextActive: {
    color: '#FF8228',
    fontFamily: 'Montserrat_700Bold',
  },
  dateTimeSelectorContainer: {
    marginTop: 10,
  },
  fieldLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#383838',
    marginBottom: 10,
  },
  datePickerScroll: {
    gap: 10,
    paddingBottom: 4,
  },
  dateChip: {
    width: 68,
    height: 60,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipActive: {
    backgroundColor: '#FFE6D5',
    borderColor: '#FF8228',
  },
  dateChipWeekday: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#818A91',
  },
  dateChipDay: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#383838',
    marginTop: 2,
  },
  dateChipTextActive: {
    color: '#FF8228',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeChip: {
    width: '22%',
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipActive: {
    backgroundColor: '#FFE6D5',
    borderColor: '#FF8228',
  },
  timeChipText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#574237',
  },
  timeChipTextActive: {
    color: '#FF8228',
    fontFamily: 'Montserrat_700Bold',
  },
  issueInput: {
    backgroundColor: '#fbf9f8',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    padding: 12,
    color: '#383838',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    height: 100,
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
  continueButtonDisabled: {
    backgroundColor: '#EAE5E3',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#f5f3f2',
  },
  modalTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#383838',
  },
  modalScroll: {
    paddingVertical: 12,
    gap: 12,
  },
  modalAddressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    gap: 10,
  },
  modalAddressItemSelected: {
    borderColor: '#FF8228',
    backgroundColor: '#FFE6D5',
  },
  modalAddressTextCol: {
    flex: 1,
  },
  modalAddressLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#383838',
  },
  modalAddressBody: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    lineHeight: 16,
    marginTop: 2,
  },
  modalAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FF8228',
    borderRadius: 10,
    height: 48,
    marginTop: 12,
  },
  modalAddBtnText: {
    color: '#FF8228',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
  photoSectionDivider: {
    height: 1,
    backgroundColor: '#efedec',
    marginVertical: 16,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  imageWrapper: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#efedec',
  },
  removeImageBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  addImageBtn: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#FF8228',
    backgroundColor: '#FFE6D5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addImageText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 9,
    color: '#FF8228',
  },
  imageLimitText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
    marginTop: 4,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewFullImage: {
    width: '90%',
    height: '80%',
  },
  previewCloseBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
