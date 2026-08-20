import { MaterialIcons } from '@expo/vector-icons';
import * as React from 'react';
import {
  LayoutChangeEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface EContractModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
  customerName?: string;
  categoryName?: string;
}

export default function EContractModal({
  visible,
  onClose,
  onAccept,
  customerName,
  categoryName,
}: EContractModalProps) {
  const insets = useSafeAreaInsets();

  // Reference code is frozen for the lifetime of one opened contract session
  const [contractCode, setContractCode] = React.useState(() => `FIXY-HDDT-${Date.now()}`);

  // The accept action stays locked until the whole contract has been scrolled through
  const [hasReadToEnd, setHasReadToEnd] = React.useState(false);
  const viewportHeightRef = React.useRef(0);

  React.useEffect(() => {
    if (visible) {
      setContractCode(`FIXY-HDDT-${Date.now()}`);
      setHasReadToEnd(false);
    }
  }, [visible]);

  const handleViewportLayout = (event: LayoutChangeEvent) => {
    viewportHeightRef.current = event.nativeEvent.layout.height;
  };

  // Contract shorter than the viewport can never be scrolled, so it counts as fully read
  const handleContentSizeChange = (_width: number, contentHeight: number) => {
    if (
      viewportHeightRef.current > 0 &&
      contentHeight <= viewportHeightRef.current + SCROLL_END_THRESHOLD
    ) {
      setHasReadToEnd(true);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - SCROLL_END_THRESHOLD) {
      setHasReadToEnd(true);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>HỢP ĐỒNG DỊCH VỤ ĐIỆN TỬ</Text>
              <Text style={styles.headerCode}>Số: {contractCode}</Text>
            </View>
            <Pressable style={styles.closeIconBtn} onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={22} color="#383838" />
            </Pressable>
          </View>

          {/* Legal body */}
          <ScrollView
            contentContainerStyle={styles.scrollBody}
            showsVerticalScrollIndicator
            scrollEventThrottle={16}
            onLayout={handleViewportLayout}
            onContentSizeChange={handleContentSizeChange}
            onScroll={handleScroll}>
            <Text style={styles.nationalTitle}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
            <Text style={styles.nationalMotto}>Độc lập - Tự do - Hạnh phúc</Text>
            <View style={styles.mottoUnderline} />

            <Text style={styles.docTitle}>HỢP ĐỒNG CUNG CẤP DỊCH VỤ SPA TẠI NHÀ</Text>
            <Text style={styles.docSubtitle}>
              Căn cứ Bộ luật Dân sự số 91/2015/QH13; Luật Bảo vệ quyền lợi người tiêu dùng số
              19/2023/QH15; Luật Giao dịch điện tử số 20/2023/QH15 và nhu cầu, khả năng của các bên.
            </Text>

            <Text style={styles.partyTitle}>BÊN A — KHÁCH HÀNG (NGƯỜI SỬ DỤNG DỊCH VỤ)</Text>
            <Text style={styles.partyBody}>
              {customerName ? `Đại diện: ${customerName}\n` : ''}
              Khách hàng được xác thực thông qua tài khoản đã đăng ký trên ứng dụng Fixy. Thông tin
              liên hệ, số điện thoại và địa chỉ nhận dịch vụ được lấy theo dữ liệu Bên A khai báo
              tại đơn đặt lịch này.
            </Text>

            <Text style={styles.partyTitle}>BÊN B — NỀN TẢNG KẾT NỐI & KỸ THUẬT VIÊN ĐỐI TÁC</Text>
            <Text style={styles.partyBody}>
              Công ty Cổ phần Công nghệ & Dịch vụ Fixy, đơn vị vận hành ứng dụng Fixy — Spa Tại Nhà,
              cùng kỹ thuật viên đối tác được Fixy thẩm định chuyên môn và trực tiếp thực hiện dịch
              vụ cho Bên A.
            </Text>

            <Text style={styles.partyBody}>
              Hai bên cùng thống nhất ký kết hợp đồng điện tử này
              {categoryName ? ` cho dịch vụ “${categoryName}”` : ''} với các điều khoản sau:
            </Text>

            <Text style={styles.clauseTitle}>Điều 1. Phạm vi & quy chuẩn cung cấp dịch vụ</Text>
            <Text style={styles.clauseText}>
              1.1. Bên B cung cấp nền tảng đặt lịch trực tuyến và điều phối kỹ thuật viên đến địa
              chỉ Bên A đã đăng ký để thực hiện gói dịch vụ được chọn.{'\n'}
              1.2. Dịch vụ được thực hiện đúng nội dung, thời lượng và quy trình chuyên môn đã niêm
              yết công khai trên ứng dụng tại thời điểm đặt lịch.{'\n'}
              1.3. Kỹ thuật viên sử dụng dụng cụ, mỹ phẩm đạt tiêu chuẩn vệ sinh; Bên A được quyền
              yêu cầu kiểm tra nguồn gốc sản phẩm trước khi trị liệu.
            </Text>

            <Text style={styles.clauseTitle}>
              Điều 2. Biểu phí, giá cước và phương thức thanh toán
            </Text>
            <Text style={styles.clauseText}>
              2.1. Giá dịch vụ là giá niêm yết trên ứng dụng tại thời điểm đặt lịch, đã bao gồm phí
              di chuyển trong phạm vi phục vụ và các khoản giảm giá từ voucher hợp lệ (nếu có).
              {'\n'}
              2.2. Bên A thanh toán theo phương thức đã chọn tại đơn đặt lịch. Với hình thức thanh
              toán sau dịch vụ, Bên A thanh toán trực tiếp cho kỹ thuật viên ngay khi dịch vụ hoàn
              thành.{'\n'}
              2.3. Mọi phát sinh ngoài gói dịch vụ đã đặt phải được hai bên thống nhất và ghi nhận
              trên ứng dụng trước khi thực hiện.
            </Text>

            <Text style={styles.clauseTitle}>Điều 3. Quyền và nghĩa vụ của Khách hàng</Text>
            <Text style={styles.clauseText}>
              3.1. Cung cấp địa chỉ, số điện thoại chính xác và có mặt đúng khung giờ đã đặt.{'\n'}
              3.2. Đảm bảo không gian làm việc an toàn, vệ sinh, đủ ánh sáng và tôn trọng kỹ thuật
              viên trong suốt quá trình trị liệu.{'\n'}
              3.3. Thông báo trước các vấn đề sức khỏe, tiền sử dị ứng hoặc chống chỉ định có thể
              ảnh hưởng đến quá trình trị liệu.{'\n'}
              3.4. Nghiệm thu dịch vụ, thanh toán đầy đủ và có quyền đánh giá, phản ánh chất lượng
              trên ứng dụng.
            </Text>

            <Text style={styles.clauseTitle}>
              Điều 4. Quyền và nghĩa vụ của Kỹ thuật viên & Fixy
            </Text>
            <Text style={styles.clauseText}>
              4.1. Kỹ thuật viên có mặt đúng giờ, mang đầy đủ dụng cụ và thực hiện dịch vụ đúng
              chuyên môn nghiệp vụ đã được thẩm định.{'\n'}
              4.2. Fixy đảm bảo minh bạch giá cả, không thu thêm bất kỳ khoản phí nào ngoài nội dung
              hiển thị trên đơn đặt lịch.{'\n'}
              4.3. Fixy bảo mật thông tin cá nhân của Bên A theo Chính sách bảo mật, chỉ chia sẻ dữ
              liệu cần thiết cho kỹ thuật viên nhằm mục đích thực hiện dịch vụ.{'\n'}
              4.4. Bên B có quyền từ chối hoặc dừng dịch vụ nếu môi trường làm việc không an toàn
              hoặc Bên A có hành vi vi phạm chuẩn mực ứng xử.
            </Text>

            <Text style={styles.clauseTitle}>
              Điều 5. Hủy lịch, đổi lịch, bồi thường & khiếu nại
            </Text>
            <Text style={styles.clauseText}>
              5.1. Bên A được hủy hoặc đổi lịch miễn phí trước giờ hẹn theo chính sách hủy hiện hành
              của Fixy.{'\n'}
              5.2. Trường hợp hủy sát giờ hoặc kỹ thuật viên đã di chuyển đến địa điểm, Fixy có
              quyền thu một phần phí bù đắp theo quy định công bố trên ứng dụng.{'\n'}
              5.3. Nếu sự cố phát sinh do lỗi của kỹ thuật viên gây thiệt hại cho Bên A, Fixy phối
              hợp xử lý và bồi thường theo mức độ thiệt hại thực tế được hai bên xác nhận.{'\n'}
              5.4. Khiếu nại được tiếp nhận qua kênh hỗ trợ trong ứng dụng; hai bên ưu tiên thương
              lượng, hòa giải trước khi đưa vụ việc ra cơ quan có thẩm quyền.
            </Text>

            <Text style={styles.clauseTitle}>Điều 6. Giá trị pháp lý & hiệu lực hợp đồng</Text>
            <Text style={styles.clauseText}>
              6.1. Hợp đồng điện tử này có giá trị pháp lý tương đương hợp đồng bằng văn bản theo
              Luật Giao dịch điện tử số 20/2023/QH15.{'\n'}
              6.2. Thao tác xác nhận “Tôi đã đọc & đồng ý” của Bên A được ghi nhận là chữ ký điện tử
              thể hiện sự chấp thuận toàn bộ nội dung hợp đồng.{'\n'}
              6.3. Hợp đồng có hiệu lực kể từ thời điểm Bên A xác nhận đặt lịch thành công và chấm
              dứt khi dịch vụ được nghiệm thu, thanh toán đầy đủ.{'\n'}
              6.4. Nội dung hợp đồng được lưu trữ trên hệ thống Fixy; Bên A có thể tra cứu lại tại
              mục chi tiết đơn hàng bất kỳ lúc nào.
            </Text>
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.footer}>
            {!hasReadToEnd && (
              <View style={styles.readHintRow}>
                {/* <MaterialIcons name="arrow-downward" size={16} color="#D98A2B" />
                <Text style={styles.readHintText}>
                  Vui lòng cuộn đến cuối hợp đồng để có thể xác nhận đồng ý.
                </Text> */}
              </View>
            )}
            <Pressable
              style={[styles.acceptBtn, !hasReadToEnd && styles.acceptBtnDisabled]}
              onPress={onAccept}
              disabled={!hasReadToEnd}>
              <MaterialIcons name={hasReadToEnd ? 'verified' : 'lock'} size={18} color="#FFFFFF" />
              <Text style={styles.acceptBtnText}>Tôi đã đọc & đồng ý</Text>
            </Pressable>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const SCROLL_END_THRESHOLD = 24;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    maxHeight: '90%',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#EFECE6',
  },
  headerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#0F382C',
  },
  headerCode: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    marginTop: 2,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#F4F1EA',
  },
  scrollBody: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  nationalTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#1C2526',
    textAlign: 'center',
  },
  nationalMotto: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#1C2526',
    textAlign: 'center',
    marginTop: 2,
  },
  mottoUnderline: {
    alignSelf: 'center',
    width: 140,
    height: 1,
    backgroundColor: '#1C2526',
    marginTop: 4,
    marginBottom: 16,
  },
  docTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#0F382C',
    textAlign: 'center',
    lineHeight: 22,
  },
  docSubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 16,
  },
  partyTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#1C2526',
    marginTop: 12,
    marginBottom: 4,
  },
  partyBody: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 19,
  },
  clauseTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#1C2526',
    marginTop: 16,
    marginBottom: 6,
  },
  clauseText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 20,
  },
  footer: {
    borderTopWidth: 1,
    borderColor: '#EFECE6',
    paddingTop: 12,
    gap: 8,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F382C',
    paddingVertical: 14,
    borderRadius: 22,
  },
  acceptBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  readHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 10,
  },
  readHintText: {
    flex: 1,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#D98A2B',
    lineHeight: 18,
  },
  acceptBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#ffffff',
  },
  closeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  closeBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#818A91',
  },
});
