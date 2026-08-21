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
  Switch,
  Text,
  TextInput,
  View,
  Image,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { vietnamProvincesApi, matchAddressOption, cleanSearchText } from '@/services/api/provinces';

const parseDateString = (str?: string): Date => {
  if (!str) return new Date();
  const trimmed = str.trim().split('T')[0];
  const parts = trimmed.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day);
    }
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? new Date() : d;
};

const formatDateToYMD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const GOONG_API_KEY = Constants.expoConfig?.extra?.goongApiKey || '';

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
import { getApiErrorMessage } from '@/services/api/client';
import { FptIdentityRecognitionResult, recognizeIdentityImage, compareFaces } from '@/services/api/fpt';
import { FaceCaptureModal } from '@/components/camera/FaceCaptureModal';
import { formatToIsoDateTime } from '@/utils/format';
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

const WEEKDAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

function formatScheduleSlotTime(slot: WorkerScheduleWeekly) {
  return slot.isActive ? `${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}` : 'Nghỉ';
}

type WeeklyScheduleCardProps = Readonly<{
  weeklySchedule: WorkerScheduleWeekly[];
  onEditSlot: (slot: WorkerScheduleWeekly) => void;
  onToggleSlot: (index: number) => void;
}>;

function WeeklyScheduleCard({ weeklySchedule, onEditSlot, onToggleSlot }: WeeklyScheduleCardProps) {
  return (
    <View className="bg-white rounded-2xl p-2 my-2 shadow-sm border border-gray-100">
      <Text className="font-montserrat-bold text-base text-gray-800 px-3 py-2 flex-shrink">
        Lịch làm việc hàng tuần
      </Text>
      <View className="rounded-lg overflow-hidden">
        {weeklySchedule.map((slot, index) => (
          <View
            key={slot.id ?? `${slot.workerProfileId}-${slot.dayOfWeek}`}
            className="flex-row items-center justify-between gap-3 py-3 px-3 border-b border-gray-100">
            <Pressable className="flex-1" onPress={() => onEditSlot(slot)}>
              <Text className="font-montserrat-bold text-sm text-gray-800">
                {WEEKDAY_NAMES[slot.dayOfWeek]}
              </Text>
              <Text className="font-montserrat text-xs text-gray-500 mt-0.5">
                {formatScheduleSlotTime(slot)}
              </Text>
            </Pressable>
            <Pressable className="w-8 h-8 items-center justify-center" onPress={() => onEditSlot(slot)}>
              <MaterialIcons name="edit" size={18} color="#818A91" />
            </Pressable>
            <Switch
              value={slot.isActive}
              onValueChange={() => onToggleSlot(index)}
              trackColor={{ false: '#dcd9d9', true: '#C6DFC6' }}
              thumbColor={slot.isActive ? '#0F382C' : '#818A91'}
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
    <View className="bg-white rounded-2xl p-2 my-2 shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-center mb-1.5 gap-3">
        <Text className="font-montserrat-bold text-base text-gray-800 px-3 py-2 flex-shrink">
          Đăng ký nghỉ phép (Exception)
        </Text>
        <Pressable className="pr-3" onPress={onAddDayOff}>
          <Text className="font-montserrat-semibold text-xs text-[#0F382C] flex-shrink-0">
            + Thêm ngày nghỉ
          </Text>
        </Pressable>
      </View>
      <View className="rounded-lg overflow-hidden">
        {exceptions.length > 0 ? (
          exceptions.map((ex) => (
            <View key={ex.id ?? ex.date} className="flex-row items-center justify-between py-2.5 px-3 border-b border-gray-100">
              <View className="flex-1">
                <Text className="font-montserrat-bold text-sm text-gray-800">
                  {ex.date}
                </Text>
                <Text className="font-montserrat text-xs text-gray-500 mt-0.5">
                  {ex.reason || 'Việc riêng'}
                </Text>
              </View>
              <Pressable onPress={() => onDeleteDayOff(ex.date)}>
                <MaterialIcons name="delete" size={20} color="#BA1A1A" />
              </Pressable>
            </View>
          ))
        ) : (
          <Text className="font-montserrat text-sm text-gray-400 text-center py-2.5">
            Chưa có lịch đăng ký nghỉ nào.
          </Text>
        )}
      </View>
    </View>
  );
}

function mergeIdentityRecognitionResults(results: FptIdentityRecognitionResult[]) {
  return results.reduce(
    (merged, item) => ({
      citizenIdNumber: merged.citizenIdNumber || item.citizenIdNumber,
      issueDate: merged.issueDate || item.issueDate,
      issuePlace: merged.issuePlace || item.issuePlace,
      fullName: merged.fullName || item.fullName,
      dateOfBirth: merged.dateOfBirth || item.dateOfBirth,
      address: merged.address || item.address,
    }),
    {
      citizenIdNumber: '',
      issueDate: '',
      issuePlace: '',
      fullName: '',
      dateOfBirth: '',
      address: '',
    }
  );
}

export default function WorkerProfileScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  // Queries
  const { data: profile = null, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['workerProfileMe'],
    queryFn: getWorkerProfileMe,
    retry: false,
  });

  React.useEffect(() => {
    if (!isLoadingProfile) {
      if (profile === null) {
        router.replace('/(worker)/worker-setup' as any);
      }
    }
  }, [profile, isLoadingProfile]);

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
  const [latitude, setLatitude] = React.useState<number>(16.0749);
  const [longitude, setLongitude] = React.useState<number>(108.2291);

  // Goong Place AutoComplete & GPS states
  const [autoCompleteResults, setAutoCompleteResults] = React.useState<any[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = React.useState(false);
  const [showAutoCompleteDropdown, setShowAutoCompleteDropdown] = React.useState(false);
  const [isGpsLoading, setIsGpsLoading] = React.useState(false);

  const autoCompleteTimeoutRef = React.useRef<any>(null);

  const fetchAddressAutoComplete = (query: string) => {
    if (autoCompleteTimeoutRef.current) {
      clearTimeout(autoCompleteTimeoutRef.current);
    }
    if (!query.trim() || query.trim().length < 2) {
      setAutoCompleteResults([]);
      setShowAutoCompleteDropdown(false);
      return;
    }

    autoCompleteTimeoutRef.current = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const url = `https://rsapi.goong.io/Place/AutoComplete?api_key=${GOONG_API_KEY}&input=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.predictions && data.predictions.length > 0) {
          setAutoCompleteResults(data.predictions);
          setShowAutoCompleteDropdown(true);
        } else {
          setAutoCompleteResults([]);
          setShowAutoCompleteDropdown(false);
        }
      } catch (err) {
        console.warn('[worker-profile] AutoComplete error:', err);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 350);
  };

  const handleSelectAutoCompletePlace = async (item: any) => {
    setShowAutoCompleteDropdown(false);
    const mainText = item.structured_formatting?.main_text || item.description;
    setAddrDetail(mainText);

    if (item.place_id) {
      try {
        const url = `https://rsapi.goong.io/Place/Detail?api_key=${GOONG_API_KEY}&place_id=${item.place_id}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.result && data.result.geometry?.location) {
          const { lat, lng } = data.result.geometry.location;
          setLatitude(lat);
          setLongitude(lng);

          const comps = data.result.address_components || [];
          const cityComp = comps.find((c: any) => c.types?.includes('administrative_area_level_1'))?.long_name;
          const wardComp = comps.find((c: any) => c.types?.includes('administrative_area_level_3') || c.types?.includes('administrative_area_level_2'))?.long_name;

          if (cityComp) setAddrCity(cityComp);
          if (wardComp) setAddrWard(wardComp);
        }
      } catch (err) {
        console.warn('[worker-profile] Place Detail error:', err);
      }
    }
  };

  const handleGetCurrentGpsLocation = async () => {
    setIsGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền vị trí', 'Vui lòng cấp quyền truy cập vị trí GPS cho ứng dụng.');
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setLatitude(lat);
      setLongitude(lng);

      const url = `https://rsapi.goong.io/Geocode?latlng=${lat},${lng}&api_key=${GOONG_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        const first = data.results[0];
        setAddrDetail(first.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);

        const comps = first.address_components || [];
        const cityComp = comps.find((c: any) => c.types?.includes('administrative_area_level_1'))?.long_name;
        const wardComp = comps.find((c: any) => c.types?.includes('administrative_area_level_3') || c.types?.includes('administrative_area_level_2'))?.long_name;

        if (cityComp) setAddrCity(cityComp);
        if (wardComp) setAddrWard(wardComp);

        Alert.alert('Thành công', 'Đã tự động lấy vị trí GPS hiện tại!');
      } else {
        setAddrDetail(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch (err) {
      console.warn('[worker-profile] GPS Error:', err);
      Alert.alert('Lỗi', 'Không thể lấy vị trí GPS hiện tại.');
    } finally {
      setIsGpsLoading(false);
    }
  };

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
  const [activePreviewImage, setActivePreviewImage] = React.useState<string | null>(null);

  // Face Verification States (eKYC)
  const [idFaceSelfieUri, setIdFaceSelfieUri] = React.useState<string | null>(null);
  const [idFaceMatchScore, setIdFaceMatchScore] = React.useState<number | null>(null);
  const [isIdFaceMatched, setIsIdFaceMatched] = React.useState<boolean>(false);
  const [isComparingIdFace, setIsComparingIdFace] = React.useState<boolean>(false);
  const [idFaceCaptureModalOpen, setIdFaceCaptureModalOpen] = React.useState<boolean>(false);

  // Load identification CCCD details when modal opens
  React.useEffect(() => {
    if (profile && identificationModalOpen) {
      setIdNumber(profile.citizenIdNumber || '');
      setIdIssueDate(profile.citizenIdIssueDate ? profile.citizenIdIssueDate.split('T')[0] : '');
      setIdIssuePlace(profile.citizenIdIssuePlace || '');
      setIdLocalUris(profile.identificationImages?.map((img: any) => img.url) || []);
      if (profile.user?.faceImageUrl || (profile as any).faceImageUrl) {
        setIdFaceSelfieUri(profile.user?.faceImageUrl || (profile as any).faceImageUrl);
        setIsIdFaceMatched(true);
        setIdFaceMatchScore((profile.user as any)?.faceMatchScore ?? 92);
      } else {
        setIdFaceSelfieUri(null);
        setIsIdFaceMatched(false);
      }
    }
  }, [profile, identificationModalOpen]);

  const handleIdFaceCaptured = async (selfieUri: string) => {
    setIdFaceSelfieUri(selfieUri);
    const cardFront = idLocalUris[0];
    if (!cardFront) {
      Alert.alert(
        'Thiếu ảnh CCCD',
        'Vui lòng tải hoặc chụp ảnh Mặt trước CCCD trước để tiến hành đối soát khuôn mặt.'
      );
      return;
    }
    setIsComparingIdFace(true);
    try {
      const result = await compareFaces(cardFront, selfieUri);
      setIdFaceMatchScore(result.similarity);
      if (result.isMatch) {
        setIsIdFaceMatched(true);
        Alert.alert(
          'Xác thực thành công',
          `Khuôn mặt trùng khớp với ảnh trên CCCD (${result.similarity.toFixed(1)}%).`
        );
      } else {
        setIsIdFaceMatched(false);
        Alert.alert(
          'Không trùng khớp',
          `Khuôn mặt không khớp với ảnh trên CCCD (${result.similarity.toFixed(1)}%). Vui lòng chụp lại ở nơi đủ sáng.`
        );
      }
    } catch (err: any) {
      console.warn('Id face match error:', err);
      Alert.alert('Lỗi đối soát', err.message || 'Không thể so khớp khuôn mặt lúc này.');
    } finally {
      setIsComparingIdFace(false);
    }
  };

  // Certificates States
  const [certificatesModalOpen, setCertificatesModalOpen] = React.useState(false);
  const [newCertTitle, setNewCertTitle] = React.useState('');
  const [newCertIssuedBy, setNewCertIssuedBy] = React.useState('');
  const [newCertIssuedAt, setNewCertIssuedAt] = React.useState('');
  const [newCertLocalUris, setNewCertLocalUris] = React.useState<string[]>([]);

  // Profile date picker states
  type ProfileDatePickerTarget = 'idCard' | 'newCert' | null;
  const [activeProfileDatePicker, setActiveProfileDatePicker] =
    React.useState<ProfileDatePickerTarget>(null);
  const [tempProfileDate, setTempProfileDate] = React.useState<Date>(() => new Date());

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

  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để đổi ảnh đại diện.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploadingAvatar(true);
        try {
          await updateWorkerProfile({
            avatarFile: {
              uri: asset.uri,
              type: asset.type || 'image/jpeg',
              name: asset.fileName || 'avatar.jpg',
            },
          });
          queryClient.invalidateQueries({ queryKey: ['workerProfileMe'] });
          Alert.alert('Thành công', 'Đã cập nhật ảnh đại diện mới.');
        } catch (err: any) {
          Alert.alert('Lỗi', err?.message || 'Không thể tải lên ảnh đại diện.');
        } finally {
          setIsUploadingAvatar(false);
        }
      }
    } catch (err) {
      console.warn('Avatar picker error:', err);
    }
  };

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
        phone: profile?.phone || undefined,
        bio: profile?.bio || undefined,
        address: {
          label: 'Địa chỉ làm việc',
          city: addrCity,
          district: null,
          ward: addrWard,
          detail: addrDetail,
          lat: latitude || profile?.address?.lat || 16.0749,
          lng: longitude || profile?.address?.lng || 108.2291,
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
        faceSelfieUri: idFaceSelfieUri,
        faceMatchScore: idFaceMatchScore,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workerProfileMe'] });
      setIdentificationModalOpen(false);
      setActivePreviewImage(null);
      setIdLocalUris([]);
      Alert.alert('Thành công', 'Hồ sơ CCCD & Khuôn mặt đã được gửi đi để duyệt xác minh.');
    },
  });

  const recognizeCccdMutation = useMutation({
    mutationFn: async (localUris: string[]) => {
      const results = [];
      for (const uri of localUris) {
        try {
          const res = await recognizeIdentityImage(uri);
          results.push(res);
        } catch (e: any) {
          console.warn('CCCD recognition partial error:', e?.message);
        }
      }
      return mergeIdentityRecognitionResults(results);
    },
    onSuccess: (result) => {
      if (result.citizenIdNumber) setIdNumber(result.citizenIdNumber);
      if (result.issueDate) setIdIssueDate(result.issueDate);
      if (result.issuePlace) setIdIssuePlace(result.issuePlace);

      if (!result.citizenIdNumber && !result.issueDate && !result.issuePlace) {
        Alert.alert(
          'Chưa nhận diện được thông tin',
          'Vui lòng kiểm tra ảnh CCCD hoặc nhập thông tin thủ công.'
        );
      }
    },
    onError: (error) => {
      Alert.alert(
        'Không thể nhận diện CCCD',
        getApiErrorMessage(error) || 'Vui lòng nhập thông tin thủ công.'
      );
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
        issuedAt: newCertIssuedAt ? formatToIsoDateTime(newCertIssuedAt) : dateToDateOnly(new Date()),
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
      setNewCertIssuedAt('');
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
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Vui lòng cho phép quyền truy cập thư viện ảnh.');
      return;
    }
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

  const handleSelectCccdSource = () => {
    handlePickCccdImages();
  };

  const handleCameraCccdImages = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Vui lòng cho phép quyền truy cập camera để chụp ảnh CCCD.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const newUri = result.assets[0].uri;
      setIdLocalUris((prev) => {
        const next = [...prev, newUri];
        recognizeCccdMutation.mutate(next);
        return next;
      });
    }
  };

  const handlePickCccdImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Vui lòng cho phép quyền truy cập thư viện ảnh.');
      return;
    }
    const remainingLimit = 2 - idLocalUris.length;
    if (remainingLimit <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: remainingLimit > 1,
      selectionLimit: remainingLimit,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((a) => a.uri);
      setIdLocalUris((prev) => {
        const next = [...prev, ...newUris].slice(0, 2);
        recognizeCccdMutation.mutate(next);
        return next;
      });
    }
  };

  const handleRecognizeCccdImages = () => {
    if (idLocalUris.length === 0) return;
    recognizeCccdMutation.mutate(idLocalUris);
  };

  const handleCloseIdentificationModal = () => {
    setActivePreviewImage(null);
    setIdLocalUris([]);
    setIdentificationModalOpen(false);
  };

  const handlePickCertImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Vui lòng cho phép quyền truy cập thư viện ảnh.');
      return;
    }
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

  const cccdRecognitionLoading = recognizeCccdMutation.isPending;
  const canSubmitIdentification =
    idNumber.trim().length === 12 &&
    idIssueDate.trim().length > 0 &&
    idIssuePlace.trim().length > 0 &&
    idLocalUris.length >= 2 &&
    idFaceSelfieUri !== null &&
    isIdFaceMatched &&
    !updateCccdMutation.isPending &&
    !cccdRecognitionLoading &&
    !isComparingIdFace;

  if (isLoadingProfile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF9F5' }}>
        <ActivityIndicator size="large" color="#0F382C" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#fbf9f8]">
      <View className="pb-3 flex-row items-center justify-between px-4 bg-white border-b border-gray-200" style={{ paddingTop: Math.max(insets.top, 12) }}>
        <View className="w-9 h-9" />
        <Text className="font-montserrat-bold text-base text-[#1b1c1c]">Tài khoản</Text>
        <Pressable
          className="w-9 h-9 rounded-full bg-[#F4F1EA] items-center justify-center"
          onPress={() => router.push('/(customer)/support-tickets' as any)}>
          <MaterialIcons name="headset-mic" size={20} color="#0F382C" />
        </Pressable>
      </View>

      <KeyboardAwareScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false} bottomOffset={44}>
        {/* Profile Card (styled using NativeWind) */}
        <View className="bg-white border border-gray-300 rounded-2xl p-5 items-center mb-5 shadow-sm">
          <View className="relative mb-3">
            <Pressable onPress={handlePickAvatar} disabled={isUploadingAvatar}>
              {profile?.avatarUrl ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  className="w-20 h-20 rounded-full border-2 border-[#0F382C]"
                />
              ) : (
                <View className="w-20 h-20 rounded-full border-2 border-[#0F382C] bg-[#D6CFC4] items-center justify-center">
                  <Text style={{ fontSize: 28, fontFamily: 'Montserrat_700Bold', color: '#0F382C' }}>
                    {(profile?.fullName || '').charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              {isUploadingAvatar ? (
                <View className="absolute inset-0 rounded-full bg-black/40 items-center justify-center">
                  <ActivityIndicator size="small" color="#ffffff" />
                </View>
              ) : (
                <View className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#0F382C] border-2 border-white items-center justify-center shadow">
                  <MaterialIcons name="photo-camera" size={14} color="#ffffff" />
                </View>
              )}
            </Pressable>
          </View>
          <Text className="text-lg text-gray-800 font-montserrat-bold">
            {profile?.fullName || 'Kỹ thuật viên'}
          </Text>
          <Text className="text-xs text-gray-500 mt-0.5 mb-4 font-montserrat">
            Đối tác kỹ thuật viên
          </Text>

          <View className="flex-row items-center w-full border-t border-gray-200 pt-4">
            <View className="flex-1 items-center">
              <View className="flex-row items-center gap-1">
                <MaterialIcons name="star" size={18} color="#FFB000" />
                <Text className="text-base text-gray-800 font-montserrat-bold">
                  {profile?.rating ? Number(profile.rating).toFixed(1) : '4.8'}
                </Text>
              </View>
              <Text className="text-[11px] text-gray-500 mt-0.5 font-montserrat">
                ({profile?.reviewsCount ?? 0} đánh giá)
              </Text>
            </View>
            <View className="w-px h-7 bg-gray-200" />
            <View className="flex-1 items-center">
              <View className="flex-row items-center gap-1">
                <MaterialIcons name="done-all" size={18} color="#0F382C" />
                <Text className="text-base text-gray-800 font-montserrat-bold">
                  {profile?.completedJobs ?? 0}
                </Text>
              </View>
              <Text className="text-[11px] text-gray-500 mt-0.5 font-montserrat">
                Đơn hoàn thành
              </Text>
            </View>
          </View>
        </View>

        {/* Section 1: Thông tin cá nhân */}
        <View className="bg-white rounded-2xl p-2 my-2 shadow-sm border border-gray-100">
          <Text className="font-montserrat-bold text-base text-gray-800 px-3 py-2 flex-shrink">Thông tin cá nhân</Text>
          <View className="rounded-lg overflow-hidden">
            {isEditingProfile ? (
              <View className="gap-2 p-3">
                <Text className="font-montserrat-semibold text-xs text-gray-500 mb-0.5">Số điện thoại:</Text>
                <TextInput
                  className="border border-gray-200 rounded-md h-10 px-2.5 font-montserrat text-sm text-[#383838] mb-2.5"
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                />
                <Text className="font-montserrat-semibold text-xs text-gray-500 mb-0.5">Giới thiệu bản thân:</Text>
                <TextInput
                  className="border border-gray-200 rounded-md px-2.5 py-2 font-montserrat text-sm text-[#383838] mb-3"
                  value={editBio}
                  onChangeText={setEditBio}
                  multiline
                  numberOfLines={3}
                  style={{ textAlignVertical: 'top' }}
                />
                <View className="flex-row justify-end gap-3">
                  <Pressable
                    className="py-2 px-4 rounded-md border border-gray-500"
                    onPress={() => setIsEditingProfile(false)}>
                    <Text className="text-gray-500 font-montserrat-semibold text-xs">Hủy</Text>
                  </Pressable>
                  <Pressable
                    className="py-2 px-4 rounded-md bg-[#0F382C]"
                    onPress={() =>
                      updateProfileMutation.mutate({
                        bio: editBio,
                        phone: editPhone,
                        address: profile?.address || undefined,
                      })
                    }>
                    <Text className="text-white font-montserrat-semibold text-xs">Lưu</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View className="px-3 py-2">
                <Text className="font-montserrat text-sm text-[#383838] leading-5 mb-2">
                  <Text className="font-montserrat-bold">SĐT liên hệ: </Text>
                  {profile?.phone}
                </Text>
                <Text className="font-montserrat text-sm text-[#383838] leading-5 mb-2">
                  <Text className="font-montserrat-bold">Giới thiệu: </Text>
                  {profile?.bio || 'Kỹ thuật viên chưa cập nhật giới thiệu.'}
                </Text>
                <Pressable className="self-start py-1.5 px-3 rounded-md border border-[#0F382C] mt-1.5" onPress={() => setIsEditingProfile(true)}>
                  <Text className="text-[#0F382C] font-montserrat-semibold text-xs">Chỉnh sửa thông tin</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Section 2: Hồ sơ đối tác & Xác minh */}
        <View className="bg-white rounded-2xl p-2 my-2 shadow-sm border border-gray-100">
          <Text className="font-montserrat-bold text-base text-gray-800 px-3 py-2 flex-shrink">Xác minh & Hồ sơ đối tác</Text>
          <View className="rounded-lg overflow-hidden">
            {/* Địa điểm hoạt động */}
            <Pressable className="flex-row items-center justify-between py-3 px-3" onPress={() => setAddressModalOpen(true)}>
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="my-location" size={22} color="#0F382C" />
                <Text className="font-montserrat-semibold text-[15px] text-[#1b1c1c]">Địa điểm hoạt động</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#574237" />
            </Pressable>

            <View className="h-px bg-gray-200 mx-3" />

            {/* Hình ảnh hoạt động (Portfolio) */}
            <Pressable className="flex-row items-center justify-between py-3 px-3" onPress={() => setPortfolioModalOpen(true)}>
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="photo-library" size={22} color="#0F382C" />
                <Text className="font-montserrat-semibold text-[15px] text-[#1b1c1c]">Hình ảnh hoạt động (Portfolio)</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#574237" />
            </Pressable>

            <View className="h-px bg-gray-200 mx-3" />

            {/* Xác minh danh tính */}
            <Pressable className="flex-row items-center justify-between py-3 px-3" onPress={() => setIdentificationModalOpen(true)}>
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="badge" size={22} color="#0F382C" />
                <Text className="font-montserrat-semibold text-[15px] text-[#1b1c1c]">Xác minh danh tính (CCCD)</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#574237" />
            </Pressable>

            <View className="h-px bg-gray-200 mx-3" />

            {/* Chứng chỉ & Bằng cấp */}
            <Pressable className="flex-row items-center justify-between py-3 px-3" onPress={() => setCertificatesModalOpen(true)}>
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="workspace-premium" size={22} color="#0F382C" />
                <Text className="font-montserrat-semibold text-[15px] text-[#1b1c1c]">Chứng chỉ & Bằng cấp</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#574237" />
            </Pressable>
          </View>
        </View>

        {/* Section 3: Hỗ trợ */}
        <View className="bg-white rounded-2xl p-2 my-2 shadow-sm border border-gray-100">
          <Text className="font-montserrat-bold text-base text-gray-800 px-3 py-2 flex-shrink">Hỗ trợ</Text>
          <View className="rounded-lg overflow-hidden">
            <Pressable
              className="flex-row items-center justify-between py-3 px-3"
              onPress={() => router.push('/(customer)/support-tickets' as any)}>
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="support-agent" size={20} color="#0F382C" />
                <Text className="font-montserrat-semibold text-[15px] text-[#1b1c1c]">Trung tâm trợ giúp & Khiếu nại</Text>
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
        <View className="items-center justify-center my-6">
          <Pressable className="flex-row items-center gap-2 border border-[#ba1a1a] bg-transparent py-3 px-8 rounded-lg min-h-[44px]" onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color="#ba1a1a" />
            <Text className="font-montserrat-semibold text-sm text-[#ba1a1a]">Đăng xuất</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>

      <WorkerTabBar activeTab="profile" />

      <Modal visible={logoutConfirmOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-5">
          <Pressable
            className="absolute inset-0"
            onPress={() => {
              if (!isLoggingOut) setLogoutConfirmOpen(false);
            }}
          />
          <View className="w-full max-w-[360px] bg-white rounded-2xl p-5">
            <Text className="font-montserrat-bold text-lg text-[#1b1c1c] mb-2">Đăng xuất</Text>
            <Text className="font-montserrat text-sm text-[#574237] leading-5 mb-5">Bạn có chắc chắn muốn đăng xuất?</Text>
            <View className="flex-row justify-end gap-3">
              <Pressable
                className="min-h-[44px] px-[18px] rounded-lg border border-gray-200 items-center justify-center"
                onPress={() => setLogoutConfirmOpen(false)}
                disabled={isLoggingOut}>
                <Text className="font-montserrat-semibold text-sm text-[#574237]">Hủy</Text>
              </Pressable>
              <Pressable
                className={`min-h-[44px] min-w-[120px] px-[18px] rounded-lg bg-[#ba1a1a] items-center justify-center ${isLoggingOut ? 'bg-[#EAE5E3]' : ''}`}
                onPress={confirmLogout}
                disabled={isLoggingOut}>
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="font-montserrat-bold text-sm text-white">Đăng xuất</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 1: Working Address */}
      <Modal visible={addressModalOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-5">
          <Pressable
            className="absolute inset-0"
            onPress={() => {
              if (optionPickerOpen) {
                setOptionPickerOpen(false);
              } else {
                setAddressModalOpen(false);
              }
            }}
          />
          <View className="w-full max-w-[420px] bg-white rounded-2xl p-5">
            {optionPickerOpen ? (
              <View className="w-full">
                <View className="flex-row justify-between items-center border-b border-[#f5f3f2] pb-3 mb-4">
                  <View className="flex-row items-center gap-2">
                    <Pressable onPress={() => setOptionPickerOpen(false)} className="p-1">
                      <MaterialIcons name="arrow-back" size={24} color="#383838" />
                    </Pressable>
                    <Text className="font-montserrat-bold text-base text-[#383838]">
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

                <View className="h-11 border border-gray-200 rounded-lg px-3 mb-3 flex-row items-center gap-2">
                  <MaterialIcons name="search" size={20} color="#818A91" />
                  <TextInput
                    className="flex-1 font-montserrat text-sm text-[#383838]"
                    placeholder="Tìm kiếm..."
                    placeholderTextColor="#9A9A9A"
                    value={pickerSearchQuery}
                    onChangeText={setPickerSearchQuery}
                  />
                </View>

                <ScrollView
                  className="max-h-[300px] w-full"
                  keyboardShouldPersistTaps="handled">
                  {filteredPickerList.map((item: any) => (
                    <Pressable
                      key={item.code}
                      className="py-3.5 px-3 border-b border-[#efedec]"
                      onPress={() => handleSelectOption(item)}>
                      <Text className="font-montserrat-semibold text-sm text-[#383838]">{item.name}</Text>
                    </Pressable>
                  ))}
                  {filteredPickerList.length === 0 && (
                    <Text className="font-montserrat text-sm text-gray-500 text-center py-2.5">Không tìm thấy kết quả.</Text>
                  )}
                </ScrollView>
              </View>
            ) : (
              <View className="w-full">
                <View className="flex-row justify-between items-center border-b border-[#f5f3f2] pb-3 mb-4">
                  <Text className="font-montserrat-bold text-base text-[#383838]">Địa điểm hoạt động</Text>
                  <Pressable onPress={() => setAddressModalOpen(false)}>
                    <MaterialIcons name="close" size={24} color="#383838" />
                  </Pressable>
                </View>

                <ScrollView
                  className="max-h-[420px] w-full"
                  keyboardShouldPersistTaps="handled">
                  <View className="flex-row justify-between items-center mb-0.5">
                    <Text className="font-montserrat-semibold text-xs text-gray-500">Địa chỉ chi tiết (Số nhà, Tên đường):</Text>
                    <Pressable
                      className="flex-row items-center gap-1 py-1"
                      onPress={handleGetCurrentGpsLocation}
                      disabled={isGpsLoading}>
                      {isGpsLoading ? (
                        <ActivityIndicator size="small" color="#0F382C" />
                      ) : (
                        <MaterialIcons name="my-location" size={14} color="#0F382C" />
                      )}
                      <Text className="font-montserrat-semibold text-xs text-[#0F382C]">
                        Lấy GPS
                      </Text>
                    </Pressable>
                  </View>

                  <View className="relative z-50 mb-4">
                    <TextInput
                      className="border border-gray-200 rounded-lg min-h-[52px] px-3 py-2 font-montserrat text-sm text-[#383838] leading-5"
                      placeholder="Ví dụ: 305 Trần Hưng Đạo (Hoặc nhập để gợi ý)"
                      placeholderTextColor="#9A9A9A"
                      multiline={true}
                      style={{ textAlignVertical: 'center' }}
                      value={addrDetail}
                      onChangeText={(text) => {
                        setAddrDetail(text);
                        fetchAddressAutoComplete(text);
                      }}
                    />

                    {showAutoCompleteDropdown && autoCompleteResults.length > 0 && (
                      <View className="absolute top-13 left-0 right-0 bg-white rounded-xl border border-gray-200 shadow-lg z-50 max-h-48">
                        <ScrollView keyboardShouldPersistTaps="handled">
                          {autoCompleteResults.map((item, idx) => (
                            <Pressable
                              key={item.place_id || idx}
                              className="flex-row items-start p-2.5 border-b border-gray-100"
                              onPress={() => handleSelectAutoCompletePlace(item)}>
                              <MaterialIcons name="location-on" size={16} color="#0F382C" className="mr-2 mt-0.5" />
                              <View className="flex-1">
                                <Text className="font-montserrat-semibold text-xs text-gray-800">
                                  {item.structured_formatting?.main_text || item.description}
                                </Text>
                                <Text className="font-montserrat text-[10px] text-gray-500 mt-0.5" numberOfLines={1}>
                                  {item.structured_formatting?.secondary_text || item.description}
                                </Text>
                              </View>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  <Text className="font-montserrat-semibold text-xs text-gray-500 mb-0.5">Tỉnh / Thành phố:</Text>
                  <Pressable
                    className="h-12 border border-gray-200 rounded-lg px-3 flex-row items-center justify-between bg-white mb-4"
                    onPress={() => {
                      setPickerType('province');
                      setPickerSearchQuery('');
                      setOptionPickerOpen(true);
                    }}>
                    <Text
                      className={addrCity ? 'font-montserrat-semibold text-sm text-[#1b1c1c]' : 'font-montserrat text-sm text-[#9A9A9A]'}>
                      {addrCity || 'Chọn Tỉnh / Thành phố'}
                    </Text>
                    <MaterialIcons name="keyboard-arrow-down" size={20} color="#818A91" />
                  </Pressable>

                  <Text className="font-montserrat-semibold text-xs text-gray-500 mb-0.5">Phường / Xã:</Text>
                  <Pressable
                    className={`h-12 border border-gray-200 rounded-lg px-3 flex-row items-center justify-between bg-white mb-4 ${!selectedProvinceCode ? 'bg-[#f5f3f2] border-[#EAE5E3]' : ''}`}
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
                      className={addrWard ? 'font-montserrat-semibold text-sm text-[#1b1c1c]' : 'font-montserrat text-sm text-[#9A9A9A]'}>
                      {addrWard || 'Chọn Phường / Xã'}
                    </Text>
                    <MaterialIcons name="keyboard-arrow-down" size={20} color="#818A91" />
                  </Pressable>

                  <Pressable
                    className={`h-12 rounded-lg bg-[#0F382C] items-center justify-center ${(!addrCity || !addrWard || !addrDetail.trim() || updateAddressMutation.isPending) ? 'bg-[#EAE5E3]' : ''}`}
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
                      <Text className="text-white font-montserrat-bold text-sm">Lưu địa chỉ hoạt động</Text>
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
        <View className="flex-1 bg-black/50 justify-end">
          <Pressable className="absolute inset-0" onPress={() => setPortfolioModalOpen(false)} />
          <View className="bg-white rounded-t-[20px] p-5 pb-[34px]">
            <View className="flex-row justify-between items-center border-b border-[#f5f3f2] pb-3 mb-4">
              <Text className="font-montserrat-bold text-base text-[#383838]">Hình ảnh hoạt động (Portfolio)</Text>
              <Pressable onPress={() => setPortfolioModalOpen(false)}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>

            <ScrollView className="max-h-[400px]">
              <View className="flex-row flex-wrap gap-3 py-2">
                {profile?.portfolioImages?.map((img: any) => (
                  <View key={img.id} className="relative w-[30%] aspect-square rounded-lg overflow-hidden">
                    <Image source={{ uri: img.url }} className="w-full h-full" />
                    <Pressable
                      className="absolute top-1 right-1 bg-black/60 w-[22px] h-[22px] rounded-full items-center justify-center"
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
              className={`h-12 rounded-lg bg-[#0F382C] items-center justify-center mt-4 ${addPortfolioImageMutation.isPending ? 'bg-[#EAE5E3]' : ''}`}
              onPress={handlePickPortfolioImages}
              disabled={addPortfolioImageMutation.isPending}>
              {addPortfolioImageMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-white font-montserrat-bold text-sm">+ Thêm hình ảnh</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Identification (CCCD) */}
      <Modal visible={identificationModalOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-5">
          <Pressable className="absolute inset-0" onPress={handleCloseIdentificationModal} />
          <View className="w-full max-w-[420px] bg-white rounded-2xl p-5">
            <View className="flex-row justify-between items-center border-b border-[#f5f3f2] pb-3 mb-4">
              <Text className="font-montserrat-bold text-base text-[#383838]">Xác minh danh tính (CCCD)</Text>
              <Pressable onPress={handleCloseIdentificationModal}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>

            <KeyboardAwareScrollView className="max-h-[420px]" keyboardShouldPersistTaps="handled" bottomOffset={24}>
              <Text className="font-montserrat-semibold text-xs text-gray-500 mb-0.5">Số căn cước công dân (CCCD):</Text>
              <TextInput
                className="border border-gray-200 rounded-lg h-12 px-3 font-montserrat text-sm text-[#383838] mb-4"
                placeholder="Nhập 12 số CCCD..."
                placeholderTextColor="#9A9A9A"
                value={idNumber}
                onChangeText={setIdNumber}
                keyboardType="number-pad"
              />

              <Text className="font-montserrat-semibold text-xs text-gray-500 mb-0.5">Ngày cấp:</Text>
              <Pressable
                className="border border-gray-200 rounded-lg h-12 px-3 justify-between flex-row items-center bg-white mb-4"
                onPress={() => {
                  setTempProfileDate(parseDateString(idIssueDate));
                  setActiveProfileDatePicker('idCard');
                }}>
                <Text
                  className={`font-montserrat text-sm ${idIssueDate ? 'text-[#383838]' : 'text-[#9A9A9A]'}`}>
                  {idIssueDate || 'Chọn ngày cấp CCCD (yyyy-MM-dd)'}
                </Text>
                <MaterialIcons name="calendar-today" size={18} color="#0F382C" />
              </Pressable>

              <Text className="font-montserrat-semibold text-xs text-gray-500 mb-0.5">Nơi cấp:</Text>
              <TextInput
                className="border border-gray-200 rounded-lg h-12 px-3 font-montserrat text-sm text-[#383838] mb-4"
                placeholder="Ví dụ: Cục Cảnh sát QLHC về TTXH"
                placeholderTextColor="#9A9A9A"
                value={idIssuePlace}
                onChangeText={setIdIssuePlace}
              />

              <Text className="font-montserrat-semibold text-xs text-gray-500 mb-0.5">Ảnh mặt trước & mặt sau CCCD:</Text>
              <View className="flex-row gap-3 w-full mb-4">
                {idLocalUris.map((uri, idx) => (
                  <View key={uri} className="flex-1 h-[100px] relative rounded-lg overflow-hidden">
                    <Pressable
                      className="w-full h-full"
                      onPress={() => setActivePreviewImage(uri)}>
                      <Image source={{ uri }} className="w-full h-full resize-cover" />
                    </Pressable>
                    <Pressable
                      className="absolute top-1 right-1 bg-white/90 rounded-full p-0.5 z-10 shadow-sm"
                      onPress={() => setIdLocalUris((prev) => prev.filter((_, i) => i !== idx))}>
                      <MaterialIcons name="cancel" size={20} color="#BA1A1A" />
                    </Pressable>
                  </View>
                ))}

                {idLocalUris.length < 2 && (
                  <Pressable
                    className={idLocalUris.length === 0 ? "flex-1 h-[100px] border border-dashed border-[#0F382C] rounded-lg items-center justify-center bg-[#F2F7F2]" : "flex-1 h-[100px] border border-dashed border-[#0F382C] rounded-lg items-center justify-center bg-[#F2F7F2]"}
                    onPress={handleSelectCccdSource}
                    disabled={cccdRecognitionLoading}>
                    <MaterialIcons
                      name="add-a-photo"
                      size={idLocalUris.length === 0 ? 32 : 24}
                      color="#0F382C"
                    />
                    <Text
                      className={
                        idLocalUris.length === 0
                          ? 'font-montserrat-bold text-xs text-[#0F382C]'
                          : 'font-montserrat-semibold text-[11px] text-[#0F382C]'
                      }>
                      {idLocalUris.length === 0
                        ? 'Tải ảnh CCCD (Mặt trước & Mặt sau)'
                        : 'Tải ảnh mặt thứ hai'}
                    </Text>
                  </Pressable>
                )}
              </View>

              {idLocalUris.length > 0 && (
                <View className="min-h-[42px] rounded-lg border border-[#C6DFC6] bg-[#F2F7F2] flex-row items-center gap-2 px-3 py-2 mb-2.5">
                  {cccdRecognitionLoading ? (
                    <>
                      <ActivityIndicator size="small" color="#0F382C" />
                      <Text className="flex-1 font-montserrat text-xs text-[#574237] leading-4">
                        Đang nhận diện thông tin CCCD...
                      </Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons name="document-scanner" size={18} color="#0F382C" />
                      <Text className="flex-1 font-montserrat text-xs text-[#574237] leading-4">
                        Thông tin đã nhận diện có thể chỉnh sửa trước khi gửi.
                      </Text>
                    </>
                  )}
                </View>
              )}

              {idLocalUris.length > 0 && !cccdRecognitionLoading && (
                <Pressable className="h-[38px] rounded-lg border border-[#0F382C] bg-white flex-row items-center justify-center gap-1.5 mb-3" onPress={handleRecognizeCccdImages}>
                  <MaterialIcons name="refresh" size={16} color="#0F382C" />
                  <Text className="font-montserrat-semibold text-xs text-[#0F382C]">Quét lại thông tin CCCD</Text>
                </Pressable>
              )}

              {/* Face ID Verification Section */}
              <Text className="font-montserrat-semibold text-xs text-gray-500 mb-1.5">Xác thực khuôn mặt (eKYC) *:</Text>
              <View className="border border-gray-200 rounded-xl p-3.5 bg-white mb-2">
                {idFaceSelfieUri ? (
                  <View className="flex-row items-center gap-3">
                    <Pressable onPress={() => setActivePreviewImage(idFaceSelfieUri)}>
                      <Image source={{ uri: idFaceSelfieUri }} className="w-16 h-16 rounded-full border-2 border-[#0F382C]" />
                    </Pressable>
                    <View className="flex-1 gap-1">
                      <View className="flex-row items-center gap-1.5">
                        <MaterialIcons
                          name={isIdFaceMatched ? 'check-circle' : 'error'}
                          size={16}
                          color={isIdFaceMatched ? '#16A34A' : '#DC2626'}
                        />
                        <Text
                          className={`font-montserrat-bold text-xs ${isIdFaceMatched ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                          {isIdFaceMatched
                            ? `Đã khớp CCCD (${(idFaceMatchScore ?? 90).toFixed(1)}%)`
                            : 'Chưa khớp CCCD'}
                        </Text>
                      </View>
                      <Text className="font-montserrat text-[11px] text-gray-500">
                        {isIdFaceMatched ? 'Ảnh chân dung đã đối soát thành công.' : 'Khuôn mặt chưa trùng khớp, vui lòng chụp lại.'}
                      </Text>
                      <Pressable
                        className="flex-row items-center gap-1 mt-0.5"
                        onPress={() => setIdFaceCaptureModalOpen(true)}
                        disabled={isComparingIdFace}>
                        <MaterialIcons name="camera-alt" size={12} color="#0F382C" />
                        <Text className="font-montserrat-semibold text-[11px] text-[#0F382C] underline">Chụp lại</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View className="items-center py-2 gap-2">
                    <MaterialIcons name="face" size={28} color="#0F382C" />
                    <Text className="font-montserrat-bold text-xs text-[#1b1c1c] text-center">
                      Chụp ảnh khuôn mặt để đối soát CCCD
                    </Text>
                    <Pressable
                      className={`h-9 px-4 rounded-lg bg-[#0F382C] flex-row items-center justify-center gap-1.5 w-full ${(!idLocalUris[0] || isComparingIdFace) ? 'bg-[#9A9A9A]' : ''}`}
                      onPress={() => {
                        if (!idLocalUris[0]) {
                          Alert.alert('Chưa có ảnh CCCD', 'Vui lòng tải hoặc chụp ảnh Mặt trước CCCD trước.');
                          return;
                        }
                        setIdFaceCaptureModalOpen(true);
                      }}
                      disabled={!idLocalUris[0] || isComparingIdFace}>
                      {isComparingIdFace ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <MaterialIcons name="camera-alt" size={16} color="#ffffff" />
                          <Text className="font-montserrat-bold text-xs text-white">
                            {idLocalUris[0] ? 'Bắt đầu chụp khuôn mặt' : 'Cần tải mặt trước CCCD'}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>

              <Pressable
                className={`h-12 rounded-lg bg-[#0F382C] items-center justify-center mt-3 ${!canSubmitIdentification ? 'bg-[#EAE5E3]' : ''}`}
                onPress={() => updateCccdMutation.mutate()}
                disabled={!canSubmitIdentification}>
                {updateCccdMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white font-montserrat-bold text-sm">Gửi yêu cầu xác minh</Text>
                )}
              </Pressable>
            </KeyboardAwareScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: Certificates */}
      <Modal visible={certificatesModalOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-5">
          <Pressable
            className="absolute inset-0"
            onPress={() => setCertificatesModalOpen(false)}
          />
          <View className="w-full max-w-[420px] bg-white rounded-2xl p-5">
            <View className="flex-row justify-between items-center border-b border-[#f5f3f2] pb-3 mb-4">
              <Text className="font-montserrat-bold text-base text-[#383838]">Chứng chỉ & Bằng cấp</Text>
              <Pressable onPress={() => setCertificatesModalOpen(false)}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>

            <KeyboardAwareScrollView className="max-h-[420px]" keyboardShouldPersistTaps="handled" bottomOffset={24}>
              {/* Render current certificates */}
              <Text className="font-montserrat-semibold text-xs text-gray-500 mb-2">Danh sách hiện tại:</Text>
              {profile?.certificates?.map((c: any) => (
                <View key={c.id} className="flex-row items-center gap-3 py-2.5 border-b border-[#efedec]">
                  {c.imageUrl ? (
                    <Pressable onPress={() => setActivePreviewImage(c.imageUrl)}>
                      <Image source={{ uri: c.imageUrl }} className="w-11 h-11 rounded bg-gray-100" />
                    </Pressable>
                  ) : (
                    <MaterialIcons name="workspace-premium" size={28} color="#0F382C" />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text className="font-montserrat-bold text-sm text-[#1b1c1c]">{c.title}</Text>
                    <Text className="font-montserrat text-xs text-gray-500 mt-0.5">Cấp bởi: {c.issuedBy}</Text>
                  </View>
                </View>
              ))}

              <View className="h-px bg-gray-200 mx-3 my-4" />

              {/* Add New Certificate Form */}
              <Text className="font-montserrat-bold text-xs text-[#1b1c1c] mb-0.5">
                Thêm chứng chỉ mới
              </Text>

              <Text className="font-montserrat-semibold text-xs text-gray-500 mb-0.5 mt-2">Tên chứng chỉ:</Text>
              <TextInput
                className="border border-gray-200 rounded-lg h-12 px-3 font-montserrat text-sm text-[#383838] mb-4"
                placeholder="Ví dụ: Chứng chỉ kỹ thuật viên Spa"
                placeholderTextColor="#9A9A9A"
                value={newCertTitle}
                onChangeText={setNewCertTitle}
              />

              <Text className="font-montserrat-semibold text-xs text-gray-500 mb-0.5">Nơi cấp chứng chỉ:</Text>
              <TextInput
                className="border border-gray-200 rounded-lg h-12 px-3 font-montserrat text-sm text-[#383838] mb-4"
                placeholder="Ví dụ: Trường Đào tạo Spa & Thẩm mỹ"
                placeholderTextColor="#9A9A9A"
                value={newCertIssuedBy}
                onChangeText={setNewCertIssuedBy}
              />

              <Text className="font-montserrat-semibold text-xs text-gray-500 mb-0.5">Ngày nhận chứng chỉ:</Text>
              <Pressable
                className="border border-gray-200 rounded-lg h-12 px-3 justify-between flex-row items-center bg-white mb-4"
                onPress={() => {
                  setTempProfileDate(parseDateString(newCertIssuedAt));
                  setActiveProfileDatePicker('newCert');
                }}>
                <Text
                  className={`font-montserrat text-sm ${newCertIssuedAt ? 'text-[#383838]' : 'text-[#9A9A9A]'}`}>
                  {newCertIssuedAt || 'Chọn ngày nhận chứng chỉ (yyyy-MM-dd)'}
                </Text>
                <MaterialIcons name="calendar-today" size={18} color="#0F382C" />
              </Pressable>

              <Text className="font-montserrat-semibold text-xs text-gray-500 mb-0.5">Tài liệu chứng chỉ (Hình ảnh):</Text>
              {newCertLocalUris.length > 0 ? (
                <View className="flex-row gap-3 my-3">
                  <Pressable onPress={() => setActivePreviewImage(newCertLocalUris[0])}>
                    <Image source={{ uri: newCertLocalUris[0] }} className="w-[100px] h-[100px] rounded-lg bg-[#efedec]" />
                  </Pressable>
                  <Pressable
                    className="h-13 rounded-lg border border-dashed border-[#0F382C] flex-row items-center justify-center bg-[#F2F7F2] gap-2 px-4 flex-1"
                    onPress={() => setNewCertLocalUris([])}>
                    <MaterialIcons name="delete" size={20} color="#BA1A1A" />
                    <Text className="font-montserrat-semibold text-sm text-[#BA1A1A]">
                      Xóa ảnh
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable className="h-13 rounded-lg border border-dashed border-[#0F382C] flex-row items-center justify-center bg-[#F2F7F2] gap-2 px-4 my-2" onPress={handlePickCertImage}>
                  <MaterialIcons name="add-photo-alternate" size={24} color="#0F382C" />
                  <Text className="font-montserrat-semibold text-sm text-[#0F382C]">Chọn ảnh chứng chỉ</Text>
                </Pressable>
              )}

              <Pressable
                className={`h-12 rounded-lg bg-[#0F382C] items-center justify-center mt-4 ${(!newCertTitle.trim() || !newCertIssuedBy.trim() || newCertLocalUris.length === 0 || addCertificateMutation.isPending) ? 'bg-[#EAE5E3]' : ''}`}
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
                  <Text className="text-white font-montserrat-bold text-sm">Thêm chứng chỉ</Text>
                )}
              </Pressable>
            </KeyboardAwareScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Add Day Off Exception */}
      <Modal visible={addDayOffModalOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-5">
          <Pressable className="absolute inset-0" onPress={() => setAddDayOffModalOpen(false)} />
          <View className="w-full max-w-[420px] bg-white rounded-2xl p-5">
            <View className="flex-row justify-between items-center border-b border-[#f5f3f2] pb-3 mb-4">
              <Text className="font-montserrat-bold text-base text-[#383838]">Đăng ký nghỉ phép</Text>
              <Pressable onPress={() => setAddDayOffModalOpen(false)}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>

            <Text className="font-montserrat-semibold text-xs text-gray-500 mb-0.5">Chọn ngày nghỉ:</Text>
            <View className="min-h-[48px] border border-[#0F382C] rounded-lg px-3 mb-2.5 flex-row items-center gap-2.5 bg-[#F2F7F2]">
              <MaterialIcons name="event" size={20} color="#0F382C" />
              <Text className="font-montserrat-bold text-base text-[#383838]">{dateToDateOnly(dayOffDate)}</Text>
            </View>
            <View className="items-center min-h-[180px] mb-3">
              <DateTimePicker
                value={dayOffDate}
                mode="date"
                display="spinner"
                textColor="#383838"
                themeVariant="light"
                style={{ width: '100%', height: 180 }}
                onChange={(_, selectedDate) => {
                  if (selectedDate) setDayOffDate(selectedDate);
                }}
              />
            </View>

            <Text className="font-montserrat-semibold text-xs text-gray-500 mt-2 mb-2">Lý do nghỉ:</Text>
            <TextInput
              className="border border-gray-200 rounded-lg h-13 px-3.5 font-montserrat text-base text-[#383838] mb-4"
              placeholder="Nhập lý do xin nghỉ..."
              placeholderTextColor="#9A9A9A"
              value={dayOffReason}
              onChangeText={setDayOffReason}
            />

            <Pressable
              className={`h-12 rounded-lg bg-[#0F382C] items-center justify-center ${addDayOffMutation.isPending ? 'bg-[#EAE5E3]' : ''}`}
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
                <Text className="text-white font-montserrat-bold text-sm">Xác nhận ngày nghỉ</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal Edit Weekly Schedule */}
      <Modal visible={!!editingScheduleSlot} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-5">
          <Pressable className="absolute inset-0" onPress={Keyboard.dismiss} />
          <View className="w-full max-w-[420px] bg-white rounded-2xl p-5">
            <View className="flex-row justify-between items-center border-b border-[#f5f3f2] pb-3 mb-4">
              <Text className="font-montserrat-bold text-base text-[#383838]">Cập nhật giờ làm việc</Text>
              <Pressable onPress={closeScheduleEditor}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>

            <View className="flex-row gap-2.5 mb-3.5">
              <Pressable
                className={`flex-1 min-h-[68px] border border-gray-200 rounded-lg px-3 py-2.5 justify-center bg-white ${schedulePickerTarget === 'start' ? 'border-[#0F382C] bg-[#F2F7F2]' : ''}`}
                onPress={() => setSchedulePickerTarget('start')}>
                <Text className="font-montserrat-semibold text-[11px] text-gray-500">Bắt đầu</Text>
                <Text
                  className={`font-montserrat-bold text-lg text-[#383838] mt-1 ${schedulePickerTarget === 'start' ? 'text-[#0F382C]' : ''}`}>
                  {dateToTimeString(scheduleStartTime)}
                </Text>
              </Pressable>
              <Pressable
                className={`flex-1 min-h-[68px] border border-gray-200 rounded-lg px-3 py-2.5 justify-center bg-white ${schedulePickerTarget === 'end' ? 'border-[#0F382C] bg-[#F2F7F2]' : ''}`}
                onPress={() => setSchedulePickerTarget('end')}>
                <Text className="font-montserrat-semibold text-[11px] text-gray-500">Kết thúc</Text>
                <Text
                  className={`font-montserrat-bold text-lg text-[#383838] mt-1 ${schedulePickerTarget === 'end' ? 'text-[#0F382C]' : ''}`}>
                  {dateToTimeString(scheduleEndTime)}
                </Text>
              </Pressable>
            </View>

            <View className="items-center min-h-[190px] mb-4">
              <DateTimePicker
                value={schedulePickerTarget === 'start' ? scheduleStartTime : scheduleEndTime}
                mode="time"
                display="spinner"
                minuteInterval={5}
                textColor="#383838"
                themeVariant="light"
                style={{ width: '100%', height: 190 }}
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
              className={`h-12 rounded-lg bg-[#0F382C] items-center justify-center ${updateWeeklyScheduleMutation.isPending ? 'bg-[#EAE5E3]' : ''}`}
              onPress={submitScheduleEditor}
              disabled={updateWeeklyScheduleMutation.isPending}>
              {updateWeeklyScheduleMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-white font-montserrat-bold text-sm">Lưu giờ làm việc</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {activePreviewImage ? (
        <Modal visible={activePreviewImage !== null} transparent animationType="fade">
          <Pressable
            className="absolute inset-0 bg-black/90 justify-center items-center z-50"
            onPress={() => setActivePreviewImage(null)}>
            <Image
              source={{ uri: activePreviewImage }}
              className="w-[90%] h-[80%]"
              resizeMode="contain"
            />
            <Pressable
              className="absolute top-11 right-5 w-11 h-11 rounded-full bg-white/25 justify-center items-center z-10"
              onPress={() => setActivePreviewImage(null)}>
              <MaterialIcons name="close" size={24} color="#ffffff" />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {/* Profile Date Picker Modal (iOS) */}
      {activeProfileDatePicker !== null && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={true}>
          <View className="flex-1 bg-black/50 justify-end">
            <Pressable
              className="absolute inset-0"
              onPress={() => setActiveProfileDatePicker(null)}
            />
            <View
              className="bg-white rounded-t-3xl px-4 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
              <View className="flex-row items-center justify-between py-3 border-b border-gray-200">
                <Pressable
                  onPress={() => setActiveProfileDatePicker(null)}
                  className="px-2 py-1">
                  <Text className="font-montserrat-semibold text-sm text-[#818A91]">Hủy</Text>
                </Pressable>
                <Text className="font-montserrat-bold text-base text-[#1b1c1c]">
                  {activeProfileDatePicker === 'idCard'
                    ? 'Chọn ngày cấp CCCD'
                    : 'Chọn ngày nhận chứng chỉ'}
                </Text>
                <Pressable
                  onPress={() => {
                    const formatted = formatDateToYMD(tempProfileDate);
                    if (activeProfileDatePicker === 'idCard') {
                      setIdIssueDate(formatted);
                    } else if (activeProfileDatePicker === 'newCert') {
                      setNewCertIssuedAt(formatted);
                    }
                    setActiveProfileDatePicker(null);
                  }}
                  className="px-2 py-1">
                  <Text className="font-montserrat-bold text-sm text-[#0F382C]">Xong</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={tempProfileDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                textColor="#1b1c1c"
                themeVariant="light"
                locale="vi-VN"
                onChange={(_, date) => {
                  if (date) setTempProfileDate(date);
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Profile Date Picker (Android) */}
      {activeProfileDatePicker !== null && Platform.OS === 'android' && (
        <DateTimePicker
          value={tempProfileDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(event, selectedDate) => {
            if (event.type !== 'dismissed' && selectedDate) {
              const formatted = formatDateToYMD(selectedDate);
              if (activeProfileDatePicker === 'idCard') {
                setIdIssueDate(formatted);
              } else if (activeProfileDatePicker === 'newCert') {
                setNewCertIssuedAt(formatted);
              }
            }
            setActiveProfileDatePicker(null);
          }}
        />
      )}

      {/* Face Capture Modal (eKYC) */}
      <FaceCaptureModal
        visible={idFaceCaptureModalOpen}
        onClose={() => setIdFaceCaptureModalOpen(false)}
        onCapture={handleIdFaceCaptured}
      />

      {/* Fullscreen Comparing Face Loading Overlay */}
      {isComparingIdFace && (
        <Modal visible transparent animationType="fade">
          <View className="flex-1 bg-black/75 justify-center items-center px-7">
            <View className="w-full max-w-xs bg-slate-800 rounded-3xl p-6 items-center gap-3 border border-white/10 shadow-2xl">
              <ActivityIndicator size="large" color="#4ADE80" />
              <Text className="font-montserrat-bold text-base text-white text-center">
                Đang đối soát khuôn mặt...
              </Text>
              <Text className="font-montserrat text-xs text-slate-400 text-center leading-relaxed">
                Hệ thống đang so khớp ảnh chân dung với CCCD. Vui lòng chờ trong giây lát.
              </Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
