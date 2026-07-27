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
import { checkAvailability, searchWorkers, WorkerProfile } from '@/services/api/workers';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/services/api/client';
import { fetchCategories } from '@/services/api/categories';

const CATEGORY_IMAGES = {
  water: require('../../assets/water.png'),
  hygiene: require('../../assets/hygiene.png'),
  housePaintRenovate: require('../../assets/house-paint-renovate.png'),
  furniture: require('../../assets/furniture.png'),
  bikeCar: require('../../assets/bike-car.png'),
  washingMachine: require('../../assets/washing-machine.png'),
  ac: require('../../assets/AC.png'),
  electric: require('../../assets/electric.png'),
  toiletPump: require('../../assets/toilet-pump.png'),
};

const CATEGORIES_UI_MAP: Record<string, { slug: string; image: any }> = {
  Điện: { slug: 'dien', image: CATEGORY_IMAGES.electric },
  'Sửa điện': { slug: 'dien', image: CATEGORY_IMAGES.electric },
  Nước: { slug: 'nuoc', image: CATEGORY_IMAGES.water },
  'Điều hòa': { slug: 'dieuhoa', image: CATEGORY_IMAGES.ac },
  'Điện lạnh': { slug: 'dieuhoa', image: CATEGORY_IMAGES.ac },
  'Máy giặt': { slug: 'maygiat', image: CATEGORY_IMAGES.washingMachine },
  'Xe máy': { slug: 'xemay', image: CATEGORY_IMAGES.bikeCar },
  'Ô tô': { slug: 'xemay', image: CATEGORY_IMAGES.bikeCar },
  Mộc: { slug: 'moc', image: CATEGORY_IMAGES.furniture },
  'Nội thất': { slug: 'moc', image: CATEGORY_IMAGES.furniture },
  Sơn: { slug: 'son', image: CATEGORY_IMAGES.housePaintRenovate },
  'Vệ sinh': { slug: 'vesinh', image: CATEGORY_IMAGES.hygiene },
  'Thông tắc': { slug: 'thongtac', image: CATEGORY_IMAGES.toiletPump },
  'Bồn cầu': { slug: 'thongtac', image: CATEGORY_IMAGES.toiletPump },
};

const TIME_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

