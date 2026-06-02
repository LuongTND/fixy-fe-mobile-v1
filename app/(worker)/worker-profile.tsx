import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as React from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { vietnamProvincesApi, matchAddressOption, cleanSearchText } from '@/services/api/provinces';

import { WorkerTabBar } from '@/components/layout/worker-tab-bar';
import { useAuthStore } from '@/store/store';
import {
  addDayOff,
  deleteDayOff,
  getExceptions,
  getWeeklySchedule,
  getWorkerProfileMe,
  updateWeeklySchedule,
  updateWorkerProfile,
  uploadPortfolioImages,
  deletePortfolioImage,
  updateIdentificationImages,
  updateCertificates,
  WorkerScheduleException,
  WorkerScheduleWeekly,
} from '@/services/api/workers';
import {
  dateToApiTime,
  dateToDateOnly,
  dateToTimeString,
  timeStringToDate,
} from '@/utils/schedule-time';

type PickerType = 'province' | 'ward';
type AddressPickerOption = { name: string; code?: number };

function getAddressPickerList(
  pickerType: PickerType,
  provinces: AddressPickerOption[],
  wards: AddressPickerOption[]
) {
  return pickerType === 'province' ? provinces : wards;
}

function matchesAddressKeyword(name: string, keyword: string) {
  const cleanName = cleanSearchText(name);
  if (cleanName.includes(keyword)) return true;
  if (cleanName.includes('ho chi minh') && ['hcm', 'sai gon', 'tphcm'].includes(keyword))
    return true;
  if (cleanName.includes('ha noi') && keyword === 'hn') return true;
  if (cleanName.includes('ba ria - vung tau') && keyword === 'vung tau') return true;
  if (cleanName.includes('thua thien hue') && keyword === 'hue') return true;
  return cleanName.includes('da nang') && keyword === 'dn';
}

function filterAddressOptions(options: AddressPickerOption[], searchQuery: string) {
  const keyword = cleanSearchText(searchQuery);
  return keyword ? options.filter((item) => matchesAddressKeyword(item.name, keyword)) : options;
}

const WEEKDAY_NAMES = [
  'Chá»§ nháº­t',
  'Thá»© 2',
  'Thá»© 3',
  'Thá»© 4',
  'Thá»© 5',
  'Thá»© 6',
  'Thá»© 7',
];

function formatScheduleSlotTime(slot: WorkerScheduleWeekly) {
  return slot.isActive ? `${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}` : 'Nghá»‰';
}

type WeeklyScheduleCardProps = Readonly<{
  weeklySchedule: WorkerScheduleWeekly[];
  onEditSlot: (slot: WorkerScheduleWeekly) => void;
  onToggleSlot: (index: number) => void;
}>;

