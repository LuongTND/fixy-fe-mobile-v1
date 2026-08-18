import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getApiErrorMessage } from '@/services/api/client';
import { prepareUploadFile } from '@/services/api/media';
import { getUserProfile, updateUserProfile, UserProfile } from '@/services/api/user';

enum GenderEnum {
  Male = 0,
  Female = 1,
  Other = 2,
}

export default function ProfileInfoScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: profileResponse, isLoading, refetch } = useQuery({
    queryKey: ['userProfile'],
    queryFn: getUserProfile,
  });

  const profile = profileResponse?.data ?? null;

  // Form states
  const [fullName, setFullName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [dateOfBirth, setDateOfBirth] = React.useState<Date | null>(null);
  const [gender, setGender] = React.useState<number>(GenderEnum.Male);
  const [avatarUri, setAvatarUri] = React.useState<string | null>(null);
  const [newAvatarPicked, setNewAvatarPicked] = React.useState(false);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = React.useState(false);

  // Pre-fill form when profile data changes
  React.useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setPhone(profile.phone || '');
      setEmail(profile.email || '');
      if (profile.dateOfBirth) {
        const parsedDate = new Date(profile.dateOfBirth);
        if (!isNaN(parsedDate.getTime())) {
          setDateOfBirth(parsedDate);
        }
      }
      if (profile.gender !== null && profile.gender !== undefined) {
        const gStr = String(profile.gender).toLowerCase();
        if (gStr === 'male' || gStr === '0' || gStr === 'nam') {
          setGender(GenderEnum.Male);
        } else if (gStr === 'female' || gStr === '1' || gStr === 'nữ') {
          setGender(GenderEnum.Female);
        } else {
          setGender(GenderEnum.Other);
        }
      }
      if (profile.avatarUrl) {
        setAvatarUri(profile.avatarUrl);
      }
    }
  }, [profile]);

  // Image Picker Options
  const handlePickAvatar = async () => {
    Alert.alert('Ảnh đại diện', 'Chọn phương thức cập nhật ảnh đại diện:', [
      { text: 'Chụp ảnh từ Camera', onPress: handleCameraAvatar },
      { text: 'Chọn từ Thư viện', onPress: handleLibraryAvatar },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const handleCameraAvatar = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Vui lòng cho phép quyền truy cập camera để chụp ảnh.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
      setNewAvatarPicked(true);
    }
  };

  const handleLibraryAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Vui lòng cho phép quyền truy cập thư viện ảnh.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
      setNewAvatarPicked(true);
    }
  };

  // Update Profile Mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      let avatarFileObj = null;
      if (newAvatarPicked && avatarUri) {
        avatarFileObj = await prepareUploadFile(avatarUri, `avatar_${Date.now()}.jpg`, {
          compress: true,
          resizeWidth: 800,
          quality: 0.8,
        });
      }

      const formattedDob = dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : undefined;

      return updateUserProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        dateOfBirth: formattedDob,
        gender,
        avatarFile: avatarFileObj,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['workerProfileMe'] });
      Alert.alert('Thành công', 'Thông tin cá nhân của bạn đã được cập nhật.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err) => {
      Alert.alert('Lỗi cập nhật', getApiErrorMessage(err));
    },
  });

  const handleSave = () => {
    if (!fullName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại.');
      return;
    }

    updateMutation.mutate();
  };

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return 'Chưa cập nhật';
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable style={styles.headerButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#1b1c1c" />
        </Pressable>
        <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0F382C" />
        </View>
      ) : (
        <KeyboardAwareScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          bottomOffset={24}>
          {/* Avatar Header */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <Image
                source={{
                  uri:
                    avatarUri ||
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuDopKrdEjn_YIPe8wWQUvOUP7Fg0rVJLe61nRSrAXfNowRvy_vcW1xwzyluNv_w-T1BTrTrQv9d3gFxIzlmfjybmiS8bZWbKxlqYHDKTC2SPQOOjLcvHtIdVtd-l4DkJ7HY4XyrGOQrl-a_WsMGYAQvdiNvcQ49Dz1ARPV3zT-thTZ012QOjHR9VSqie_b_W18k6NN0JhSH8SALrpDcA8xe0OI5Jxat8pY80opLG5-Ues6SaX4L53e-JIZkZdDu5L8Vb7bBrPhZ__g',
                }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
              <Pressable style={styles.avatarBadge} onPress={handlePickAvatar}>
                <MaterialIcons name="photo-camera" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
            <Text style={styles.changeAvatarText}>Chạm để đổi ảnh đại diện</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Họ và tên</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="person-outline" size={20} color="#818A91" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nhập họ và tên"
                placeholderTextColor="#9A9A9A"
              />
            </View>

            <Text style={styles.fieldLabel}>Số điện thoại</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="phone-iphone" size={20} color="#818A91" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="Nhập số điện thoại"
                keyboardType="phone-pad"
                placeholderTextColor="#9A9A9A"
              />
            </View>

            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.inputWrapperDisabled}>
              <MaterialIcons name="mail-outline" size={20} color="#818A91" style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: '#818A91' }]}
                value={email}
                editable={false}
                placeholder="Chưa thiết lập email"
                placeholderTextColor="#9A9A9A"
              />
            </View>

            <Text style={styles.fieldLabel}>Ngày sinh</Text>
            <Pressable style={styles.inputWrapper} onPress={() => setShowDatePicker(true)}>
              <MaterialIcons name="cake" size={20} color="#818A91" style={styles.inputIcon} />
              <Text style={[styles.textInputDisplay, !dateOfBirth && { color: '#9A9A9A' }]}>
                {formatDateDisplay(dateOfBirth)}
              </Text>
              <MaterialIcons name="calendar-today" size={18} color="#0F382C" />
            </Pressable>

            <Text style={styles.fieldLabel}>Giới tính</Text>
            <View style={styles.genderRow}>
              <Pressable
                style={[styles.genderBtn, gender === GenderEnum.Male && styles.genderBtnActive]}
                onPress={() => setGender(GenderEnum.Male)}>
                <MaterialIcons
                  name="male"
                  size={20}
                  color={gender === GenderEnum.Male ? '#0F382C' : '#818A91'}
                />
                <Text
                  style={[
                    styles.genderBtnText,
                    gender === GenderEnum.Male && styles.genderBtnTextActive,
                  ]}>
                  Nam
                </Text>
              </Pressable>

              <Pressable
                style={[styles.genderBtn, gender === GenderEnum.Female && styles.genderBtnActive]}
                onPress={() => setGender(GenderEnum.Female)}>
                <MaterialIcons
                  name="female"
                  size={20}
                  color={gender === GenderEnum.Female ? '#0F382C' : '#818A91'}
                />
                <Text
                  style={[
                    styles.genderBtnText,
                    gender === GenderEnum.Female && styles.genderBtnTextActive,
                  ]}>
                  Nữ
                </Text>
              </Pressable>

              <Pressable
                style={[styles.genderBtn, gender === GenderEnum.Other && styles.genderBtnActive]}
                onPress={() => setGender(GenderEnum.Other)}>
                <MaterialIcons
                  name="transgender"
                  size={20}
                  color={gender === GenderEnum.Other ? '#0F382C' : '#818A91'}
                />
                <Text
                  style={[
                    styles.genderBtnText,
                    gender === GenderEnum.Other && styles.genderBtnTextActive,
                  ]}>
                  Khác
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Submit Button */}
          <Pressable
            style={[styles.saveButton, updateMutation.isPending && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
            )}
          </Pressable>
        </KeyboardAwareScrollView>
      )}

      {/* Date Picker Modal / Native Picker */}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={showDatePicker}>
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowDatePicker(false)} />
            <View style={[styles.datePickerContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.datePickerHeader}>
                <Pressable onPress={() => setShowDatePicker(false)} style={styles.pickerHeaderBtn}>
                  <Text style={styles.pickerCancelText}>Hủy</Text>
                </Pressable>
                <Text style={styles.pickerTitleText}>Chọn ngày sinh</Text>
                <Pressable onPress={() => setShowDatePicker(false)} style={styles.pickerHeaderBtn}>
                  <Text style={styles.pickerDoneText}>Xong</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={dateOfBirth || new Date(2000, 0, 1)}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                textColor="#1b1c1c"
                themeVariant="light"
                locale="vi-VN"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setDateOfBirth(selectedDate);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={dateOfBirth || new Date(2000, 0, 1)}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setDateOfBirth(selectedDate);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FBF9F5',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    height: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#EFECE6',
    zIndex: 10,
  },
  headerButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#0F382C',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  avatarWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#0F382C',
    shadowColor: '#0F382C',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 47,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0F382C',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  changeAvatarText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#818A91',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFECE6',
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 24,
  },
  fieldLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#1b1c1c',
    marginBottom: 8,
    marginTop: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAE5E3',
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapperDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECEAE8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAE5E3',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#1b1c1c',
  },
  textInputDisplay: {
    flex: 1,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#1b1c1c',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAE5E3',
    backgroundColor: '#F5F3F2',
  },
  genderBtnActive: {
    borderColor: '#0F382C',
    backgroundColor: '#E6F0EB',
  },
  genderBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#818A91',
  },
  genderBtnTextActive: {
    color: '#0F382C',
  },
  saveButton: {
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
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#EAE5E3',
  },
  pickerHeaderBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  pickerCancelText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    color: '#818A91',
  },
  pickerTitleText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#1b1c1c',
  },
  pickerDoneText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#0F382C',
  },
});
