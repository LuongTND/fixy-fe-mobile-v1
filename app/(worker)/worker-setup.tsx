import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getApiErrorMessage } from '@/services/api/client';
import { fetchCategories } from '@/services/api/categories';
import { recognizeIdentityImage } from '@/services/api/fpt';
import { prepareUploadFile } from '@/services/api/media';
import { vietnamProvincesApi, matchAddressOption, cleanSearchText } from '@/services/api/provinces';
import {
  registerWorkerProfile,
  getWorkerProfileMe,
  WorkerProfile,
  updateWorkerProfile,
  updateIdentificationImages,
  updateCertificates,
} from '@/services/api/workers';
import { updateUserProfile } from '@/services/api/user';
import { useAuthStore } from '@/store/store';
import { formatCurrency, formatToIsoDateTime } from '@/utils/format';

type PickerType = 'province' | 'ward';
type AddressPickerOption = { name: string; code?: number };

interface CertificateItem {
  title: string;
  issuedBy: string;
  issuedAt: string;
  uri?: string;
}

export default function WorkerSetupScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);
  const target = useAuthStore((state) => state.target);

  // Queries
  const {
    data: profile = null,
    isLoading: isLoadingProfile,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['workerProfileMe'],
    queryFn: getWorkerProfileMe,
    retry: false,
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const { data: provinces = [] } = useQuery<any[]>({
    queryKey: ['provincesList'],
    queryFn: vietnamProvincesApi.getProvinces,
  });

  // Step state
  const [currentStep, setCurrentStep] = React.useState<number>(1);
  const [isEditMode, setIsEditMode] = React.useState<boolean>(false);

  // STEP 1: Basic Info & Services
  const [fullName, setFullName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [experienceYears, setExperienceYears] = React.useState('3');
  const [selectedServices, setSelectedServices] = React.useState<
    Record<string, { categoryId: string; basePrice: number }>
  >({});

  // STEP 2: Credentials Verification
  const [citizenIdNumber, setCitizenIdNumber] = React.useState('');
  const [citizenIdIssueDate, setCitizenIdIssueDate] = React.useState('');
  const [citizenIdIssuePlace, setCitizenIdIssuePlace] = React.useState('');
  const [cccdUris, setCccdUris] = React.useState<string[]>([]);
  const [scanningCccd, setScanningCccd] = React.useState(false);
  const [activePreviewImage, setActivePreviewImage] = React.useState<string | null>(null);

  // Certificates list
  const [certificates, setCertificates] = React.useState<CertificateItem[]>([]);
  const [certTitle, setCertTitle] = React.useState('');
  const [certIssuedBy, setCertIssuedBy] = React.useState('');
  const [certUri, setCertUri] = React.useState<string | null>(null);

  // STEP 3: Address & Portfolio
  const [addrDetail, setAddrDetail] = React.useState('');
  const [addrCity, setAddrCity] = React.useState('');
  const [addrWard, setAddrWard] = React.useState('');
  const [selectedProvinceCode, setSelectedProvinceCode] = React.useState<number | null>(null);
  const [latitude, setLatitude] = React.useState<number>(16.0749);
  const [longitude, setLongitude] = React.useState<number>(108.2291);
  const [maxDistanceKm, setMaxDistanceKm] = React.useState<number>(15);
  const [portfolioUris, setPortfolioUris] = React.useState<string[]>([]);

  // Picker modal states
  const [optionPickerOpen, setOptionPickerOpen] = React.useState(false);
  const [pickerType, setPickerType] = React.useState<PickerType>('province');
  const [pickerSearchQuery, setPickerSearchQuery] = React.useState('');

  // Date picker states
  const [showDatePicker, setShowDatePicker] = React.useState(false);



  // Load previous profile fields if Rejected (edit mode)
  const handleEditProfile = () => {
    if (profile) {
      setFullName(profile.fullName || '');
      setPhone(profile.phone || '');
      setBio(profile.bio || '');
      setExperienceYears(profile.experienceYears !== undefined ? String(profile.experienceYears) : '3');
      setCitizenIdNumber(profile.citizenIdNumber || '');
      setCitizenIdIssueDate(profile.citizenIdIssueDate ? profile.citizenIdIssueDate.split('T')[0] : '');
      setCitizenIdIssuePlace(profile.citizenIdIssuePlace || '');
      setCccdUris(profile.identificationImages?.map((img: any) => img.url) || []);
      setCertificates(
        (profile.certificates || []).map((c: any) => ({
          title: c.title,
          issuedBy: c.issuedBy,
          issuedAt: c.issuedAt ? c.issuedAt.split('T')[0] : '',
          uri: c.imageUrl || c.url || undefined,
        }))
      );
      if (profile.address) {
        setAddrDetail(profile.address.detail || '');
        setAddrCity(profile.address.city || '');
        setAddrWard(profile.address.ward || '');
        setLatitude(profile.address.lat ?? 16.0749);
        setLongitude(profile.address.lng ?? 108.2291);
      }
      if (profile.portfolioImages) {
        setPortfolioUris(profile.portfolioImages.map((img: any) => img.url) || []);
      }
      if (profile.services) {
        const serviceMap: Record<string, { categoryId: string; basePrice: number }> = {};
        profile.services.forEach((s: any) => {
          serviceMap[s.categoryId] = { categoryId: s.categoryId, basePrice: s.basePrice };
        });
        setSelectedServices(serviceMap);
      }
      setIsEditMode(true);
      setCurrentStep(1);
    }
  };

  const params = useLocalSearchParams();
  const shouldEdit = params.edit === 'true';

  // Synchronize profile status and params with setup wizard steps
  React.useEffect(() => {
    if (!profile) return;

    // If profile is approved (status = 1), worker should not be on setup page, redirect to home
    if (profile.status === 1) {
      router.replace('/(worker)/worker-home' as any);
      return;
    }

    // If profile is rejected (status = 2), automatically go to editing mode (Step 1)
    if (profile.status === 2) {
      if (!isEditMode) {
        handleEditProfile();
      }
    } else {
      // For status 0 (Pending) or 3 (Suspended)
      if (!isEditMode && !shouldEdit) {
        setCurrentStep(4);
      }
    }
  }, [profile, isEditMode, shouldEdit]);

  // Get current device coordinates automatically
  React.useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setLatitude(loc.coords.latitude);
          setLongitude(loc.coords.longitude);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Fetch Wards Query
  const { data: wards = [] } = useQuery<any[]>({
    queryKey: ['wardsList', selectedProvinceCode],
    queryFn: () => {
      if (!selectedProvinceCode) return [];
      return vietnamProvincesApi.getWardsForProvince(selectedProvinceCode);
    },
    enabled: !!selectedProvinceCode,
  });

  // Match initial province text to code
  React.useEffect(() => {
    if (provinces.length > 0 && addrCity) {
      const match = matchAddressOption(provinces, addrCity, 'city');
      if (match) setSelectedProvinceCode(match.code);
    } else if (!addrCity) {
      setSelectedProvinceCode(null);
    }
  }, [provinces, addrCity]);

  // Picker selection list
  const currentPickerList = React.useMemo(() => {
    return pickerType === 'province' ? provinces : wards;
  }, [pickerType, provinces, wards]);

  const filteredPickerList = React.useMemo(() => {
    const keyword = cleanSearchText(pickerSearchQuery);
    return keyword
      ? currentPickerList.filter((item) => {
          const cleanName = cleanSearchText(item.name);
          if (cleanName.includes(keyword)) return true;
          if (cleanName.includes('ho chi minh') && ['hcm', 'sai gon', 'tphcm'].includes(keyword))
            return true;
          if (cleanName.includes('ha no') && keyword === 'hn') return true;
          if (cleanName.includes('da nang') && keyword === 'dn') return true;
          return false;
        })
      : currentPickerList;
  }, [pickerSearchQuery, currentPickerList]);

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

  // File pickers
  const handleSelectCccdSource = () => {
    handlePickCccd();
  };

  const handleCameraCccd = async () => {
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
      setCccdUris((prev) => {
        const next = [...prev, newUri];
        handleScanCccdSlot(newUri);
        return next;
      });
    }
  };

  const handlePickCccd = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Vui lòng cho phép quyền truy cập thư viện ảnh để chọn CCCD.');
      return;
    }
    const remainingLimit = 2 - cccdUris.length;
    if (remainingLimit <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: remainingLimit > 1,
      selectionLimit: remainingLimit,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((a) => a.uri);
      setCccdUris((prev) => {
        const next = [...prev, ...newUris].slice(0, 2);
        handleScanCccdSlot(newUris[0]);
        return next;
      });
    }
  };

  const handleScanCccdSlot = async (uri: string) => {
    setScanningCccd(true);
    try {
      const res = await recognizeIdentityImage(uri);
      if (res.citizenIdNumber) setCitizenIdNumber(res.citizenIdNumber);
      if (res.issueDate) setCitizenIdIssueDate(res.issueDate);
      if (res.issuePlace) setCitizenIdIssuePlace(res.issuePlace);
      Alert.alert('Nhận diện hoàn tất', 'Thông tin CCCD đã được tự động điền.');
    } catch (err) {
      console.warn('Scan slot failed:', err);
    } finally {
      setScanningCccd(false);
    }
  };

  const handleScanAllCccd = async () => {
    const activeUris = cccdUris.filter(Boolean) as string[];
    if (activeUris.length === 0) return;
    setScanningCccd(true);
    try {
      let mergedRes: any = {};
      for (const uri of activeUris) {
        try {
          const res = await recognizeIdentityImage(uri);
          mergedRes = {
            citizenIdNumber: mergedRes.citizenIdNumber || res.citizenIdNumber,
            issueDate: mergedRes.issueDate || res.issueDate,
            issuePlace: mergedRes.issuePlace || res.issuePlace,
          };
        } catch {
          // ignore individual scan errors
        }
      }
      if (mergedRes.citizenIdNumber) setCitizenIdNumber(mergedRes.citizenIdNumber);
      if (mergedRes.issueDate) setCitizenIdIssueDate(mergedRes.issueDate);
      if (mergedRes.issuePlace) setCitizenIdIssuePlace(mergedRes.issuePlace);
      Alert.alert('Nhận diện hoàn tất', 'Thông tin CCCD đã được tự động điền.');
    } catch (err) {
      Alert.alert('Quét CCCD thất bại', 'Không thể nhận diện tự động. Vui lòng nhập thủ công.');
    } finally {
      setScanningCccd(false);
    }
  };

  const handlePickCertImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Vui lòng cho phép quyền truy cập thư viện ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setCertUri(result.assets[0].uri);
    }
  };

  const handleAddCertificate = () => {
    if (!certTitle || !certIssuedBy) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền tên chứng chỉ và nơi cấp.');
      return;
    }
    const newItem: CertificateItem = {
      title: certTitle,
      issuedBy: certIssuedBy,
      issuedAt: new Date().toISOString().split('T')[0],
      uri: certUri || undefined,
    };
    setCertificates([...certificates, newItem]);
    setCertTitle('');
    setCertIssuedBy('');
    setCertUri(null);
  };

  const handlePickPortfolio = async () => {
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
      setPortfolioUris([...portfolioUris, ...result.assets.map((a) => a.uri)]);
    }
  };

  const handleRemovePortfolio = (index: number) => {
    setPortfolioUris(portfolioUris.filter((_, i) => i !== index));
  };

  const handleToggleService = (catId: string) => {
    const next = { ...selectedServices };
    if (next[catId]) {
      delete next[catId];
    } else {
      next[catId] = { categoryId: catId, basePrice: 150000 };
    }
    setSelectedServices(next);
  };

  const handleServicePriceChange = (catId: string, priceText: string) => {
    const priceNum = parseInt(priceText.replace(/\D/g, ''), 10) || 0;
    setSelectedServices({
      ...selectedServices,
      [catId]: { ...selectedServices[catId], basePrice: priceNum },
    });
  };

  // Submission Mutation
  const registerMutation = useMutation({
    mutationFn: registerWorkerProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workerProfileMe'] });
      setIsEditMode(false);
      Alert.alert('Thành công', 'Hồ sơ đã được gửi đi để phê duyệt.', [
        { text: 'OK', onPress: () => router.replace('/(worker)/worker-home' as any) },
      ]);
    },
    onError: (err) => {
      Alert.alert('Lỗi đăng ký', getApiErrorMessage(err));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      userPayload?: { fullName: string; phone: string };
      workerPayload: any;
      cccdPayload?: any;
      certificatesPayload?: any;
    }) => {
      if (payload.userPayload) {
        await updateUserProfile(payload.userPayload);
      }
      await updateWorkerProfile(payload.workerPayload);
      if (payload.cccdPayload) {
        await updateIdentificationImages(payload.cccdPayload);
      }
      if (payload.certificatesPayload) {
        await updateCertificates(payload.certificatesPayload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workerProfileMe'] });
      setIsEditMode(false);
      router.setParams({ edit: 'false' });
      Alert.alert('Thành công', 'Hồ sơ đã được cập nhật và gửi phê duyệt lại.', [
        { text: 'OK', onPress: () => router.replace('/(worker)/worker-home' as any) },
      ]);
    },
    onError: (err) => {
      Alert.alert('Lỗi cập nhật', getApiErrorMessage(err));
    },
  });

  const handleSubmit = async () => {
    // Validations
    if (!addrCity || !addrWard || !addrDetail) {
      Alert.alert('Thiếu thông tin', 'Vui lòng cung cấp đầy đủ thông tin địa chỉ hoạt động.');
      return;
    }

    const servicesList = Object.values(selectedServices);
    if (servicesList.length === 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn ít nhất 1 dịch vụ chuyên môn của bạn.');
      return;
    }

    if (isEditMode) {
      try {
        const userPayload = {
          fullName,
          phone,
        };

        const workerPayload: any = {
          phone,
          bio,
          experienceYears: Number(experienceYears) || 0,
          maxDistanceKm: Number(maxDistanceKm) || 0,
          address: {
            label: 'Địa chỉ làm việc',
            city: addrCity,
            ward: addrWard,
            detail: addrDetail,
            lat: latitude,
            lng: longitude,
            isDefault: true,
          },
          services: servicesList.map((s) => ({
            categoryId: s.categoryId,
            basePrice: Number(s.basePrice) || 0,
            isPrimary: s.categoryId === servicesList[0].categoryId,
          })),
        };

        const cccdPayload = {
          workerProfileId: profile?.workerProfileId || profile?.id || '',
          citizenIdNumber,
          citizenIdIssueDate,
          citizenIdIssuePlace,
          localUris: cccdUris,
        };

        const certificatesPayload = {
          workerProfileId: profile?.workerProfileId || profile?.id || '',
          dtos: certificates.map((c) => ({
            title: c.title,
            issuedBy: c.issuedBy,
            issuedAt: formatToIsoDateTime(c.issuedAt),
            localUris: c.uri ? [c.uri] : [],
          })),
        };

        updateMutation.mutate({
          userPayload,
          workerPayload,
          cccdPayload,
          certificatesPayload,
        });
      } catch (err: any) {
        Alert.alert('Lỗi', err.message || 'Không thể cập nhật hồ sơ.');
      }
      return;
    }

    const formData = new FormData();
    formData.append('Target', target || '');
    formData.append('Bio', bio);
    formData.append('ExperienceYears', experienceYears);
    formData.append('MaxDistanceKm', String(maxDistanceKm));
    formData.append('CitizenIdNumber', citizenIdNumber);
    formData.append('CitizenIdIssueDate', formatToIsoDateTime(citizenIdIssueDate));
    formData.append('CitizenIdIssuePlace', citizenIdIssuePlace);

    // Address
    formData.append('CreateAddressRequestDto.Label', 'Địa chỉ làm việc');
    formData.append('CreateAddressRequestDto.City', addrCity);
    formData.append('CreateAddressRequestDto.Ward', addrWard);
    formData.append('CreateAddressRequestDto.Detail', addrDetail);
    formData.append('CreateAddressRequestDto.Lat', String(latitude));
    formData.append('CreateAddressRequestDto.Lng', String(longitude));
    formData.append('CreateAddressRequestDto.IsDefault', 'true');

    // Services
    servicesList.forEach((s, idx) => {
      formData.append(`WorkerService[${idx}].CategoryId`, s.categoryId);
      formData.append(`WorkerService[${idx}].BasePrice`, String(s.basePrice));
      formData.append(`WorkerService[${idx}].IsPrimary`, idx === 0 ? 'true' : 'false');
    });

    // Identification images
    const cccdFiles = await Promise.all(
      cccdUris.map((uri, idx) =>
        prepareUploadFile(uri, `cccd_${idx}.jpg`, { compress: true, resizeWidth: 1600, quality: 0.7 })
      )
    );
    cccdFiles.forEach((fileObj) => {
      if (fileObj) {
        formData.append('IdentificationUploads', fileObj);
      }
    });

    // Portfolio uploads
    const portfolioFiles = await Promise.all(
      portfolioUris.map((uri, idx) => prepareUploadFile(uri, `portfolio_${idx}.jpg`))
    );
    portfolioFiles.forEach((fileObj) => {
      if (fileObj) {
        formData.append('PortfolioUploads', fileObj);
      }
    });

    // Certificates
    for (let idx = 0; idx < certificates.length; idx++) {
      const c = certificates[idx];
      formData.append(`CertificateUploads[${idx}].Title`, c.title);
      formData.append(`CertificateUploads[${idx}].IssuedBy`, c.issuedBy);
      formData.append(`CertificateUploads[${idx}].IssuedAt`, formatToIsoDateTime(c.issuedAt));
      if (c.uri) {
        const fileObj = await prepareUploadFile(c.uri, `cert_${idx}.jpg`);
        if (fileObj) {
          formData.append(`CertificateUploads[${idx}].MediaUploads`, fileObj);
        }
      }
    }

    registerMutation.mutate(formData);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as any);
  };

  if (isLoadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F382C" />
        <Text style={styles.loadingText}>Đang tải cấu hình thiết lập...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable 
          style={styles.headerBackBtn} 
          onPress={() => router.replace('/(worker)/worker-home' as any)}>
          <MaterialIcons name="arrow-back" size={24} color="#383838" />
        </Pressable>
        <Text style={styles.headerTitle}>Thiết lập hồ sơ thợ</Text>
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#ba1a1a" />
        </Pressable>
      </View>

      {/* Progress Wizard */}
      {currentStep < 4 && (
        <View style={styles.wizardContainer}>
          {[1, 2, 3].map((step) => (
            <View key={step} style={styles.wizardStepRow}>
              <View style={[styles.wizardDot, currentStep >= step && styles.wizardDotActive]}>
                {currentStep > step ? (
                  <MaterialIcons name="check" size={16} color="#ffffff" />
                ) : (
                  <Text
                    style={[
                      styles.wizardDotText,
                      currentStep >= step && styles.wizardDotTextActive,
                    ]}>
                    {step}
                  </Text>
                )}
              </View>
              {step < 3 && (
                <View style={[styles.wizardLine, currentStep > step && styles.wizardLineActive]} />
              )}
            </View>
          ))}
        </View>
      )}

      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bottomOffset={36}>
        {/* Step 1: Basic Info & Services */}
        {currentStep === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>Thông tin cá nhân & Chuyên môn</Text>

            <Text style={styles.fieldLabel}>Họ và tên hiển thị</Text>
            <TextInput
              style={styles.textInput}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nguyễn Văn An"
              placeholderTextColor="#9A9A9A"
            />

            <Text style={styles.fieldLabel}>Số điện thoại</Text>
            <TextInput
              style={styles.textInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="Số điện thoại liên hệ"
              keyboardType="phone-pad"
              placeholderTextColor="#9A9A9A"
            />

            <Text style={styles.fieldLabel}>Số năm kinh nghiệm</Text>
            <TextInput
              style={styles.textInput}
              value={experienceYears}
              onChangeText={setExperienceYears}
              placeholder="Ví dụ: 5"
              keyboardType="number-pad"
              placeholderTextColor="#9A9A9A"
            />

            <Text style={styles.fieldLabel}>Giới thiệu bản thân</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Mô tả kỹ năng, thế mạnh của bạn (tối thiểu 10 ký tự)..."
              multiline
              numberOfLines={4}
              placeholderTextColor="#9A9A9A"
            />
            <Text
              style={[
                styles.charCount,
                bio.length < 10 && bio.length > 0 && styles.charCountError,
              ]}>
              {bio.length}/10 ký tự (tối thiểu 10)
            </Text>

            <Text style={styles.sectionTitle}>Dịch vụ cung cấp</Text>
            <Text style={styles.subLabel}>Chọn các lĩnh vực sửa chữa và đặt giá sàn:</Text>

            {isLoadingCategories ? (
              <ActivityIndicator size="small" color="#0F382C" />
            ) : (
              categories.map((cat) => {
                const isSelected = !!selectedServices[cat.id];
                return (
                  <View key={cat.id} style={[styles.catCard, isSelected && styles.catCardSelected]}>
                    <Pressable
                      style={styles.catCardHeader}
                      onPress={() => handleToggleService(cat.id)}>
                      <MaterialIcons
                        name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                        size={22}
                        color={isSelected ? '#0F382C' : '#818A91'}
                      />
                      <Text style={styles.catName}>{cat.name}</Text>
                    </Pressable>

                    {isSelected && (
                      <View style={styles.priceContainer}>
                        <Text style={styles.priceLabel}>Giá cơ bản sàn (VND)</Text>
                        <TextInput
                          style={styles.priceInput}
                          value={String(selectedServices[cat.id]?.basePrice || '')}
                          onChangeText={(val) => handleServicePriceChange(cat.id, val)}
                          keyboardType="number-pad"
                          placeholder="150,000"
                          placeholderTextColor="#9A9A9A"
                        />
                      </View>
                    )}
                  </View>
                );
              })
            )}

            <Pressable
              style={styles.nextBtn}
              onPress={() => {
                if (!fullName) {
                  Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên hiển thị.');
                  return;
                }
                if (!phone) {
                  Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại.');
                  return;
                }
                if (!experienceYears) {
                  Alert.alert('Thiếu thông tin', 'Vui lòng nhập số năm kinh nghiệm.');
                  return;
                }
                if (bio.length < 10) {
                  Alert.alert(
                    'Giới thiệu quá ngắn',
                    'Vui lòng giới thiệu bản thân chi tiết hơn (tối thiểu 10 ký tự).'
                  );
                  return;
                }
                if (Object.keys(selectedServices).length === 0) {
                  Alert.alert('Thiếu thông tin', 'Vui lòng chọn ít nhất một dịch vụ chuyên môn.');
                  return;
                }
                setCurrentStep(2);
              }}>
              <Text style={styles.nextBtnText}>Tiếp tục: Xác minh CCCD</Text>
            </Pressable>
          </View>
        )}

        {/* Step 2: CCCD & Certificates */}
        {currentStep === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>Xác minh định danh CCCD</Text>
            <Text style={styles.subLabel}>
              Tải ảnh mặt trước/mặt sau của Citizen Identity Card để duyệt xác thực:
            </Text>

            <View style={styles.cccdUploadBoxRow}>
              {cccdUris.map((uri, idx) => (
                <View key={uri} style={styles.cccdSlotPreviewWrapper}>
                  <Pressable
                    style={{ width: '100%', height: '100%' }}
                    onPress={() => setActivePreviewImage(uri)}>
                    <Image source={{ uri }} style={styles.cccdSlotPreview} />
                  </Pressable>
                  <Pressable
                    style={styles.cccdSlotDeleteBtn}
                    onPress={() => setCccdUris((prev) => prev.filter((_, i) => i !== idx))}>
                    <MaterialIcons name="cancel" size={20} color="#BA1A1A" />
                  </Pressable>
                </View>
              ))}

              {cccdUris.length < 2 && (
                <Pressable
                  style={cccdUris.length === 0 ? styles.cccdSlotUploadBtnFull : styles.cccdSlotUploadBtn}
                  onPress={handleSelectCccdSource}>
                  <MaterialIcons name="add-a-photo" size={cccdUris.length === 0 ? 32 : 24} color="#0F382C" />
                  <Text style={cccdUris.length === 0 ? styles.cccdSlotUploadTextFull : styles.cccdSlotUploadText}>
                    {cccdUris.length === 0 ? 'Tải ảnh CCCD (Mặt trước & Mặt sau)' : 'Tải ảnh mặt thứ hai'}
                  </Text>
                </Pressable>
              )}
            </View>

            {cccdUris.length > 0 && (
              <Pressable
                style={[styles.scanBtn, scanningCccd && styles.scanBtnDisabled]}
                onPress={() => handleScanAllCccd()}
                disabled={scanningCccd}>
                {scanningCccd ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="document-scanner" size={18} color="#ffffff" />
                    <Text style={styles.scanBtnText}>Quét tự động với AI OCR</Text>
                  </>
                )}
              </Pressable>
            )}

            <Text style={styles.fieldLabel}>Số căn cước công dân (CCCD)</Text>
            <TextInput
              style={styles.textInput}
              value={citizenIdNumber}
              onChangeText={setCitizenIdNumber}
              placeholder="Nhập số CCCD"
              keyboardType="number-pad"
              placeholderTextColor="#9A9A9A"
            />

            <Text style={styles.fieldLabel}>Ngày cấp (yyyy-MM-dd)</Text>
            <TextInput
              style={styles.textInput}
              value={citizenIdIssueDate}
              onChangeText={setCitizenIdIssueDate}
              placeholder="Ví dụ: 2020-05-19"
              placeholderTextColor="#9A9A9A"
            />

            <Text style={styles.fieldLabel}>Nơi cấp</Text>
            <TextInput
              style={styles.textInput}
              value={citizenIdIssuePlace}
              onChangeText={setCitizenIdIssuePlace}
              placeholder="Ví dụ: Cục Cảnh sát QLHC về trật tự xã hội"
              placeholderTextColor="#9A9A9A"
            />

            <Text style={styles.sectionTitle}>Chứng chỉ hành nghề (Nếu có)</Text>
            <View style={styles.certForm}>
              <TextInput
                style={styles.textInput}
                value={certTitle}
                onChangeText={setCertTitle}
                placeholder="Tên chứng chỉ (ví dụ: Kỹ thuật điện dân dụng)"
                placeholderTextColor="#9A9A9A"
              />
              <TextInput
                style={styles.textInput}
                value={certIssuedBy}
                onChangeText={setCertIssuedBy}
                placeholder="Nơi cấp chứng chỉ"
                placeholderTextColor="#9A9A9A"
              />
              {certUri ? (
                <View style={styles.cccdImagesPreviewRow}>
                  <Pressable onPress={() => setActivePreviewImage(certUri)}>
                    <Image source={{ uri: certUri }} style={styles.cccdPreviewImg} />
                  </Pressable>
                  <Pressable
                    style={[styles.certPhotoBtn, { flex: 1, marginVertical: 0 }]}
                    onPress={() => setCertUri(null)}>
                    <MaterialIcons name="delete" size={18} color="#BA1A1A" />
                    <Text style={[styles.certPhotoBtnText, { color: '#BA1A1A' }]}>
                      Xóa ảnh chứng chỉ
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.certPhotoBtn} onPress={handlePickCertImage}>
                  <MaterialIcons name="add-a-photo" size={18} color="#0F382C" />
                  <Text style={styles.certPhotoBtnText}>Tải ảnh chứng chỉ đính kèm</Text>
                </Pressable>
              )}
              <Pressable style={styles.addCertBtn} onPress={handleAddCertificate}>
                <Text style={styles.addCertBtnText}>+ Thêm chứng chỉ</Text>
              </Pressable>
            </View>

            {certificates.length > 0 && (
              <View style={styles.certList}>
                {certificates.map((c, idx) => (
                  <View key={idx} style={styles.certItem}>
                    {c.uri ? (
                      <Pressable onPress={() => setActivePreviewImage(c.uri!)}>
                        <Image source={{ uri: c.uri }} style={styles.certThumbnail} />
                      </Pressable>
                    ) : (
                      <MaterialIcons name="workspace-premium" size={20} color="#0F382C" />
                    )}
                    <View style={styles.certInfo}>
                      <Text style={styles.certTitleText}>{c.title}</Text>
                      <Text style={styles.certSubText}>Cấp bởi: {c.issuedBy}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.wizardNavRow}>
              <Pressable style={styles.backBtn} onPress={() => setCurrentStep(1)}>
                <Text style={styles.backBtnText}>Quay lại</Text>
              </Pressable>
              <Pressable
                style={styles.nextBtnHalf}
                onPress={() => {
                  if (!citizenIdNumber || !citizenIdIssueDate || !citizenIdIssuePlace) {
                    Alert.alert(
                      'Thiếu thông tin',
                      'Vui lòng cung cấp đầy đủ thông tin CCCD định danh.'
                    );
                    return;
                  }
                  if (cccdUris.length < 2) {
                    Alert.alert(
                      'Cảnh báo',
                      'Nên cung cấp đủ 2 ảnh mặt trước và sau của CCCD để tránh bị từ chối duyệt.'
                    );
                  }
                  setCurrentStep(3);
                }}>
                <Text style={styles.nextBtnText}>Tiếp tục</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Step 3: Area & Portfolio */}
        {currentStep === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>Khu vực hoạt động & Địa chỉ</Text>

            <Text style={styles.fieldLabel}>Tỉnh / Thành phố hoạt động</Text>
            <Pressable
              style={styles.selectBtn}
              onPress={() => {
                setPickerType('province');
                setPickerSearchQuery('');
                setOptionPickerOpen(true);
              }}>
              <Text style={styles.selectBtnText}>{addrCity || 'Chọn Tỉnh / Thành phố'}</Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#574237" />
            </Pressable>

            <Text style={styles.fieldLabel}>Phường / Xã hoạt động</Text>
            <Pressable
              style={[styles.selectBtn, !selectedProvinceCode && styles.selectBtnDisabled]}
              disabled={!selectedProvinceCode}
              onPress={() => {
                setPickerType('ward');
                setPickerSearchQuery('');
                setOptionPickerOpen(true);
              }}>
              <Text style={styles.selectBtnText}>{addrWard || 'Chọn Phường / Xã'}</Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#574237" />
            </Pressable>

            <Text style={styles.fieldLabel}>Địa chỉ chi tiết (Số nhà, đường...)</Text>
            <TextInput
              style={styles.textInput}
              value={addrDetail}
              onChangeText={setAddrDetail}
              placeholder="Ví dụ: 36 Nguyễn Hữu Thọ"
              placeholderTextColor="#9A9A9A"
            />

            <Text style={styles.fieldLabel}>Bán kính di chuyển tối đa: {maxDistanceKm} km</Text>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={10}
              maximumValue={50}
              step={1}
              value={maxDistanceKm}
              onValueChange={setMaxDistanceKm}
              minimumTrackTintColor="#0F382C"
              maximumTrackTintColor="#DDDDDD"
              thumbTintColor="#0F382C"
            />

            <Text style={styles.sectionTitle}>Hình ảnh hoạt động thực tế (Portfolio)</Text>
            <Text style={styles.subLabel}>
              Tải ảnh các công trình đã sửa chữa của bạn để tăng độ tin cậy:
            </Text>

            <View style={styles.cccdUploadBox}>
              <Pressable style={styles.uploadBtn} onPress={handlePickPortfolio}>
                <MaterialIcons name="add-photo-alternate" size={32} color="#0F382C" />
                <Text style={styles.uploadText}>Chọn ảnh thực tế</Text>
              </Pressable>

              {portfolioUris.length > 0 && (
                <View style={styles.portfolioGrid}>
                  {portfolioUris.map((uri, idx) => (
                    <View key={idx} style={styles.portfolioPreviewContainer}>
                      <Image source={{ uri }} style={styles.portfolioPreview} />
                      <Pressable
                        style={styles.removePhotoOverlay}
                        onPress={() => handleRemovePortfolio(idx)}>
                        <MaterialIcons name="close" size={16} color="#ffffff" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.wizardNavRow}>
              <Pressable style={styles.backBtn} onPress={() => setCurrentStep(2)}>
                <Text style={styles.backBtnText}>Quay lại</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.nextBtnHalf,
                  (registerMutation.isPending || updateMutation.isPending) && styles.nextBtnDisabled,
                ]}
                disabled={registerMutation.isPending || updateMutation.isPending}
                onPress={handleSubmit}>
                {registerMutation.isPending || updateMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.nextBtnText}>
                    {isEditMode ? 'Cập nhật hồ sơ' : 'Gửi hồ sơ duyệt'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Step 4: Approval Status */}
        {currentStep === 4 && (
          <View style={styles.statusBoxContainer}>
            {profile?.status === 0 && (
              <View style={styles.statusBox}>
                <View style={[styles.statusIconCircle, { backgroundColor: '#F2F7F2' }]}>
                  <MaterialIcons name="hourglass-empty" size={48} color="#0F382C" />
                </View>
                <Text style={styles.statusTitle}>Hồ sơ đang chờ duyệt</Text>
                <Text style={styles.statusDesc}>
                  Đội ngũ quản trị viên Fixy Spa đang kiểm tra và đối chiếu tài liệu CCCD/Chứng chỉ của
                  bạn. Quá trình này sẽ hoàn tất trong vòng 24 - 48 giờ.
                </Text>
                <Pressable
                  style={styles.refreshBtn}
                  onPress={async () => {
                    const res = await refetchProfile();
                    if (res.data?.status === 1) {
                      router.replace('/(worker)/worker-home' as any);
                    } else {
                      Alert.alert('Trạng thái', 'Hồ sơ vẫn đang trong quá trình kiểm duyệt.');
                    }
                  }}>
                  <Text style={styles.refreshBtnText}>Làm mới trạng thái</Text>
                </Pressable>
              </View>
            )}

            {profile?.status === 3 && (
              <View style={styles.statusBox}>
                <View style={[styles.statusIconCircle, { backgroundColor: '#FEE2E2' }]}>
                  <MaterialIcons name="lock" size={48} color="#BA1A1A" />
                </View>
                <Text style={styles.statusTitle}>Tài khoản tạm khóa</Text>
                <Text style={styles.statusDesc}>
                  Hồ sơ đối tác thợ của bạn hiện đang ở trạng thái bị tạm ngưng hoạt động. Vui lòng
                  liên hệ hotline tổng đài hỗ trợ để được giải đáp.
                </Text>
              </View>
            )}

            {(profile?.status === 2 || !profile) && (
              <View style={styles.statusBox}>
                <View style={[styles.statusIconCircle, { backgroundColor: '#FFF1E8' }]}>
                  <MaterialIcons name="report-problem" size={48} color="#D97706" />
                </View>
                <Text style={styles.statusTitle}>Yêu cầu bị từ chối</Text>
                <Text style={styles.statusDesc}>Hồ sơ đăng ký của bạn không được phê duyệt.</Text>
                {profile?.rejectReason && (
                  <View style={styles.rejectReasonBox}>
                    <Text style={styles.rejectReasonLabel}>Lý do từ chối:</Text>
                    <Text style={styles.rejectReasonText}>{profile.rejectReason}</Text>
                  </View>
                )}
                <Pressable style={styles.refreshBtn} onPress={handleEditProfile}>
                  <Text style={styles.refreshBtnText}>Chỉnh sửa & Nộp lại</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* Province/Ward Selection Modal */}
      <Modal visible={optionPickerOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pickerType === 'province' ? 'Chọn Tỉnh / Thành phố' : 'Chọn Phường / Xã'}
              </Text>
              <Pressable onPress={() => setOptionPickerOpen(false)}>
                <MaterialIcons name="close" size={24} color="#383838" />
              </Pressable>
            </View>

            <TextInput
              style={styles.searchBar}
              value={pickerSearchQuery}
              onChangeText={setPickerSearchQuery}
              placeholder="Tìm kiếm nhanh..."
              placeholderTextColor="#9A9A9A"
            />

            <ScrollView style={styles.optionScroll}>
              {filteredPickerList.map((item, idx) => (
                <Pressable
                  key={idx}
                  style={styles.optionRow}
                  onPress={() => handleSelectOption(item)}>
                  <Text style={styles.optionText}>{item.name}</Text>
                </Pressable>
              ))}
              {filteredPickerList.length === 0 && (
                <Text style={styles.emptyOptionText}>Không tìm thấy kết quả phù hợp</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {activePreviewImage && (
        <Modal visible={true} transparent animationType="fade">
          <Pressable style={styles.imagePreviewOverlay} onPress={() => setActivePreviewImage(null)}>
            <Image
              source={{ uri: activePreviewImage }}
              style={styles.imagePreviewFull}
              resizeMode="contain"
            />
            <Pressable
              style={styles.imagePreviewCloseBtn}
              onPress={() => setActivePreviewImage(null)}>
              <MaterialIcons name="close" size={24} color="#ffffff" />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fbf9f8',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fbf9f8',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#818A91',
  },
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
  headerBackBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#1b1c1c',
  },
  logoutBtn: {
    padding: 8,
  },
  wizardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#EEEEEE',
  },
  wizardStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wizardDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardDotActive: {
    backgroundColor: '#0F382C',
  },
  wizardDotText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#818A91',
  },
  wizardDotTextActive: {
    color: '#ffffff',
  },
  wizardLine: {
    width: 60,
    height: 3,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 8,
  },
  wizardLineActive: {
    backgroundColor: '#0F382C',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  stepContainer: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#1b1c1c',
    marginTop: 12,
  },
  fieldLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#574237',
    marginTop: 8,
  },
  charCount: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  charCountError: {
    color: '#EA4335',
    fontFamily: 'Montserrat_600SemiBold',
  },
  subLabel: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    marginTop: -4,
    marginBottom: 8,
  },
  textInput: {
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 15,
    color: '#383838',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingVertical: 12,
  },
  catCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 14,
    gap: 10,
  },
  catCardSelected: {
    borderColor: '#0F382C',
    backgroundColor: '#F2F7F2',
  },
  catCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#1b1c1c',
  },
  priceContainer: {
    borderTopWidth: 1,
    borderColor: '#C6DFC6',
    paddingTop: 10,
    gap: 6,
  },
  priceLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#574237',
  },
  priceInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0F382C',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#0F382C',
  },
  nextBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  nextBtnDisabled: {
    opacity: 0.6,
  },
  nextBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#ffffff',
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewFull: {
    width: '90%',
    height: '80%',
  },
  imagePreviewCloseBtn: {
    position: 'absolute',
    top: 44,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cccdUploadBoxRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  cccdSlotContainer: {
    flex: 1,
    gap: 6,
    alignItems: 'center',
  },
  cccdSlotLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#818A91',
  },
  cccdSlotUploadBtn: {
    flex: 1,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0F382C',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F7F2',
    gap: 6,
  },
  cccdSlotUploadBtnFull: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0F382C',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F7F2',
    gap: 6,
  },
  cccdSlotUploadText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#0F382C',
  },
  cccdSlotUploadTextFull: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#0F382C',
  },
  cccdSlotPreviewWrapper: {
    flex: 1,
    height: 100,
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  cccdSlotPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cccdSlotDeleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 2,
    zIndex: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  cccdUploadBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  uploadBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  uploadText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#0F382C',
  },
  scanBtn: {
    height: 44,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    gap: 8,
  },
  scanBtnDisabled: {
    opacity: 0.6,
  },
  scanBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#ffffff',
  },
  certForm: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 14,
    gap: 10,
  },
  certPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    width: '100%',
  },
  certPhotoBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#0F382C',
  },
  addCertBtn: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCertBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#0F382C',
  },
  certList: {
    gap: 8,
    marginTop: 8,
  },
  certItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    gap: 10,
  },
  cccdImagesPreviewRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  cccdPreviewImg: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#efedec',
  },
  certThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#efedec',
  },
  certInfo: {
    flex: 1,
  },
  certTitleText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#1b1c1c',
  },
  certSubText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    marginTop: 2,
  },
  wizardNavRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  backBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#0F382C',
  },
  nextBtnHalf: {
    flex: 1.5,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBtn: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    paddingHorizontal: 14,
  },
  selectBtnDisabled: {
    backgroundColor: '#f5f3f2',
    borderColor: '#EEEEEE',
  },
  selectBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#574237',
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
    width: '100%',
  },
  portfolioPreviewContainer: {
    position: 'relative',
    width: '30%',
    aspectRatio: 1,
  },
  portfolioPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removePhotoOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 3,
  },
  statusBoxContainer: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 24,
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  statusIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#1b1c1c',
  },
  statusDesc: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
    lineHeight: 20,
    textAlign: 'center',
  },
  refreshBtn: {
    height: 48,
    backgroundColor: '#0F382C',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  refreshBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#ffffff',
  },
  rejectReasonBox: {
    backgroundColor: '#FFF1E8',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFD3B8',
    width: '100%',
  },
  rejectReasonLabel: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#ba1a1a',
    marginBottom: 4,
  },
  rejectReasonText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#383838',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#1b1c1c',
  },
  searchBar: {
    height: 48,
    backgroundColor: '#f5f3f2',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    marginBottom: 12,
  },
  optionScroll: {
    marginBottom: 20,
  },
  optionRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#EEEEEE',
  },
  optionText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#383838',
  },
  emptyOptionText: {
    textAlign: 'center',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
    marginVertical: 20,
  },
});
