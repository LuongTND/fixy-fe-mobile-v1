import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CORE_VALUES = [
  {
    icon: 'verified-user',
    title: 'Tận tâm & An toàn tuyệt đối',
    desc: '100% Kỹ thuật viên qua thẩm định lý lịch, chứng chỉ hành nghề và kiểm tra tay nghề nghiêm ngặt.',
    color: '#0F382C',
    bgColor: '#E6F0EB',
  },
  {
    icon: 'flash-on',
    title: 'Nhanh chóng & Tiện lợi',
    desc: 'Đặt lịch thảnh thơi chỉ trong 60 giây. KTV có mặt đúng giờ tận nơi kèm đầy đủ dụng cụ chuẩn bị sẵn sàng.',
    color: '#D98A2B',
    bgColor: '#FEF3C7',
  },
  {
    icon: 'payments',
    title: 'Minh bạch & Giá trị thật',
    desc: 'Giá dịch vụ niêm yết rõ ràng, không phụ phí ẩn, mang lại trải nghiệm an tâm trọn vẹn cho khách hàng.',
    color: '#2B6CB0',
    bgColor: '#EBF8FF',
  },
  {
    icon: 'favorite',
    title: 'Cá nhân hóa trải nghiệm',
    desc: 'Từng liệu trình massage, chăm sóc da hay gội đầu dưỡng sinh đều được tinh chỉnh riêng theo thể trạng của bạn.',
    color: '#C53030',
    bgColor: '#FFF5F5',
  },
];

const TIMELINE_STEPS = [
  {
    year: '2024',
    badge: 'Khởi đầu',
    title: 'Ý tưởng & Định hình nền tảng',
    content:
      'Fixy ra đời từ trăn trở: Làm sao để người bận rộn được chăm sóc sức khỏe, sắc đẹp một cách thảnh thơi nhất mà không cần tốn thời gian di chuyển, kẹt xe hay chờ đợi.',
  },
  {
    year: '2025',
    badge: 'Bứt phá',
    title: 'Ra mắt thử nghiệm tại TP.HCM & Hà Nội',
    content:
      'Hoàn thiện hệ sinh thái kết nối KTV tại nhà và điểm Spa liên kết, cán mốc 10.000 lượt đặt đầu tiên với sự đón nhận nồng nhiệt từ cộng đồng.',
  },
  {
    year: '2026',
    badge: 'Hiện tại',
    title: 'Mở rộng mạng lưới toàn diện v1.0',
    content:
      'Nâng cấp ứng dụng với định vị thời gian thực, thanh toán trực tuyến linh hoạt và an toàn, hệ thống đánh giá minh bạch và quy chuẩn dịch vụ Spa 5 sao.',
  },
];

const QUALITY_COMMITMENTS = [
  {
    icon: 'school',
    title: 'Tay nghề chuyên sâu',
    desc: 'KTV sở hữu chứng chỉ chuyên ngành và kinh nghiệm tối thiểu từ 2 năm tại các cơ sở spa uy tín.',
  },
  {
    icon: 'sanitizer',
    title: 'Chuẩn vệ sinh y tế',
    desc: 'Dụng cụ, khăn, tinh dầu và mỹ phẩm được khử khuẩn, đóng gói mới 100% cho mỗi khách hàng.',
  },
  {
    icon: 'eco',
    title: 'Sản phẩm thảo mộc an lành',
    desc: 'Ưu tiên dòng sản phẩm hữu cơ có nguồn gốc thiên nhiên, lành tính và an toàn cho mọi làn da.',
  },
  {
    icon: 'support-agent',
    title: 'Bảo vệ quyền lợi 24/7',
    desc: 'Đội ngũ hỗ trợ và bảo hiểm dịch vụ luôn đồng hành trong suốt quá trình trải nghiệm liệu trình.',
  },
];