export default function BookingSetupScreen() {
  const insets = useSafeAreaInsets();
  const { categoryId: paramCategoryId, workerProfileId: paramWorkerProfileId, workerUserId: paramWorkerUserId, autoMatch: paramAutoMatch } = useLocalSearchParams<{
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

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
  });

  const [selectedAddress, setSelectedAddress] = React.useState<Address | null>(null);
  const [showAddressModal, setShowAddressModal] = React.useState(false);

  // Selector states
  const [selectedCategoryId, setSelectedCategoryId] = React.useState(paramCategoryId || '');
  const [autoMatchState, setAutoMatchState] = React.useState(() => {
    if (paramWorkerProfileId) return false;
    if (paramAutoMatch === 'false') return false;
    return true; // Default to true (autoMatch) for fast booking
  });
  const [selectedWorkerProfileId, setSelectedWorkerProfileId] = React.useState(paramWorkerProfileId || '');
  const [selectedWorkerUserId, setSelectedWorkerUserId] = React.useState(paramWorkerUserId || '');

  // Form states
  const [description, setDescription] = React.useState('');
  const [scheduledType, setScheduledType] = React.useState<number>(0); // 0 = NOW, 1 = SCHEDULED
  const [selectedDateId, setSelectedDateId] = React.useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = React.useState<string>(TIME_SLOTS[0]);
  const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
  const [activePreviewImage, setActivePreviewImage] = React.useState<string | null>(null);
  const [checkingAvailability, setCheckingAvailability] = React.useState(false);

  // Fetch workers for chosen category if self-selecting
  const { data: categoryWorkers = [], isLoading: loadingWorkers } = useQuery({
    queryKey: ['workersForSetup', selectedCategoryId],
    queryFn: () => searchWorkers({ CategoryId: selectedCategoryId, PageSize: 50 }),
    enabled: !!selectedCategoryId && !autoMatchState && !paramWorkerProfileId,
  });

  // Sync categoryId and categories
  React.useEffect(() => {
    if (paramCategoryId) {
      setSelectedCategoryId(paramCategoryId);
    } else if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [paramCategoryId, categories]);

  const getCategoryImage = (categoryName: string, imageUrl?: string | null) => {
    if (imageUrl) return { uri: imageUrl };
    for (const [key, value] of Object.entries(CATEGORIES_UI_MAP)) {
      if (categoryName.toLowerCase().includes(key.toLowerCase())) {
        return value.image;
      }
    }
    return CATEGORY_IMAGES.electric;
  };

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

      // Find category GUID
      const category = categories.find((c) => c.id === selectedCategoryId || c.code === selectedCategoryId);
      const defaultCategory = categories.find((c) => c.code === 'dien');
      const categoryGuid = category?.id || defaultCategory?.id || selectedCategoryId;

      // Step B: Create draft
      const payload = {
        categoryId: categoryGuid,
        description: params.description.trim(),
        mediaIds: uploadedIds,
        addressId: selectedAddress?.id,
        address: `${selectedAddress?.detail}, ${selectedAddress?.ward}, ${selectedAddress?.district}, ${selectedAddress?.city}`,
        lat: selectedAddress?.lat ?? 0,
        lng: selectedAddress?.lng ?? 0,
        scheduledType: params.scheduledType,
        scheduledAt: params.scheduledAt,
        workerProfileId: selectedWorkerProfileId || undefined,
        autoMatch: autoMatchState,
      };

      return createDraft(payload);
    },
    onSuccess: (draft) => {
      if (draft.id) {
        router.push(
          `/booking-checkout?draftId=${draft.id}&workerUserId=${selectedWorkerUserId || ''}` as any
        );
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

    if (!selectedCategoryId) {
      Alert.alert('Chưa chọn dịch vụ', 'Vui lòng chọn loại dịch vụ cần sửa chữa.');
      return;
    }

    if (!autoMatchState && !selectedWorkerProfileId) {
      Alert.alert('Chưa chọn thợ', 'Vui lòng chọn một kỹ thuật viên hoặc chọn Ghép thợ tự động.');
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

    if (selectedWorkerProfileId && scheduledAt) {
      setCheckingAvailability(true);
      try {
        const isAvailable = await checkAvailability(selectedWorkerProfileId, scheduledAt);
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
          <ActivityIndicator size="large" color="#0F382C" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Section: Location Address Selection */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="my-location" size={20} color="#0F382C" />
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
                <MaterialIcons name="add-location" size={24} color="#0F382C" />
                <Text style={styles.addAddressPromptText}>Thêm địa chỉ giao nhận thợ</Text>
              </Pressable>
            )}
          </View>

          {/* Section: Category Selector (if not pre-selected with a specific worker) */}
          {!paramWorkerProfileId && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="build" size={20} color="#0F382C" />
                <Text style={styles.sectionTitle}>Chọn dịch vụ cần sửa chữa</Text>
              </View>
              <View style={styles.categoryGrid}>
                {categories.map((c) => {
                  const isSelected = c.id === selectedCategoryId;
                  const imgSource = getCategoryImage(c.name, c.imageUrl);
                  return (
                    <Pressable
                      key={c.id}
                      style={[styles.categoryGridCard, isSelected && styles.categoryGridCardActive]}
                      onPress={() => {
                        setSelectedCategoryId(c.id);
                        setSelectedWorkerProfileId('');
                        setSelectedWorkerUserId('');
                      }}>
                      <View style={styles.categoryGridIconFrame}>
                        <Image
                          source={imgSource}
                          style={styles.categoryGridIcon}
                          resizeMode="contain"
                        />
                      </View>
                      <Text style={[styles.categoryGridText, isSelected && styles.categoryGridTextActive]} numberOfLines={2}>
                        {c.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Section: Worker Selection & Matching Mode */}
          {!paramWorkerProfileId ? (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="people" size={20} color="#0F382C" />
                <Text style={styles.sectionTitle}>Phương thức chọn thợ</Text>
              </View>

              <View style={styles.tabsRow}>
                <Pressable
                  style={[styles.tabBtn, autoMatchState && styles.tabBtnActive]}
                  onPress={() => setAutoMatchState(true)}>
                  <Text style={[styles.tabBtnText, autoMatchState && styles.tabBtnTextActive]}>
                    Ghép thợ tự động
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.tabBtn, !autoMatchState && styles.tabBtnActive]}
                  onPress={() => setAutoMatchState(false)}>
                  <Text style={[styles.tabBtnText, !autoMatchState && styles.tabBtnTextActive]}>
                    Tôi tự chọn thợ
                  </Text>
                </Pressable>
              </View>

              {/* Worker Horizontal Scroll list (if manual mode) */}
              {!autoMatchState && (
                <View style={styles.workerSelectContainer}>
                  <Text style={styles.fieldLabel}>Chọn kỹ thuật viên:</Text>
                  {loadingWorkers ? (
                    <ActivityIndicator size="small" color="#0F382C" style={{ marginVertical: 12 }} />
                  ) : categoryWorkers.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.workerScroll}>
                      {categoryWorkers.map((w) => {
                        const isSelected = w.workerProfileId === selectedWorkerProfileId;
                        return (
                          <Pressable
                            key={w.id}
                            style={[styles.workerSelectCard, isSelected && styles.workerSelectCardActive]}
                            onPress={() => {
                              setSelectedWorkerProfileId(w.workerProfileId || w.id);
                              setSelectedWorkerUserId(w.id);
                            }}>
                            <Image source={{ uri: w.avatarUrl }} style={styles.workerSelectAvatar} />
                            <View style={styles.workerSelectInfo}>
                              <Text style={styles.workerSelectName} numberOfLines={1}>
                                {w.fullName}
                              </Text>
                              <View style={styles.workerSelectRatingRow}>
                                <MaterialIcons name="star" size={14} color="#D4AF37" />
                                <Text style={styles.workerSelectRatingText}>{w.rating.toFixed(1)}</Text>
                              </View>
                              <Text style={styles.workerSelectPrice}>
                                {w.basePrice.toLocaleString()}đ
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <Text style={styles.noWorkersText}>Không có thợ nào hoạt động ở dịch vụ này.</Text>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="assignment-ind" size={20} color="#0F382C" />
                <Text style={styles.sectionTitle}>Thông tin kỹ thuật viên</Text>
              </View>
              <View style={styles.directWorkerInfoRow}>
                <MaterialIcons name="verified" size={20} color="#059669" />
                <Text style={styles.directWorkerText}>
                  Bạn đang đặt lịch trực tiếp với kỹ thuật viên đã chọn.
                </Text>
              </View>
            </View>
          )}

          {/* Section: Schedule Setting */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="access-time" size={20} color="#0F382C" />
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
              <MaterialIcons name="description" size={20} color="#0F382C" />
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
              <MaterialIcons name="photo-camera" size={20} color="#0F382C" />
              <Text style={styles.sectionTitle}>Hình ảnh hiện trạng sự cố (Tối đa 5)</Text>
            </View>

            <View style={styles.imagesContainer}>
              {selectedImages.map((uri, index) => (
                <View key={uri} style={styles.imageWrapper}>
                  <Pressable onPress={() => setActivePreviewImage(uri)}>
                    <Image source={{ uri }} style={styles.previewImage} />
                  </Pressable>
                  <Pressable style={styles.removeImageBtn} onPress={() => handleRemoveImage(index)}>
                    <MaterialIcons name="close" size={14} color="#ffffff" />
                  </Pressable>
                </View>
              ))}

              {selectedImages.length < 5 && (
                <Pressable style={styles.addImageBtn} onPress={handlePickImage}>
                  <MaterialIcons name="add-a-photo" size={24} color="#0F382C" />
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
        <Pressable style={styles.previewOverlay} onPress={() => setActivePreviewImage(null)}>
          {activePreviewImage ? (
            <Image
              source={{ uri: activePreviewImage }}
              style={styles.previewFullImage}
              resizeMode="contain"
            />
          ) : null}
          <Pressable style={styles.previewCloseBtn} onPress={() => setActivePreviewImage(null)}>
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
    backgroundColor: '#FBF9F5',
  },
  header: {
    height: 96,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#EFECE6',
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
  scrollContent: {
    padding: 16,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFECE6',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0F382C',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
    color: '#0F382C',
  },
  addressDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F4F1EA',
    borderWidth: 1,
    borderColor: '#EFECE6',
    borderRadius: 12,
    padding: 12,
  },
  addressTextCol: {
    flex: 1,
    marginRight: 8,
  },
  addressLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#1C2526',
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
    color: '#0F382C',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
  },
  addAddressPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F4F1EA',
    borderWidth: 1,
    borderColor: '#0F382C',
    borderRadius: 12,
    height: 52,
  },
  addAddressPromptText: {
    color: '#0F382C',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F4F1EA',
    borderRadius: 10,
    padding: 4,
    height: 48,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0F382C',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#818A91',
  },
  tabBtnTextActive: {
    color: '#0F382C',
    fontFamily: 'Montserrat_700Bold',
  },
  dateTimeSelectorContainer: {
    marginTop: 10,
  },
  fieldLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#1C2526',
    marginBottom: 10,
  },
  datePickerScroll: {
    gap: 10,
    paddingBottom: 4,
  },
  dateChip: {
    width: 68,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFECE6',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipActive: {
    backgroundColor: '#F4F1EA',
    borderColor: '#0F382C',
  },
  dateChipWeekday: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#818A91',
  },
  dateChipDay: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#1C2526',
    marginTop: 2,
  },
  dateChipTextActive: {
    color: '#0F382C',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeChip: {
    width: '22%',
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EFECE6',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipActive: {
    backgroundColor: '#F4F1EA',
    borderColor: '#0F382C',
  },
  timeChipText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#6B7280',
  },
  timeChipTextActive: {
    color: '#0F382C',
    fontFamily: 'Montserrat_700Bold',
  },
  issueInput: {
    backgroundColor: '#F4F1EA',
    borderWidth: 1,
    borderColor: '#EFECE6',
    borderRadius: 12,
    padding: 12,
    color: '#1C2526',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    height: 100,
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
  },
  continueButton: {
    height: 52,
    borderRadius: 22,
    backgroundColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F382C',
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
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#EFECE6',
  },
  modalTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#0F382C',
  },
  modalScroll: {
    paddingVertical: 12,
    gap: 12,
  },
  modalAddressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFECE6',
    gap: 10,
  },
  modalAddressItemSelected: {
    borderColor: '#0F382C',
    backgroundColor: '#F4F1EA',
  },
  modalAddressTextCol: {
    flex: 1,
  },
  modalAddressLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#1C2526',
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
    borderColor: '#0F382C',
    borderRadius: 12,
    height: 48,
    marginTop: 12,
  },
  modalAddBtnText: {
    color: '#0F382C',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
  photoSectionDivider: {
    height: 1,
    backgroundColor: '#EFECE6',
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
    backgroundColor: '#EFECE6',
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
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#0F382C',
    backgroundColor: '#F4F1EA',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addImageText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 9,
    color: '#0F382C',
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  categoryGridCard: {
    width: '31%',
    aspectRatio: 1.0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFECE6',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    marginBottom: 4,
  },
  categoryGridCardActive: {
    borderColor: '#0F382C',
    backgroundColor: '#F4F1EA',
    shadowColor: '#0F382C',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryGridIconFrame: {
    width: 44,
    height: 44,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryGridIcon: {
    width: '100%',
    height: '100%',
  },
  categoryGridText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 14,
  },
  categoryGridTextActive: {
    color: '#0F382C',
    fontFamily: 'Montserrat_700Bold',
  },
  workerSelectContainer: {
    marginTop: 12,
  },
  workerScroll: {
    gap: 12,
    paddingBottom: 4,
  },
  workerSelectCard: {
    width: 120,
    borderWidth: 1,
    borderColor: '#EFECE6',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 8,
    alignItems: 'center',
  },
  workerSelectCardActive: {
    borderColor: '#0F382C',
    backgroundColor: '#F4F1EA',
  },
  workerSelectAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFECE6',
    marginBottom: 6,
  },
  workerSelectInfo: {
    alignItems: 'center',
    width: '100%',
  },
  workerSelectName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#1C2526',
    textAlign: 'center',
  },
  workerSelectRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginVertical: 2,
  },
  workerSelectRatingText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#1C2526',
  },
  workerSelectPrice: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 11,
    color: '#0F382C',
  },
  noWorkersText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
    textAlign: 'center',
    paddingVertical: 12,
  },
  directWorkerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F2F7F2',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C6DFC6',
  },
  directWorkerText: {
    flex: 1,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#0F382C',
  },
});
