import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { submitReview } from '@/services/api/reviews';
import { getApiErrorMessage } from '@/services/api/client';
import { prepareUploadFile } from '@/services/api/media';

const SUGGESTION_CHIPS = [
  'Đúng giờ',
  'Chuyên nghiệp',
  'Giá hợp lý',
  'Thân thiện',
  'Sạch sẽ',
  'Tận tâm',
];

function getRatingLabel(rating: number) {
  if (rating === 5) return 'Tuyệt vời!';
  if (rating === 4) return 'Rất tốt';
  if (rating === 3) return 'Tạm được';
  if (rating === 2) return 'Chưa hài lòng';
  return 'Rất tệ';
}

export default function BookingReviewScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    bookingId: string;
    workerName?: string;
    categoryName?: string;
  }>();

  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState('');
  const [selectedChips, setSelectedChips] = React.useState<string[]>([]);
  const [images, setImages] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activePreviewImage, setActivePreviewImage] = React.useState<string | null>(null);

  const toggleChip = (chip: string) => {
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newUris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...newUris].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Vui lòng đánh giá', 'Hãy chọn số sao để đánh giá dịch vụ.');
      return;
    }
    if (!params.bookingId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin đơn hàng.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Combine chips and free-text comment
      const chipText = selectedChips.length > 0 ? selectedChips.join(', ') + '. ' : '';
      const fullComment = chipText + comment.trim();

      const imageFiles = await Promise.all(
        images.map((uri, i) => prepareUploadFile(uri, `review_${i}.jpg`))
      );

      await submitReview(params.bookingId, {
        Rating: rating,
        Comment: fullComment || `Đánh giá ${rating} sao`,
        Images: imageFiles.length > 0 ? imageFiles : undefined,
      });

      // Invalidate query caches to ensure the UI updates instantly
      queryClient.invalidateQueries({ queryKey: ['bookingReview', params.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking', params.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      queryClient.invalidateQueries({ queryKey: ['worker'] });
      queryClient.invalidateQueries({ queryKey: ['workerReviews'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });

      Alert.alert('Thành công', 'Cảm ơn bạn đã đánh giá dịch vụ!', [
        {
          text: 'OK',
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/orders' as any);
            }
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Lỗi', getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/orders' as any);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={handleGoBack}>
          <MaterialIcons name="arrow-back" size={24} color="#0F382C" />
        </Pressable>
        <Text style={styles.headerTitle}>Đánh giá dịch vụ</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Worker Profile Card */}
        <View style={styles.workerCard}>
          <View style={styles.workerAvatar}>
            <MaterialIcons name="person" size={32} color="#818A91" />
          </View>
          <View>
            <Text style={styles.workerName}>{params.workerName ?? 'Nguyễn Văn Thắng'}</Text>
            <Text style={styles.workerSpecialty}>
              {params.categoryName ?? 'Chuyên gia Điện nước'}
            </Text>
          </View>
        </View>

        {/* Star Rating */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingQuestion}>Bạn thấy thế nào về dịch vụ?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)} style={styles.starBtn}>
                <MaterialIcons
                  name="star"
                  size={40}
                  color={star <= rating ? '#D4AF37' : '#dcd9d9'}
                />
              </Pressable>
            ))}
          </View>
          {rating > 0 && <Text style={styles.ratingLabel}>{getRatingLabel(rating)}</Text>}
        </View>

        {/* Suggestion Chips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gợi ý đánh giá</Text>
          <View style={styles.chipsRow}>
            {SUGGESTION_CHIPS.map((chip) => {
              const isSelected = selectedChips.includes(chip);
              return (
                <Pressable
                  key={chip}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => toggleChip(chip)}>
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {chip}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Comment Text Area */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nhận xét chi tiết</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Chia sẻ thêm về trải nghiệm của bạn..."
            placeholderTextColor="#818A91"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* Add Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thêm hình ảnh</Text>
          <View style={styles.imagesRow}>
            {images.map((uri, index) => (
              <View key={uri} style={styles.imagePreview}>
                <Pressable onPress={() => setActivePreviewImage(uri)}>
                  <Image source={{ uri }} style={styles.imageThumb} />
                </Pressable>
                <Pressable style={styles.imageRemoveBtn} onPress={() => removeImage(index)}>
                  <MaterialIcons name="close" size={14} color="#ffffff" />
                </Pressable>
              </View>
            ))}
            {images.length < 5 && (
              <Pressable style={styles.addImageBtn} onPress={handlePickImage}>
                <MaterialIcons name="photo-camera" size={24} color="#0F382C" />
                <Text style={styles.addImageText}>+ Thêm ảnh</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Submit */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}>
          <LinearGradient
            colors={['#0F382C', '#1A4D3E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitBtnGradient}>
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Gửi đánh giá</Text>
            )}
          </LinearGradient>
        </Pressable>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FBF9F5',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE6',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    lineHeight: 24,
    color: '#0F382C',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 24,
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
    shadowColor: '#0F382C',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  workerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F4F1EA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F382C',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  workerName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    lineHeight: 20,
    color: '#1C2526',
  },
  workerSpecialty: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#818A91',
    marginTop: 2,
  },
  ratingSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  ratingQuestion: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: '#0F382C',
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starBtn: {
    padding: 4,
  },
  ratingLabel: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#D4AF37',
    marginTop: 12,
  },
  section: {},
  sectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    lineHeight: 21,
    color: '#0F382C',
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFECE6',
    backgroundColor: '#ffffff',
  },
  chipSelected: {
    borderColor: '#0F382C',
    backgroundColor: '#F4F1EA',
  },
  chipText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    lineHeight: 21,
    color: '#6B7280',
  },
  chipTextSelected: {
    color: '#0F382C',
    fontFamily: 'Montserrat_700Bold',
  },
  textArea: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFECE6',
    backgroundColor: '#F4F1EA',
    padding: 12,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: '#1C2526',
  },
  imagesRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  imagePreview: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imageThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageBtn: {
    width: 96,
    height: 96,
    borderRadius: 12,
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
    fontSize: 12,
    lineHeight: 18,
    color: '#0F382C',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EFECE6',
    shadowColor: '#0F382C',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -16 },
    elevation: 12,
  },
  submitBtn: {
    height: 52,
    borderRadius: 22,
    overflow: 'hidden',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    lineHeight: 20,
    color: '#ffffff',
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