function WeeklyScheduleCard({ weeklySchedule, onEditSlot, onToggleSlot }: WeeklyScheduleCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Lá»‹ch lÃ m viá»‡c hÃ ng tuáº§n</Text>
      <View style={styles.cardContent}>
        {weeklySchedule.map((slot, index) => (
          <View
            key={slot.id ?? `${slot.workerProfileId}-${slot.dayOfWeek}`}
            style={styles.scheduleSlotRow}>
            <Pressable style={styles.scheduleSlotLeft} onPress={() => onEditSlot(slot)}>
              <Text style={styles.scheduleSlotName}>{WEEKDAY_NAMES[slot.dayOfWeek]}</Text>
              <Text style={styles.scheduleSlotTime}>{formatScheduleSlotTime(slot)}</Text>
            </Pressable>
            <Pressable style={styles.scheduleEditButton} onPress={() => onEditSlot(slot)}>
              <MaterialIcons name="edit" size={18} color="#818A91" />
            </Pressable>
            <Switch
              value={slot.isActive}
              onValueChange={() => onToggleSlot(index)}
              trackColor={{ false: '#dcd9d9', true: '#ffdbc9' }}
              thumbColor={slot.isActive ? '#FF8228' : '#8b7265'}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

type DayOffExceptionsCardProps = Readonly<{
  exceptions: WorkerScheduleException[];
  onAddDayOff: () => void;
  onDeleteDayOff: (date: string) => void;
}>;

function DayOffExceptionsCard({
  exceptions,
  onAddDayOff,
  onDeleteDayOff,
}: DayOffExceptionsCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.cardTitle}>ÄÄƒng kÃ½ nghá»‰ phÃ©p (Exception)</Text>
        <Pressable style={{ paddingRight: 12 }} onPress={onAddDayOff}>
          <Text style={styles.viewAllText}>+ ThÃªm ngÃ y nghá»‰</Text>
        </Pressable>
      </View>
      <View style={styles.cardContent}>
        {exceptions.length > 0 ? (
          exceptions.map((ex) => (
            <View key={ex.id ?? ex.date} style={styles.exceptionItemRow}>
              <View style={styles.exceptionDetails}>
                <Text style={styles.exceptionDateText}>{ex.date}</Text>
                <Text style={styles.exceptionReasonText}>{ex.reason || 'Viá»‡c riÃªng'}</Text>
              </View>
              <Pressable onPress={() => onDeleteDayOff(ex.date)}>
                <MaterialIcons name="delete" size={20} color="#BA1A1A" />
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={styles.mutedText}>ChÆ°a cÃ³ lá»‹ch Ä‘Äƒng kÃ½ nghá»‰ nÃ o.</Text>
        )}
      </View>
    </View>
  );
}

export default function WorkerProfileScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  // Queries
  const { data: profile = null } = useQuery({
    queryKey: ['workerProfileMe'],
    queryFn: getWorkerProfileMe,
  });

  const workerProfileId = profile?.workerProfileId || profile?.id || '';

  const { data: weeklySchedule = [] } = useQuery({
    queryKey: ['weeklySchedule', workerProfileId],
    queryFn: () => getWeeklySchedule(workerProfileId),
    enabled: !!workerProfileId,
  });

  const { data: exceptions = [] } = useQuery({
    queryKey: ['exceptions', workerProfileId],
    queryFn: () => getExceptions(workerProfileId),
    enabled: !!workerProfileId,
  });

  // Basic Profile Info Edit States
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [editBio, setEditBio] = React.useState('');
  const [editPhone, setEditPhone] = React.useState('');
  const [logoutConfirmOpen, setLogoutConfirmOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  React.useEffect(() => {
    if (profile) {
      setEditBio(profile.bio || '');
      setEditPhone(profile.phone || '');
    }
  }, [profile]);

  // Working Address States
  const [addressModalOpen, setAddressModalOpen] = React.useState(false);
  const [addrDetail, setAddrDetail] = React.useState('');
  const [addrCity, setAddrCity] = React.useState('');
  const [addrWard, setAddrWard] = React.useState('');

  const [selectedProvinceCode, setSelectedProvinceCode] = React.useState<number | null>(null);

  // Province API Queries
  const { data: provinces = [] } = useQuery<any[]>({
    queryKey: ['provincesList'],
    queryFn: vietnamProvincesApi.getProvinces,
  });

  // Fetch Wards Query (wards belong directly to province in 2025 API)
  const { data: wards = [] } = useQuery<any[]>({
    queryKey: ['wardsList', selectedProvinceCode],
    queryFn: () => {
      if (!selectedProvinceCode) return [];
      return vietnamProvincesApi.getWardsForProvince(selectedProvinceCode);
    },
    enabled: !!selectedProvinceCode,
  });

  React.useEffect(() => {
    if (profile?.address) {
      setAddrDetail(profile.address.detail || '');
      setAddrCity(profile.address.city || '');
      setAddrWard(profile.address.ward || '');
    }
  }, [profile, addressModalOpen]);

  // Match initial address text strings to codes
  React.useEffect(() => {
    if (provinces.length > 0 && addrCity) {
      const match = matchAddressOption(provinces, addrCity, 'city');
      if (match) {
        setSelectedProvinceCode(match.code);
      }
    } else if (!addrCity) {
      setSelectedProvinceCode(null);
    }
  }, [provinces, addrCity]);

  // Dropdown Picker Modal States
  const [optionPickerOpen, setOptionPickerOpen] = React.useState(false);
  const [pickerType, setPickerType] = React.useState<PickerType>('province');
  const [pickerSearchQuery, setPickerSearchQuery] = React.useState('');

  const currentPickerList = React.useMemo(
    () => getAddressPickerList(pickerType, provinces, wards),
    [pickerType, provinces, wards]
  );

  const filteredPickerList = React.useMemo(
    () => filterAddressOptions(currentPickerList, pickerSearchQuery),
    [pickerSearchQuery, currentPickerList]
  );

  const handleSelectOption = (item: any) => {
    if (pickerType === 'province') {
      setAddrCity(item.name);
      setSelectedProvinceCode(item.code);
      setAddrWard('');
    } else {
      setAddrWard(item.name);
    }
    setOptionPickerOpen(false);
  };

  // Portfolio States
  const [portfolioModalOpen, setPortfolioModalOpen] = React.useState(false);

  // Identification Verification States
  const [identificationModalOpen, setIdentificationModalOpen] = React.useState(false);
  const [idNumber, setIdNumber] = React.useState('');
  const [idIssueDate, setIdIssueDate] = React.useState('');
  const [idIssuePlace, setIdIssuePlace] = React.useState('');
  const [idLocalUris, setIdLocalUris] = React.useState<string[]>([]);

  // Certificates States
  const [certificatesModalOpen, setCertificatesModalOpen] = React.useState(false);
  const [newCertTitle, setNewCertTitle] = React.useState('');
  const [newCertIssuedBy, setNewCertIssuedBy] = React.useState('');
  const [newCertLocalUris, setNewCertLocalUris] = React.useState<string[]>([]);

  // Day off exception states
  const [addDayOffModalOpen, setAddDayOffModalOpen] = React.useState(false);
  const [dayOffDate, setDayOffDate] = React.useState(() => new Date());
  const [dayOffReason, setDayOffReason] = React.useState('');

  // Weekly schedule editor states
  const [editingScheduleSlot, setEditingScheduleSlot] = React.useState<WorkerScheduleWeekly | null>(
    null
  );
  const [scheduleStartTime, setScheduleStartTime] = React.useState(() =>
    timeStringToDate('08:00:00')
  );
  const [scheduleEndTime, setScheduleEndTime] = React.useState(() => timeStringToDate('17:00:00'));
  const [schedulePickerTarget, setSchedulePickerTarget] = React.useState<'start' | 'end'>('start');

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: updateWorkerProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workerProfileMe'] });
      setIsEditingProfile(false);
      Alert.alert('Thành công', 'Đã cập nhật hồ sơ cá nhân.');
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: async () => {
      await updateWorkerProfile({
        phone: profile?.phone || '',
        bio: profile?.bio || '',
        address: {
          label: 'Địa chỉ làm việc',
          city: addrCity,
          district: null,
          ward: addrWard,
          detail: addrDetail,
          lat: profile?.address?.lat || 16,
          lng: profile?.address?.lng || 108,
          isDefault: true,
        } as any,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workerProfileMe'] });
      setAddressModalOpen(false);
      Alert.alert('Thành công', 'Đã cập nhật địa chỉ hoạt động.');
    },
    onError: (err) => {
      Alert.alert('Lỗi', err.message || 'Không thể lưu địa chỉ.');
    },
  });

  const addPortfolioImageMutation = useMutation({
    mutationFn: async (localUris: string[]) => {
      await uploadPortfolioImages(workerProfileId, localUris);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workerProfileMe'] });
      Alert.alert('Thành công', 'Đã thêm hình ảnh hoạt động.');
    },
  });

  const deletePortfolioImageMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      await deletePortfolioImage(workerProfileId, mediaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workerProfileMe'] });
      Alert.alert('Thành công', 'Đã xóa hình ảnh hoạt động.');
    },
  });

  const updateCccdMutation = useMutation({
    mutationFn: async () => {
      await updateIdentificationImages({
        workerProfileId,
        citizenIdNumber: idNumber,
        citizenIdIssueDate: idIssueDate,
        citizenIdIssuePlace: idIssuePlace,
        localUris: idLocalUris,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workerProfileMe'] });
      setIdentificationModalOpen(false);
      setIdLocalUris([]);
      Alert.alert('Thành công', 'Hồ sơ CCCD đã được gửi đi để duyệt xác minh.');
    },
  });

  const addCertificateMutation = useMutation({
    mutationFn: async () => {
      const existingCertificates = (profile?.certificates || []).map((c: any) => ({
        title: c.title,
        issuedBy: c.issuedBy,
        issuedAt: c.issuedAt,
        localUris: c.imageUrl ? [c.imageUrl] : [],
      }));
      const newCert = {
        title: newCertTitle,
        issuedBy: newCertIssuedBy,
        issuedAt: dateToDateOnly(new Date()),
        localUris: newCertLocalUris,
      };
      await updateCertificates({
        workerProfileId,
        dtos: [...existingCertificates, newCert],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workerProfileMe'] });
      setNewCertTitle('');
      setNewCertIssuedBy('');
      setNewCertLocalUris([]);
      Alert.alert('Thành công', 'Đã thêm chứng chỉ mới.');
    },
  });

  const updateWeeklyScheduleMutation = useMutation({
    mutationFn: (payload: WorkerScheduleWeekly) => updateWeeklySchedule(workerProfileId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklySchedule', workerProfileId] });
      Alert.alert('Thành công', 'Lịch làm việc đã được cập nhật.');
    },
  });

  const addDayOffMutation = useMutation({
    mutationFn: addDayOff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptions', workerProfileId] });
      setAddDayOffModalOpen(false);
      setDayOffDate(new Date());
      setDayOffReason('');
      Alert.alert('Thành công', 'Đã đăng ký ngày nghỉ phép.');
    },
  });

  const deleteDayOffMutation = useMutation({
    mutationFn: (date: string) => deleteDayOff(workerProfileId, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptions', workerProfileId] });
      Alert.alert('Thành công', 'Đã xóa lịch nghỉ phép.');
    },
  });

  // Toggle Slot Active
  const handleToggleSlot = (index: number) => {
    const slot = weeklySchedule[index];
    if (!slot) return;
    updateWeeklyScheduleMutation.mutate({ ...slot, isActive: !slot.isActive });
  };

  // Edit working hours for slot
  const handleEditHours = (index: number, start: string, end: string) => {
    const slot = weeklySchedule[index];
    if (!slot) return;
    updateWeeklyScheduleMutation.mutate({
      ...slot,
      startTime: start,
      endTime: end,
      isActive: true,
    });
  };

  const openScheduleEditor = (slot: WorkerScheduleWeekly) => {
    setEditingScheduleSlot(slot);
    setScheduleStartTime(timeStringToDate(slot.startTime));
    setScheduleEndTime(timeStringToDate(slot.endTime));
    setSchedulePickerTarget('start');
  };

  const closeScheduleEditor = () => {
    setEditingScheduleSlot(null);
  };

  const submitScheduleEditor = () => {
    if (!editingScheduleSlot) return;
    if (scheduleStartTime.getTime() >= scheduleEndTime.getTime()) {
      Alert.alert('Giờ chưa hợp lệ', 'Giờ kết thúc cần sau giờ bắt đầu.');
      return;
    }
    const index = weeklySchedule.findIndex(
      (slot) => slot.dayOfWeek === editingScheduleSlot.dayOfWeek
    );
    handleEditHours(index, dateToApiTime(scheduleStartTime), dateToApiTime(scheduleEndTime));
    closeScheduleEditor();
  };

  // Pick Images Handlers
  const handlePickPortfolioImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      addPortfolioImageMutation.mutate(uris);
    }
  };

  const handlePickCccdImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 2,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setIdLocalUris(uris);
    }
  };

  const handlePickCertImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setNewCertLocalUris([result.assets[0].uri]);
    }
  };

  function handleLogout() {
    setLogoutConfirmOpen(true);
  }

  async function confirmLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      setLogoutConfirmOpen(false);
      router.replace('/login' as any);
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerBtn} />
        <Text style={styles.headerTitle}>Tài khoản</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileHeaderCard}>
          <Image
            source={{
              uri:
                profile?.avatarUrl ||
                'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
            }}
            style={styles.profileAvatar}
          />
          <Text style={styles.profileName}>{profile?.fullName || 'Kỹ thuật viên'}</Text>
          <Text style={styles.profileRole}>Đối tác kỹ thuật viên</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialIcons name="star" size={18} color="#FFB000" />
                <Text style={styles.statValue}>
                  {profile?.rating ? Number(profile.rating).toFixed(1) : '4.8'}
                </Text>
              </View>
              <Text style={styles.statLabel}>({profile?.reviewsCount ?? 0} đánh giá)</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialIcons name="done-all" size={18} color="#FF8228" />
                <Text style={styles.statValue}>{profile?.completedJobs ?? 0}</Text>
              </View>
              <Text style={styles.statLabel}>Đơn hoàn thành</Text>
            </View>
          </View>
        </View>

        {/* Section 1: Thông tin cá nhân */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin cá nhân</Text>
          <View style={styles.cardContent}>
            {isEditingProfile ? (
              <View style={[styles.formContainer, { padding: 12 }]}>
                <Text style={styles.fieldLabel}>Số điện thoại:</Text>
                <TextInput
                  style={styles.formInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                />
                <Text style={styles.fieldLabel}>Giới thiệu bản thân:</Text>
                <TextInput
                  style={styles.formInputText}
                  value={editBio}
                  onChangeText={setEditBio}
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.formActionsRow}>
                  <Pressable
                    style={styles.cancelFormBtn}
                    onPress={() => setIsEditingProfile(false)}>
                    <Text style={styles.cancelFormText}>Hủy</Text>
                  </Pressable>
                  <Pressable
                    style={styles.saveFormBtn}
                    onPress={() =>
                      updateProfileMutation.mutate({
                        bio: editBio,
                        phone: editPhone,
                        address: profile?.address || undefined,
                      })
                    }>
                    <Text style={styles.saveFormText}>Lưu</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={styles.profileBioText}>
                  <Text style={{ fontWeight: 'bold' }}>SĐT liên hệ: </Text>
                  {profile?.phone}
                </Text>
                <Text style={styles.profileBioText}>
                  <Text style={{ fontWeight: 'bold' }}>Giới thiệu: </Text>
                  {profile?.bio || 'Kỹ thuật viên chưa cập nhật giới thiệu.'}
                </Text>
                <Pressable style={styles.editProfileBtn} onPress={() => setIsEditingProfile(true)}>
                  <Text style={styles.editProfileBtnText}>Chỉnh sửa thông tin</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Section 2: Hồ sơ đối tác & Xác minh */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Xác minh & Hồ sơ đối tác</Text>
          <View style={styles.cardContent}>
            {/* Địa điểm hoạt động */}
            <Pressable style={styles.item} onPress={() => setAddressModalOpen(true)}>
              <View style={styles.itemLeft}>
                <MaterialIcons name="my-location" size={22} color="#ff8228" />
                <Text style={styles.itemText}>Địa điểm hoạt động</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#574237" />
            </Pressable>

            <View style={styles.divider} />

            {/* Hình ảnh hoạt động (Portfolio) */}
            <Pressable style={styles.item} onPress={() => setPortfolioModalOpen(true)}>
              <View style={styles.itemLeft}>
                <MaterialIcons name="photo-library" size={22} color="#ff8228" />
                <Text style={styles.itemText}>Hình ảnh hoạt động (Portfolio)</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#574237" />
            </Pressable>

            <View style={styles.divider} />

            {/* Xác minh danh tính */}
            <Pressable style={styles.item} onPress={() => setIdentificationModalOpen(true)}>
              <View style={styles.itemLeft}>
                <MaterialIcons name="badge" size={22} color="#ff8228" />
                <Text style={styles.itemText}>Xác minh danh tính (CCCD)</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#574237" />
            </Pressable>

            <View style={styles.divider} />

            {/* Chứng chỉ & Bằng cấp */}
            <Pressable style={styles.item} onPress={() => setCertificatesModalOpen(true)}>
              <View style={styles.itemLeft}>
                <MaterialIcons name="workspace-premium" size={22} color="#ff8228" />
                <Text style={styles.itemText}>Chứng chỉ & Bằng cấp</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#574237" />
            </Pressable>
          </View>
        </View>
        <WeeklyScheduleCard
          weeklySchedule={weeklySchedule}
          onEditSlot={openScheduleEditor}
          onToggleSlot={handleToggleSlot}
        />

        <DayOffExceptionsCard
          exceptions={exceptions}
          onAddDayOff={() => setAddDayOffModalOpen(true)}
          onDeleteDayOff={(date) => deleteDayOffMutation.mutate(date)}
        />

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color="#ba1a1a" />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </Pressable>
        </View>
      </ScrollView>

      <WorkerTabBar activeTab="profile" />

      <Modal visible={logoutConfirmOpen} transparent animationType="fade">
        <View style={styles.centeredModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!isLoggingOut) setLogoutConfirmOpen(false);
            }}
          />
          <View style={styles.logoutConfirmContent}>
            <Text style={styles.logoutConfirmTitle}>Đăng xuất</Text>
            <Text style={styles.logoutConfirmText}>Bạn có chắc chắn muốn đăng xuất?</Text>
            <View style={styles.logoutConfirmActions}>
              <Pressable
                style={styles.logoutCancelButton}
                onPress={() => setLogoutConfirmOpen(false)}
                disabled={isLoggingOut}>
                <Text style={styles.logoutCancelText}>Hủy</Text>
              </Pressable>
              <Pressable
                style={[styles.logoutConfirmButton, isLoggingOut && styles.modalSubmitBtnDisabled]}
                onPress={confirmLogout}
                disabled={isLoggingOut}>
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.logoutConfirmButtonText}>Đăng xuất</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 1: Working Address */}
      <Modal visible={addressModalOpen} transparent animationType="fade">
        <View style={styles.centeredModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (optionPickerOpen) {
                setOptionPickerOpen(false);
              } else {
                setAddressModalOpen(false);
              }
            }}
          />
          <View style={styles.dayOffModalContent}>
            {optionPickerOpen ? (
              <View style={{ width: '100%' }}>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pressable onPress={() => setOptionPickerOpen(false)} style={{ padding: 4 }}>
                      <MaterialIcons name="arrow-back" size={24} color="#383838" />
                    </Pressable>
                    <Text style={styles.modalTitle}>
                      {pickerType === 'province' && 'Chọn Tỉnh / Thành phố'}
                      {pickerType === 'ward' && 'Chọn Phường / Xã'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setOptionPickerOpen(false);
                      setAddressModalOpen(false);
                    }}>
                    <MaterialIcons name="close" size={24} color="#383838" />
                  </Pressable>
                </View>

                <View style={styles.bankSearchBox}>
                  <MaterialIcons name="search" size={20} color="#818A91" />
                  <TextInput
                    style={styles.bankSearchInput}
                    placeholder="Tìm kiếm..."
                    placeholderTextColor="#9A9A9A"
                    value={pickerSearchQuery}
                    onChangeText={setPickerSearchQuery}
                  />
                </View>

                <ScrollView
                  style={{ maxHeight: 300, width: '100%' }}
                  keyboardShouldPersistTaps="handled">
                  {filteredPickerList.map((item: any) => (
                    <Pressable
                      key={item.code}
                      style={styles.optionPickerItem}
                      onPress={() => handleSelectOption(item)}>
                      <Text style={styles.optionPickerItemText}>{item.name}</Text>
                    </Pressable>
                  ))}
                  {filteredPickerList.length === 0 && (
                    <Text style={styles.mutedText}>Không tìm thấy kết quả.</Text>
                  )}
                </ScrollView>
              </View>
            ) : (
              <View style={{ width: '100%' }}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Địa điểm hoạt động</Text>
                  <Pressable onPress={() => setAddressModalOpen(false)}>
                    <MaterialIcons name="close" size={24} color="#383838" />
                  </Pressable>
                </View>

                <ScrollView
                  style={{ maxHeight: 420, width: '100%' }}
                  keyboardShouldPersistTaps="handled">
                  <Text style={styles.fieldLabel}>Địa chỉ chi tiết (Số nhà, Tên đường):</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ví dụ: 305 Trần Hưng Đạo"
                    placeholderTextColor="#9A9A9A"
                    value={addrDetail}
                    onChangeText={setAddrDetail}
                  />

                  <Text style={styles.fieldLabel}>Tỉnh / Thành phố:</Text>
                  <Pressable
                    style={styles.pickerSelector}
                    onPress={() => {
                      setPickerType('province');
                      setPickerSearchQuery('');
                      setOptionPickerOpen(true);
                    }}>
                    <Text
                      style={addrCity ? styles.pickerSelectorText : styles.pickerPlaceholderText}>
                      {addrCity || 'Chọn Tỉnh / Thành phố'}
                    </Text>
                    <MaterialIcons name="keyboard-arrow-down" size={20} color="#818A91" />
                  </Pressable>

                  <Text style={styles.fieldLabel}>Phường / Xã:</Text>
                  <Pressable
                    style={[
                      styles.pickerSelector,
                      !selectedProvinceCode && styles.pickerSelectorDisabled,
                    ]}
                    onPress={() => {
                      if (!selectedProvinceCode) {
                        Alert.alert('Thông báo', 'Vui lòng chọn Tỉnh / Thành phố trước.');
                        return;
                      }
                      setPickerType('ward');
                      setPickerSearchQuery('');
                      setOptionPickerOpen(true);
                    }}
                    disabled={!selectedProvinceCode}>
                    <Text
                      style={addrWard ? styles.pickerSelectorText : styles.pickerPlaceholderText}>
                      {addrWard || 'Chọn Phường / Xã'}
                    </Text>
                    <MaterialIcons name="keyboard-arrow-down" size={20} color="#818A91" />
                  </Pressable>

                  <Pressable
                    style={[
                      styles.modalSubmitBtn,
                      (!addrCity ||
                        !addrWard ||
                        !addrDetail.trim() ||
                        updateAddressMutation.isPending) &&
                        styles.modalSubmitBtnDisabled,
                    ]}
                    onPress={() => updateAddressMutation.mutate()}
                    disabled={
                      !addrCity ||
                      !addrWard ||
                      !addrDetail.trim() ||
                      updateAddressMutation.isPending
                    }>
                    {updateAddressMutation.isPending ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.modalSubmitBtnText}>Lưu địa chỉ hoạt động</Text>
                    )}
                  </Pressable>
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Portfolio Images */}
      <Modal visible={portfolioModalOpen} transparent animationType="slide">
        <View style={styles.bottomSheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPortfolioModalOpen(false)} />
          <View style={styles.bottomSheetContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hình ảnh hoạt động (Portfolio)</Text>
              <Pressable onPress={() => setPortfolioModalOpen(false)}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <View style={styles.portfolioGrid}>
                {profile?.portfolioImages?.map((img: any) => (
                  <View key={img.id} style={styles.portfolioItemWrap}>
                    <Image source={{ uri: img.url }} style={styles.portfolioImg} />
                    <Pressable
                      style={styles.portfolioDeleteBtn}
                      onPress={() => {
                        Alert.alert('Xóa ảnh', 'Bạn muốn xóa hình ảnh này khỏi portfolio?', [
                          { text: 'Hủy', style: 'cancel' },
                          {
                            text: 'Xóa',
                            style: 'destructive',
                            onPress: () => deletePortfolioImageMutation.mutate(img.id),
                          },
                        ]);
                      }}>
                      <MaterialIcons name="close" size={16} color="#ffffff" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </ScrollView>

            <Pressable
              style={[
                styles.modalSubmitBtn,
                addPortfolioImageMutation.isPending && styles.modalSubmitBtnDisabled,
                { marginTop: 16 },
              ]}
              onPress={handlePickPortfolioImages}
              disabled={addPortfolioImageMutation.isPending}>
              {addPortfolioImageMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>+ Thêm hình ảnh</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Identification (CCCD) */}
      <Modal visible={identificationModalOpen} transparent animationType="fade">
        <View style={styles.centeredModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIdentificationModalOpen(false)}
          />
          <View style={styles.dayOffModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Xác minh danh tính (CCCD)</Text>
              <Pressable onPress={() => setIdentificationModalOpen(false)}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Số căn cước công dân (CCCD):</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Nhập 12 số CCCD..."
                placeholderTextColor="#9A9A9A"
                value={idNumber}
                onChangeText={setIdNumber}
                keyboardType="number-pad"
              />

              <Text style={styles.fieldLabel}>Ngày cấp:</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ví dụ: 2024-02-12"
                placeholderTextColor="#9A9A9A"
                value={idIssueDate}
                onChangeText={setIdIssueDate}
              />

              <Text style={styles.fieldLabel}>Nơi cấp:</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ví dụ: Cục Cảnh sát QLHC về TTXH"
                placeholderTextColor="#9A9A9A"
                value={idIssuePlace}
                onChangeText={setIdIssuePlace}
              />

              <Text style={styles.fieldLabel}>Ảnh mặt trước & mặt sau CCCD:</Text>
              <View style={styles.cccdImagesPreviewRow}>
                {idLocalUris.map((uri) => (
                  <Image key={uri} source={{ uri }} style={styles.cccdPreviewImg} />
                ))}
                {idLocalUris.length < 2 && (
                  <Pressable style={styles.cccdUploadTrigger} onPress={handlePickCccdImages}>
                    <MaterialIcons name="add-a-photo" size={24} color="#FF8228" />
                    <Text style={styles.cccdUploadTriggerText}>Tải ảnh lên</Text>
                  </Pressable>
                )}
              </View>

              <Pressable
                style={[
                  styles.modalSubmitBtn,
                  (!idNumber.trim() || idLocalUris.length < 2 || updateCccdMutation.isPending) &&
                    styles.modalSubmitBtnDisabled,
                  { marginTop: 16 },
                ]}
                onPress={() => updateCccdMutation.mutate()}
                disabled={
                  !idNumber.trim() || idLocalUris.length < 2 || updateCccdMutation.isPending
                }>
                {updateCccdMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Gửi yêu cầu xác minh</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: Certificates */}
      <Modal visible={certificatesModalOpen} transparent animationType="fade">
        <View style={styles.centeredModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setCertificatesModalOpen(false)}
          />
          <View style={styles.dayOffModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chứng chỉ & Bằng cấp</Text>
              <Pressable onPress={() => setCertificatesModalOpen(false)}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
              {/* Render current certificates */}
              <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>Danh sách hiện tại:</Text>
              {profile?.certificates?.map((c: any) => (
                <View key={c.id} style={styles.certListItem}>
                  <MaterialIcons name="workspace-premium" size={28} color="#FF8228" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.certListItemTitle}>{c.title}</Text>
                    <Text style={styles.certListItemMeta}>Cấp bởi: {c.issuedBy}</Text>
                  </View>
                </View>
              ))}

              <View style={[styles.divider, { marginVertical: 16 }]} />

              {/* Add New Certificate Form */}
              <Text style={[styles.fieldLabel, { fontWeight: 'bold', color: '#1b1c1c' }]}>
                Thêm chứng chỉ mới
              </Text>

              <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Tên chứng chỉ:</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ví dụ: Chứng chỉ kỹ thuật viên điện"
                placeholderTextColor="#9A9A9A"
                value={newCertTitle}
                onChangeText={setNewCertTitle}
              />

              <Text style={styles.fieldLabel}>Nơi cấp chứng chỉ:</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ví dụ: Trường Cao đẳng nghề Đà Nẵng"
                placeholderTextColor="#9A9A9A"
                value={newCertIssuedBy}
                onChangeText={setNewCertIssuedBy}
              />

              <Text style={styles.fieldLabel}>Tài liệu chứng chỉ (Hình ảnh):</Text>
              {newCertLocalUris.length > 0 ? (
                <View style={styles.cccdImagesPreviewRow}>
                  <Image source={{ uri: newCertLocalUris[0] }} style={styles.cccdPreviewImg} />
                  <Pressable
                    style={[styles.certUploadTrigger, { flex: 1, marginVertical: 0 }]}
                    onPress={() => setNewCertLocalUris([])}>
                    <MaterialIcons name="delete" size={20} color="#BA1A1A" />
                    <Text style={[styles.certUploadTriggerText, { color: '#BA1A1A' }]}>
                      Xóa ảnh
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.certUploadTrigger} onPress={handlePickCertImage}>
                  <MaterialIcons name="add-photo-alternate" size={24} color="#FF8228" />
                  <Text style={styles.certUploadTriggerText}>Chọn ảnh chứng chỉ</Text>
                </Pressable>
              )}

              <Pressable
                style={[
                  styles.modalSubmitBtn,
                  (!newCertTitle.trim() ||
                    !newCertIssuedBy.trim() ||
                    newCertLocalUris.length === 0 ||
                    addCertificateMutation.isPending) &&
                    styles.modalSubmitBtnDisabled,
                  { marginTop: 16 },
                ]}
                onPress={() => addCertificateMutation.mutate()}
                disabled={
                  !newCertTitle.trim() ||
                  !newCertIssuedBy.trim() ||
                  newCertLocalUris.length === 0 ||
                  addCertificateMutation.isPending
                }>
                {addCertificateMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Thêm chứng chỉ</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Add Day Off Exception */}
      <Modal visible={addDayOffModalOpen} transparent animationType="fade">
        <View style={styles.centeredModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAddDayOffModalOpen(false)} />
          <View style={styles.dayOffModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đăng ký nghỉ phép</Text>
              <Pressable onPress={() => setAddDayOffModalOpen(false)}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Chọn ngày nghỉ:</Text>
            <View style={styles.dayOffDateSummary}>
              <MaterialIcons name="event" size={20} color="#FF8228" />
              <Text style={styles.dayOffDateText}>{dateToDateOnly(dayOffDate)}</Text>
            </View>
            <View style={styles.nativeDatePickerWrap}>
              <DateTimePicker
                value={dayOffDate}
                mode="date"
                display="spinner"
                textColor="#383838"
                themeVariant="light"
                style={styles.nativeDatePicker}
                onChange={(_, selectedDate) => {
                  if (selectedDate) setDayOffDate(selectedDate);
                }}
              />
            </View>

            <Text style={styles.dayOffReasonLabel}>Lý do nghỉ:</Text>
            <TextInput
              style={styles.dayOffReasonInput}
              placeholder="Nhập lý do xin nghỉ..."
              placeholderTextColor="#9A9A9A"
              value={dayOffReason}
              onChangeText={setDayOffReason}
            />

            <Pressable
              style={[
                styles.modalSubmitBtn,
                addDayOffMutation.isPending && styles.modalSubmitBtnDisabled,
              ]}
              onPress={() => {
                addDayOffMutation.mutate({
                  workerProfileId,
                  date: dateToDateOnly(dayOffDate),
                  isDayOff: true,
                  reason: dayOffReason,
                });
              }}
              disabled={addDayOffMutation.isPending}>
              {addDayOffMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Xác nhận ngày nghỉ</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal Edit Weekly Schedule */}
      <Modal visible={!!editingScheduleSlot} transparent animationType="fade">
        <View style={styles.centeredModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
          <View style={styles.scheduleTimeModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cập nhật giờ làm việc</Text>
              <Pressable onPress={closeScheduleEditor}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>

            <View style={styles.timePickerTabs}>
              <Pressable
                style={[
                  styles.timePickerTab,
                  schedulePickerTarget === 'start' && styles.timePickerTabActive,
                ]}
                onPress={() => setSchedulePickerTarget('start')}>
                <Text style={styles.timePickerTabLabel}>Bắt đầu</Text>
                <Text
                  style={[
                    styles.timePickerTabValue,
                    schedulePickerTarget === 'start' && styles.timePickerTabValueActive,
                  ]}>
                  {dateToTimeString(scheduleStartTime)}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.timePickerTab,
                  schedulePickerTarget === 'end' && styles.timePickerTabActive,
                ]}
                onPress={() => setSchedulePickerTarget('end')}>
                <Text style={styles.timePickerTabLabel}>Kết thúc</Text>
                <Text
                  style={[
                    styles.timePickerTabValue,
                    schedulePickerTarget === 'end' && styles.timePickerTabValueActive,
                  ]}>
                  {dateToTimeString(scheduleEndTime)}
                </Text>
              </Pressable>
            </View>

            <View style={styles.nativeTimePickerWrap}>
              <DateTimePicker
                value={schedulePickerTarget === 'start' ? scheduleStartTime : scheduleEndTime}
                mode="time"
                display="spinner"
                minuteInterval={5}
                textColor="#383838"
                themeVariant="light"
                style={styles.nativeTimePicker}
                onChange={(_, selectedDate) => {
                  if (!selectedDate) return;
                  if (schedulePickerTarget === 'start') {
                    setScheduleStartTime(selectedDate);
                  } else {
                    setScheduleEndTime(selectedDate);
                  }
                }}
              />
            </View>

            <Pressable
              style={[
                styles.modalSubmitBtn,
                updateWeeklyScheduleMutation.isPending && styles.modalSubmitBtnDisabled,
              ]}
              onPress={submitScheduleEditor}
              disabled={updateWeeklyScheduleMutation.isPending}>
              {updateWeeklyScheduleMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Lưu giờ làm việc</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
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
  scrollContent: { padding: 16, paddingBottom: 110 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    marginVertical: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#1b1c1c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 1,
  },
  cardContent: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    color: '#1b1c1c',
  },
  divider: {
    height: 1,
    backgroundColor: '#DDDDDD',
    marginHorizontal: 12,
  },
  logoutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ba1a1a',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    minHeight: 44,
  },
  logoutText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#ba1a1a',
  },
  logoutConfirmContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  logoutConfirmTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#1b1c1c',
    marginBottom: 8,
  },
  logoutConfirmText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#574237',
    marginBottom: 20,
  },
  logoutConfirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  logoutCancelButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutCancelText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#574237',
  },
  logoutConfirmButton: {
    minHeight: 44,
    minWidth: 120,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#ba1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutConfirmButtonText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#ffffff',
  },
  fieldLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#818A91',
    marginBottom: 2,
  },
  formContainer: { gap: 8 },
  formInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 6,
    height: 40,
    paddingHorizontal: 10,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#383838',
    marginBottom: 10,
  },
  formInputText: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#383838',
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  formActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelFormBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#818A91',
  },
  cancelFormText: { color: '#818A91', fontFamily: 'Montserrat_600SemiBold', fontSize: 12 },
  saveFormBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#FF8228',
  },
  saveFormText: { color: '#ffffff', fontFamily: 'Montserrat_600SemiBold', fontSize: 12 },
  profileBioText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#383838',
    lineHeight: 18,
    marginBottom: 8,
  },
  editProfileBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF8228',
    marginTop: 6,
  },
  editProfileBtnText: { color: '#FF8228', fontFamily: 'Montserrat_600SemiBold', fontSize: 12 },
  scheduleSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: '#efedec',
  },
  scheduleSlotLeft: { flex: 1 },
  scheduleSlotName: { fontFamily: 'Montserrat_700Bold', fontSize: 13, color: '#383838' },
  scheduleSlotTime: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 12,
  },
  viewAllText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#FF8228',
    flexShrink: 0,
  },
  exceptionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: '#efedec',
  },
  exceptionDetails: { flex: 1 },
  exceptionDateText: { fontFamily: 'Montserrat_700Bold', fontSize: 13, color: '#383838' },
  exceptionReasonText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    marginTop: 2,
  },
  mutedText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
    textAlign: 'center',
    paddingVertical: 10,
  },
  scheduleEditButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOffReasonLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#818A91',
    marginTop: 8,
    marginBottom: 8,
  },
  dayOffReasonInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    height: 52,
    paddingHorizontal: 14,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: '#383838',
    marginBottom: 18,
  },
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  scheduleTimeModalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  dayOffModalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#f5f3f2',
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#383838',
  },
  timePickerTabs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  timePickerTab: {
    flex: 1,
    minHeight: 68,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  timePickerTabActive: {
    borderColor: '#FF8228',
    backgroundColor: '#FFF2EA',
  },
  timePickerTabLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#818A91',
  },
  timePickerTabValue: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 20,
    color: '#383838',
    marginTop: 4,
  },
  timePickerTabValueActive: {
    color: '#FF8228',
  },
  nativeTimePickerWrap: {
    alignItems: 'center',
    minHeight: 190,
    marginBottom: 16,
  },
  nativeTimePicker: {
    width: '100%',
    height: 190,
  },
  dayOffDateSummary: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#FF8228',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF2EA',
  },
  dayOffDateText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#383838',
  },
  nativeDatePickerWrap: {
    alignItems: 'center',
    minHeight: 180,
    marginBottom: 12,
  },
  nativeDatePicker: {
    width: '100%',
    height: 180,
  },
  modalSubmitBtn: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FF8228',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnDisabled: {
    backgroundColor: '#EAE5E3',
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
  },
  profileHeaderCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#FF8228',
    marginBottom: 12,
  },
  profileName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#1b1c1c',
  },
  profileRole: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    marginTop: 2,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#efedec',
    paddingTop: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#1b1c1c',
  },
  statLabel: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#efedec',
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#383838',
    marginBottom: 16,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 8,
  },
  portfolioItemWrap: {
    position: 'relative',
    width: '30%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  portfolioImg: {
    width: '100%',
    height: '100%',
  },
  portfolioDeleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cccdImagesPreviewRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  cccdPreviewImg: {
    width: 100,
    height: 70,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  cccdUploadTrigger: {
    width: 100,
    height: 70,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF8228',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF2EA',
    gap: 4,
  },
  cccdUploadTriggerText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 10,
    color: '#FF8228',
  },
  certListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#efedec',
  },
  certListItemTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#1b1c1c',
  },
  certListItemMeta: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    marginTop: 2,
  },
  pickerSelector: {
    height: 48,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  pickerSelectorDisabled: {
    backgroundColor: '#f5f3f2',
    borderColor: '#EAE5E3',
  },
  pickerSelectorText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#1b1c1c',
  },
  pickerPlaceholderText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#9A9A9A',
  },
  optionPickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: '#efedec',
  },
  optionPickerItemText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#383838',
  },
  certUploadTrigger: {
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF8228',
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF2EA',
    gap: 8,
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  certUploadTriggerText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#FF8228',
  },
  bankSearchBox: {
    height: 44,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankSearchInput: {
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 15,
    color: '#383838',
  },
});
