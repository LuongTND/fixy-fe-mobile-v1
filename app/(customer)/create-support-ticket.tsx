import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createSupportTicket, SupportCategory, SupportPriority } from '@/services/api/support';

export default function CreateSupportTicketScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ bookingId?: string }>();

  // Form State
  const [category, setCategory] = React.useState<SupportCategory>(SupportCategory.Technical);
  const [priority, setPriority] = React.useState<SupportPriority>(SupportPriority.Normal);
  const [subject, setSubject] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [bookingId, setBookingId] = React.useState(params.bookingId || '');

  const createMutation = useMutation({
    mutationFn: createSupportTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      Alert.alert('Thành công', 'Gửi yêu cầu hỗ trợ thành công. Chúng tôi sẽ phản hồi sớm nhất.', [
        { text: 'Đóng', onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      Alert.alert('Thất bại', 'Không thể tạo yêu cầu hỗ trợ. Vui lòng thử lại sau.');
    },
  });

  const handleSubmit = () => {
    if (!subject.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề yêu cầu.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng mô tả chi tiết vấn đề.');
      return;
    }

    createMutation.mutate({
      category,
      priority,
      subject: subject.trim(),
      description: description.trim(),
      bookingId: bookingId.trim() || null,
    });
  };

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable style={styles.headerButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#1b1c1c" />
        </Pressable>
        <Text style={styles.headerTitle}>Gửi yêu cầu hỗ trợ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Category Selector */}
        <Text style={styles.label}>Loại vấn đề</Text>
        <View style={styles.optionsRow}>
          {[
            { value: SupportCategory.Technical, text: 'Kỹ thuật' },
            { value: SupportCategory.Payment, text: 'Thanh toán' },
            { value: SupportCategory.Dispute, text: 'Tranh chấp' },
            { value: SupportCategory.Other, text: 'Khác' },
          ].map((item) => (
            <Pressable
              key={item.value}
              style={[styles.optionCard, category === item.value && styles.activeOptionCard]}
              onPress={() => setCategory(item.value)}>
              <Text style={[styles.optionText, category === item.value && styles.activeOptionText]}>
                {item.text}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Priority Selector */}
        <Text style={styles.label}>Mức độ ưu tiên</Text>
        <View style={styles.optionsRow}>
          {[
            { value: SupportPriority.Low, text: 'Thấp' },
            { value: SupportPriority.Normal, text: 'Thường' },
            { value: SupportPriority.High, text: 'Cao' },
            { value: SupportPriority.Urgent, text: 'Khẩn cấp' },
          ].map((item) => (
            <Pressable
              key={item.value}
              style={[
                styles.optionCard,
                priority === item.value && styles.activeOptionCard,
                priority === item.value &&
                  item.value === SupportPriority.Urgent &&
                  styles.urgentOptionCard,
              ]}
              onPress={() => setPriority(item.value)}>
              <Text
                style={[
                  styles.optionText,
                  priority === item.value && styles.activeOptionText,
                  priority === item.value &&
                    item.value === SupportPriority.Urgent &&
                    styles.urgentOptionText,
                ]}>
                {item.text}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Booking ID Input */}
        <Text style={styles.label}>Mã đơn đặt chỗ (Nếu có)</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={bookingId}
            onChangeText={setBookingId}
            placeholder="Ví dụ: b128f731-..."
            placeholderTextColor="#818A91"
            editable={!params.bookingId} // Disable if pre-filled from detail page
          />
        </View>

        {/* Subject Input */}
        <Text style={styles.label}>Tiêu đề</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={subject}
            onChangeText={setSubject}
            placeholder="Nhập ngắn gọn chủ đề cần hỗ trợ..."
            placeholderTextColor="#818A91"
            maxLength={100}
          />
        </View>

        {/* Description Input */}
        <Text style={styles.label}>Mô tả chi tiết</Text>
        <View style={[styles.inputContainer, styles.textAreaContainer]}>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Mô tả chi tiết sự cố bạn đang gặp phải. Vui lòng cung cấp thêm thông tin để được hỗ trợ tốt nhất..."
            placeholderTextColor="#818A91"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, createMutation.isPending && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Gửi yêu cầu hỗ trợ</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
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
  label: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#0F382C',
    marginTop: 18,
    marginBottom: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  optionCard: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFECE6',
    backgroundColor: '#ffffff',
  },
  activeOptionCard: {
    borderColor: '#0F382C',
    backgroundColor: '#F4F1EA',
  },
  urgentOptionCard: {
    borderColor: '#ba1a1a',
    backgroundColor: '#ffebee',
  },
  optionText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#6B7280',
  },
  activeOptionText: {
    color: '#0F382C',
  },
  urgentOptionText: {
    color: '#ba1a1a',
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#EFECE6',
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    justifyContent: 'center',
    marginBottom: 4,
  },
  textAreaContainer: {
    paddingVertical: 8,
    minHeight: 120,
  },
  textInput: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#1C2526',
    flex: 1,
  },
  textArea: {
    height: 120,
  },
  submitButton: {
    backgroundColor: '#0F382C',
    borderRadius: 20,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 40,
    shadowColor: '#0F382C',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#ffffff',
  },
});