export default function AboutUsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <MaterialIcons name="arrow-back" size={24} color="#1C2526" />
        </Pressable>
        <Text style={styles.headerTitle}>Về chúng tôi</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}>
        {/* Hero Section */}
        <LinearGradient
          colors={['#0F382C', '#1A4D3D', '#0B261E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <MaterialIcons name="auto-awesome" size={14} color="#D4AF37" />
            <Text style={styles.heroBadgeText}>FIXY WELLNESS & BEAUTY</Text>
          </View>
          <Text style={styles.heroHeading}>
            Tái định nghĩa sự thư giãn{'\n'}trong nhịp sống hiện đại
          </Text>
          <Text style={styles.heroSubheading}>
            Mang trải nghiệm Spa, Chăm sóc sức khỏe & Làm đẹp chuẩn mực đến tận không gian sống của bạn.
          </Text>

          <View style={styles.heroDecorLine} />

          <View style={styles.heroFeatureRow}>
            <View style={styles.heroFeatureItem}>
              <MaterialIcons name="home" size={18} color="#D4AF37" />
              <Text style={styles.heroFeatureText}>Tận nơi</Text>
            </View>
            <View style={styles.heroFeatureDot} />
            <View style={styles.heroFeatureItem}>
              <MaterialIcons name="schedule" size={18} color="#D4AF37" />
              <Text style={styles.heroFeatureText}>Linh hoạt 24/7</Text>
            </View>
            <View style={styles.heroFeatureDot} />
            <View style={styles.heroFeatureItem}>
              <MaterialIcons name="verified" size={18} color="#D4AF37" />
              <Text style={styles.heroFeatureText}>Chuẩn 5 sao</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Origin Story Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#E6F0EB' }]}>
              <MaterialIcons name="menu-book" size={20} color="#0F382C" />
            </View>
            <View>
              <Text style={styles.sectionLabel}>CÂU CHUYỆN KHỞI NGUỒN</Text>
              <Text style={styles.sectionTitle}>Vì sao Fixy ra đời?</Text>
            </View>
          </View>

          <Text style={styles.bodyParagraph}>
            Trong guồng quay hối hả của cuộc sống đô thị, ai trong chúng ta cũng xứng đáng có những phút giây được thư giãn, hồi phục năng lượng thể chất và tinh thần. Thế nhưng, việc phải đối mặt với kẹt xe, khói bụi, thời gian chờ đợi tại các cơ sở spa thường biến mong muốn nghỉ ngơi thành một sự mệt mỏi khác.
          </Text>

          <View style={styles.quoteBox}>
            <MaterialIcons name="format-quote" size={28} color="#D4AF37" style={{ marginBottom: 4 }} />
            <Text style={styles.quoteText}>
              "Chúng tôi tin rằng sự chăm sóc sức khỏe và sắc đẹp tốt nhất là khi bạn được thư thái tuyệt đối trong chính không gian quen thuộc và an toàn của ngôi nhà mình."
            </Text>
          </View>

          <Text style={styles.bodyParagraph}>
            Đồng thời, Fixy được xây dựng như một bệ phóng văn minh, nơi đội ngũ Kỹ thuật viên trị liệu lành nghề được tôn vinh, có thu nhập xứng đáng, chủ động thời gian và nhận được sự tôn trọng từ cộng đồng.
          </Text>
        </View>

        {/* Stats Section with explicit 2x2 rows */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsHeaderTitle}>Những con số biết nói</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIconCircle}>
                <MaterialIcons name="spa" size={20} color="#0F382C" />
              </View>
              <Text style={styles.statNumber}>50.000+</Text>
              <Text style={styles.statLabel}>Lượt phục vụ thành công</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIconCircle}>
                <MaterialIcons name="people-alt" size={20} color="#0F382C" />
              </View>
              <Text style={styles.statNumber}>1.500+</Text>
              <Text style={styles.statLabel}>KTV & Đối tác chuyên nghiệp</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIconCircle}>
                <MaterialIcons name="star" size={20} color="#0F382C" />
              </View>
              <Text style={styles.statNumber}>98.8%</Text>
              <Text style={styles.statLabel}>Đánh giá hài lòng 5 sao</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIconCircle}>
                <MaterialIcons name="location-city" size={20} color="#0F382C" />
              </View>
              <Text style={styles.statNumber}>03</Text>
              <Text style={styles.statLabel}>Thành phố lớn phủ sóng</Text>
            </View>
          </View>
        </View>

        {/* Mission & Core Values */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#FEF3C7' }]}>
              <MaterialIcons name="stars" size={20} color="#D98A2B" />
            </View>
            <View>
              <Text style={styles.sectionLabel}>SỨ MỆNH & GIÁ TRỊ</Text>
              <Text style={styles.sectionTitle}>Điều Fixy luôn gìn giữ</Text>
            </View>
          </View>

          <View style={styles.valuesList}>
            {CORE_VALUES.map((val, idx) => (
              <View key={idx} style={styles.valueItem}>
                <View style={[styles.valueIconBox, { backgroundColor: val.bgColor }]}>
                  <MaterialIcons name={val.icon as any} size={22} color={val.color} />
                </View>
                <View style={styles.valueTextBox}>
                  <Text style={styles.valueTitle}>{val.title}</Text>
                  <Text style={styles.valueDesc}>{val.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Quality Commitment Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#EBF8FF' }]}>
              <MaterialIcons name="workspace-premium" size={20} color="#2B6CB0" />
            </View>
            <View>
              <Text style={styles.sectionLabel}>CAM KẾT CHẤT LƯỢNG</Text>
              <Text style={styles.sectionTitle}>Tiêu chuẩn dịch vụ 5 sao</Text>
            </View>
          </View>

          <View style={styles.commitGrid}>
            {QUALITY_COMMITMENTS.map((com, index) => (
              <View key={index} style={styles.commitCard}>
                <View style={styles.commitIconHeader}>
                  <MaterialIcons name={com.icon as any} size={20} color="#0F382C" />
                  <Text style={styles.commitTitle}>{com.title}</Text>
                </View>
                <Text style={styles.commitDesc}>{com.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Timeline / Milestones */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#FDF2F8' }]}>
              <MaterialIcons name="timeline" size={20} color="#9D174D" />
            </View>
            <View>
              <Text style={styles.sectionLabel}>HÀNH TRÌNH PHÁT TRIỂN</Text>
              <Text style={styles.sectionTitle}>Cột mốc đáng nhớ</Text>
            </View>
          </View>

          <View style={styles.timelineContainer}>
            {TIMELINE_STEPS.map((step, idx) => (
              <View key={idx} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={styles.timelineDot} />
                  {idx !== TIMELINE_STEPS.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <Text style={styles.timelineYear}>{step.year}</Text>
                    <View style={styles.timelineBadge}>
                      <Text style={styles.timelineBadgeText}>{step.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.timelineTitle}>{step.title}</Text>
                  <Text style={styles.timelineDesc}>{step.content}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Actionable CTAs Box */}
        <View style={styles.ctaCard}>
          <View style={styles.ctaBadge}>
            <MaterialIcons name="touch-app" size={16} color="#D4AF37" />
            <Text style={styles.ctaBadgeText}>SẴN SÀNG TRẢI NGHIỆM?</Text>
          </View>
          <Text style={styles.ctaTitle}>Bắt đầu hành trình thư giãn cùng Fixy ngay hôm nay</Text>
          <Text style={styles.ctaSub}>
            Đặt dịch vụ tận nhà tiện lợi hoặc đồng hành cùng chúng tôi với vai trò Kỹ thuật viên đối tác.
          </Text>

          <View style={styles.ctaButtonsGroup}>
            <Pressable
              style={styles.primaryCtaBtn}
              onPress={() => router.push('/(customer)/home' as any)}>
              <MaterialIcons name="spa" size={20} color="#ffffff" />
              <Text style={styles.primaryCtaBtnText}>Khám phá dịch vụ</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryCtaBtn}
              onPress={() => router.push('/(worker)/worker-setup' as any)}>
              <MaterialIcons name="handshake" size={20} color="#0F382C" />
              <Text style={styles.secondaryCtaBtnText}>Đăng ký làm Đối tác KTV</Text>
            </Pressable>

            <Pressable
              style={styles.tertiaryCtaBtn}
              onPress={() => router.push('/(customer)/support-tickets' as any)}>
              <MaterialIcons name="headset-mic" size={18} color="#CBD5E1" />
              <Text style={styles.tertiaryCtaBtnText}>Trung tâm trợ giúp & Góp ý</Text>
            </Pressable>
          </View>
        </View>

        {/* Footer info */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerBrand}>FIXY SPA & WELLNESS</Text>
          <Text style={styles.footerCopyright}>
            © 2026 Fixy Platform. Tất cả quyền được bảo lưu.
          </Text>
          <Text style={styles.footerVersion}>Phiên bản 1.0.0 (Build 2026)</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF9F5',
  },
  header: {
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#EFECE6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F4F1EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#1C2526',
  },
  headerRightSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  heroCard: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  heroBadgeText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 11,
    color: '#D4AF37',
    letterSpacing: 0.5,
  },
  heroHeading: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 22,
    color: '#ffffff',
    lineHeight: 30,
    marginBottom: 8,
  },
  heroSubheading: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#E0E7E3',
    lineHeight: 21,
  },
  heroDecorLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 16,
  },
  heroFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroFeatureText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#ffffff',
  },
  heroFeatureDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4AF37',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EFECE6',
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  sectionIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 11,
    color: '#818A91',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
    color: '#1C2526',
    marginTop: 2,
  },
  bodyParagraph: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 12,
  },
  quoteBox: {
    backgroundColor: '#FBF9F5',
    borderLeftWidth: 3,
    borderLeftColor: '#D4AF37',
    padding: 14,
    borderRadius: 8,
    marginVertical: 12,
  },
  quoteText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#0F382C',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  statsContainer: {
    gap: 10,
  },
  statsHeaderTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#1C2526',
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F0EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 20,
    color: '#0F382C',
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  valuesList: {
    gap: 14,
    marginTop: 6,
  },
  valueItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  valueIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  valueTextBox: {
    flex: 1,
  },
  valueTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#1C2526',
    marginBottom: 3,
  },
  valueDesc: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
  },
  commitGrid: {
    gap: 10,
    marginTop: 6,
  },
  commitCard: {
    backgroundColor: '#FBF9F5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  commitIconHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commitTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#0F382C',
  },
  commitDesc: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  timelineContainer: {
    marginTop: 6,
    paddingLeft: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineLeft: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0F382C',
    borderWidth: 2,
    borderColor: '#D4AF37',
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#EFECE6',
    marginVertical: 4,
    minHeight: 60,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  timelineYear: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#0F382C',
  },
  timelineBadge: {
    backgroundColor: '#E6F0EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  timelineBadgeText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#0F382C',
  },
  timelineTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#1C2526',
    marginBottom: 4,
  },
  timelineDesc: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
  },
  ctaCard: {
    backgroundColor: '#0F382C',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#0F382C',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  ctaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(212, 175, 55, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 10,
  },
  ctaBadgeText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 10,
    color: '#D4AF37',
    letterSpacing: 0.5,
  },
  ctaTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 25,
    marginBottom: 8,
  },
  ctaSub: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#E0E7E3',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  ctaButtonsGroup: {
    width: '100%',
    gap: 10,
  },
  primaryCtaBtn: {
    backgroundColor: '#D98A2B',
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryCtaBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#ffffff',
  },
  secondaryCtaBtn: {
    backgroundColor: '#ffffff',
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryCtaBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#0F382C',
  },
  tertiaryCtaBtn: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tertiaryCtaBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#CBD5E1',
  },
  footerInfo: {
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  footerBrand: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#818A91',
    letterSpacing: 1,
  },
  footerCopyright: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#A0AAB0',
  },
  footerVersion: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 10,
    color: '#C6DFC6',
  },
});
