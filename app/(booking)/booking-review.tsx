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

import { submitReview } from '@/services/api/reviews';
import { getApiErrorMessage } from '@/services/api/client';

const SUGGESTION_CHIPS = [
  'ÄÃºng giá»',
  'ChuyÃªn nghiá»‡p',
  'GiÃ¡ há»£p lÃ½',
  'ThÃ¢n thiá»‡n',
  'Sáº¡ch sáº½',
  'Táº­n tÃ¢m',
];

function getRatingLabel(rating: number) {
  if (rating === 5) return 'Tuy\u1ec7t v\u1eddi!';
  if (rating === 4) return 'R\u1ea5t t\u1ed1t';
  if (rating === 3) return 'T\u1ea1m \u0111\u01b0\u1ee3c';
  if (rating === 2) return 'Ch\u01b0a h\u00e0i l\u00f2ng';
  return 'R\u1ea5t t\u1ec7';
}

export default function BookingReviewScreen() {
  const insets = useSafeAreaInsets();
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
      Alert.alert('Vui lÃ²ng Ä‘Ã¡nh giÃ¡', 'HÃ£y chá»n sá»‘ sao Ä‘á»ƒ Ä‘Ã¡nh giÃ¡ dá»‹ch vá»¥.');
      return;
    }
    if (!params.bookingId) {
      Alert.alert('Lá»—i', 'KhÃ´ng tÃ¬m tháº¥y thÃ´ng tin Ä‘Æ¡n hÃ ng.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Combine chips and free-text comment
      const chipText = selectedChips.length > 0 ? selectedChips.join(', ') + '. ' : '';
      const fullComment = chipText + comment.trim();

      const imageFiles = images.map((uri, i) => ({
        uri,
        type: 'image/jpeg',
        name: `review_${i}.jpg`,
      }));

      await submitReview(params.bookingId, {
        Rating: rating,
        Comment: fullComment || `ÄÃ¡nh giÃ¡ ${rating} sao`,
        Images: imageFiles.length > 0 ? imageFiles : undefined,
      });

      Alert.alert('ThÃ nh cÃ´ng', 'Cáº£m Æ¡n báº¡n Ä‘Ã£ Ä‘Ã¡nh giÃ¡ dá»‹ch vá»¥!', [
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
      Alert.alert('Lá»—i', getApiErrorMessage(error));
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
          <MaterialIcons name="arrow-back" size={24} color="#FF8228" />
        </Pressable>
        <Text style={styles.headerTitle}>ÄÃ¡nh giÃ¡ dá»‹ch vá»¥</Text>
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
            <Text style={styles.workerName}>{params.workerName ?? 'Nguyá»…n VÄƒn Tháº¯ng'}</Text>
            <Text style={styles.workerSpecialty}>
              {params.categoryName ?? 'ChuyÃªn gia Äiá»‡n nÆ°á»›c'}
            </Text>
          </View>
        </View>

        {/* Star Rating */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingQuestion}>Báº¡n tháº¥y tháº¿ nÃ o vá» dá»‹ch vá»¥?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)} style={styles.starBtn}>
                <MaterialIcons
                  name="star"
                  size={40}
                  color={star <= rating ? '#FF8228' : '#dcd9d9'}
                />
              </Pressable>
            ))}
          </View>
          {rating > 0 && <Text style={styles.ratingLabel}>{getRatingLabel(rating)}</Text>}
        </View>

        {/* Suggestion Chips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gá»£i Ã½ Ä‘Ã¡nh giÃ¡</Text>
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
          <Text style={styles.sectionTitle}>Nháº­n xÃ©t chi tiáº¿t</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Chia sáº» thÃªm vá» tráº£i nghiá»‡m cá»§a báº¡n..."
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
          <Text style={styles.sectionTitle}>ThÃªm hÃ¬nh áº£nh</Text>
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
                <MaterialIcons name="photo-camera" size={24} color="#FF8228" />
                <Text style={styles.addImageText}>+ ThÃªm áº£nh</Text>
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
            colors={['#FF8228', '#F45100']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitBtnGradient}>
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Gá»­i Ä‘Ã¡nh giÃ¡</Text>
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
    backgroundColor: '#FBF9F8',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FBF9F8',
    borderBottomWidth: 1,
    borderBottomColor: '#DDDDDD',
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
    color: '#FF8228',
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
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  workerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFE6D5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  workerName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: '#1b1c1c',
  },
  workerSpecialty: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    lineHeight: 21,
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
    color: '#1b1c1c',
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
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#FF8228',
    marginTop: 12,
  },
  section: {},
  sectionTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    lineHeight: 21,
    color: '#1b1c1c',
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#ffffff',
  },
  chipSelected: {
    borderColor: '#FF8228',
    backgroundColor: 'rgba(255, 230, 213, 0.3)',
  },
  chipText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: '#574237',
  },
  chipTextSelected: {
    color: '#FF8228',
    fontFamily: 'Montserrat_600SemiBold',
  },
  textArea: {
    height: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#ffffff',
    padding: 12,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: '#1b1c1c',
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
    borderColor: '#FF8228',
    backgroundColor: 'rgba(255, 230, 213, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addImageText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#FF8228',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#DDDDDD',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -16 },
    elevation: 12,
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
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
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
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
