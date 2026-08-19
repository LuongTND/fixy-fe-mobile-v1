import { MaterialIcons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import * as React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const OVAL_WIDTH = Math.min(SCREEN_WIDTH * 0.72, 280);
const OVAL_HEIGHT = OVAL_WIDTH * 1.35;

interface FaceCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (photoUri: string) => void;
}

export function FaceCaptureModal({ visible, onClose, onCapture }: FaceCaptureModalProps) {
  const [hasPermission, setHasPermission] = React.useState<boolean | null>(null);
  const [facing, setFacing] = React.useState<'front' | 'back'>('front');
  const [capturedUri, setCapturedUri] = React.useState<string | null>(null);
  const [isCapturing, setIsCapturing] = React.useState(false);
  const cameraRef = React.useRef<CameraView | null>(null);

  const requestPermission = React.useCallback(async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (err) {
      console.warn('[FaceCaptureModal] Camera permission error:', err);
      setHasPermission(false);
    }
  }, []);

  React.useEffect(() => {
    if (visible) {
      setCapturedUri(null);
      setIsCapturing(false);
      (async () => {
        try {
          const { status } = await Camera.getCameraPermissionsAsync();
          if (status === 'granted') {
            setHasPermission(true);
          } else {
            const req = await Camera.requestCameraPermissionsAsync();
            setHasPermission(req.status === 'granted');
          }
        } catch {
          requestPermission();
        }
      })();
    }
  }, [visible, requestPermission]);

  const handleTakePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: Platform.OS === 'android',
      });
      if (photo?.uri) {
        setCapturedUri(photo.uri);
      }
    } catch (err) {
      console.warn('[FaceCaptureModal] Take photo error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleConfirmPhoto = () => {
    if (capturedUri) {
      onCapture(capturedUri);
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedUri(null);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Permission check */}
        {!hasPermission ? (
          <View style={styles.permissionContainer}>
            <View style={styles.permissionIconCircle}>
              <MaterialIcons name="camera-alt" size={48} color="#0F382C" />
            </View>
            <Text style={styles.permissionTitle}>Cần quyền truy cập Camera</Text>
            <Text style={styles.permissionDesc}>
              Ứng dụng cần quyền mở camera để chụp ảnh chân dung xác thực khuôn mặt định danh cho kỹ thuật viên.
            </Text>
            <Pressable style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Cấp quyền Camera</Text>
            </Pressable>
            <Pressable style={styles.cancelLinkBtn} onPress={onClose}>
              <Text style={styles.cancelLinkText}>Quay lại</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            {/* If captured, show Preview */}
            {capturedUri ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="cover" />

                {/* Oval Guide Overlay on Preview */}
                <View style={styles.overlayContainer} pointerEvents="none">
                  <View style={styles.ovalMask} />
                </View>

                {/* Preview Header */}
                <View style={styles.topBar}>
                  <Text style={styles.topBarTitle}>Kiểm tra ảnh chụp</Text>
                  <Pressable style={styles.closeBtn} onPress={onClose}>
                    <MaterialIcons name="close" size={24} color="#ffffff" />
                  </Pressable>
                </View>

                {/* Preview Bottom Action Buttons */}
                <View style={styles.previewBottomBar}>
                  <Text style={styles.previewHint}>
                    Đảm bảo khuôn mặt rõ nét, không bị lóa sáng hay rung mờ trước khi xác nhận.
                  </Text>
                  <View style={styles.previewBtnRow}>
                    <Pressable style={styles.retakeBtn} onPress={handleRetake}>
                      <MaterialIcons name="replay" size={20} color="#383838" />
                      <Text style={styles.retakeBtnText}>Chụp lại</Text>
                    </Pressable>

                    <Pressable style={styles.confirmBtn} onPress={handleConfirmPhoto}>
                      <MaterialIcons name="check" size={20} color="#ffffff" />
                      <Text style={styles.confirmBtnText}>Sử dụng ảnh này</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : (
              // Live Camera View
              <View style={styles.cameraInner}>
                <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFillObject}
                  facing={facing}
                  mirror={facing === 'front'}
                  enableTorch={false}
                />

                {/* Dark Overlay with Oval Cutout */}
                <View style={styles.overlayContainer} pointerEvents="none">
                  {/* Top dark area */}
                  <View style={styles.maskTop} />

                  {/* Middle row with Oval */}
                  <View style={styles.maskMiddleRow}>
                    <View style={styles.maskSide} />
                    <View style={styles.ovalFrame}>
                      {/* Corner markers inside oval */}
                      <View style={styles.ovalCornerTop} />
                      <View style={styles.ovalCornerBottom} />
                    </View>
                    <View style={styles.maskSide} />
                  </View>

                  {/* Bottom dark area */}
                  <View style={styles.maskBottom} />
                </View>

                {/* Top Controls Bar */}
                <View style={styles.topBar}>
                  <Pressable style={styles.closeBtn} onPress={onClose}>
                    <MaterialIcons name="close" size={24} color="#ffffff" />
                  </Pressable>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>Xác thực khuôn mặt</Text>
                  </View>
                  <Pressable
                    style={styles.switchCamBtn}
                    onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}>
                    <MaterialIcons name="flip-camera-ios" size={24} color="#ffffff" />
                  </Pressable>
                </View>

                {/* Center Instructions */}
                <View style={styles.instructionBox}>
                  <Text style={styles.instructionMainText}>
                    Căn chỉnh khuôn mặt vào giữa khung tròn
                  </Text>
                  <Text style={styles.instructionSubText}>
                    Giữ điện thoại thẳng mặt, đủ ánh sáng và không đeo kính râm
                  </Text>
                </View>

                {/* Bottom Controls Bar */}
                <View style={styles.bottomBar}>
                  <Pressable
                    style={[styles.captureBtn, isCapturing && styles.captureBtnDisabled]}
                    onPress={handleTakePhoto}
                    disabled={isCapturing}>
                    {isCapturing ? (
                      <ActivityIndicator size="small" color="#0F382C" />
                    ) : (
                      <View style={styles.captureBtnInner} />
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
  cameraInner: {
    flex: 1,
    position: 'relative',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maskTop: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  maskMiddleRow: {
    flexDirection: 'row',
    height: OVAL_HEIGHT,
    alignItems: 'center',
  },
  maskSide: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  ovalFrame: {
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    borderRadius: OVAL_WIDTH / 2,
    borderWidth: 3,
    borderColor: '#4ADE80',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
  },
  ovalMask: {
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    borderRadius: OVAL_WIDTH / 2,
    borderWidth: 3,
    borderColor: '#4ADE80',
    backgroundColor: 'transparent',
  },
  ovalCornerTop: {
    position: 'absolute',
    top: 20,
    left: '50%',
    marginLeft: -25,
    width: 50,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 2,
  },
  ovalCornerBottom: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    marginLeft: -25,
    width: 50,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 2,
  },
  maskBottom: {
    flex: 1.4,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 12 : 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchCamBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 56, 44, 0.85)',
  },
  stepBadgeText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#ffffff',
  },
  topBarTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#ffffff',
  },
  instructionBox: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 70 : 80,
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 20,
  },
  instructionMainText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  instructionSubText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#D1D5DB',
    textAlign: 'center',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 36,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#ffffff',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnDisabled: {
    opacity: 0.6,
  },
  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
  },
  previewContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  previewBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
    gap: 14,
    zIndex: 20,
  },
  previewHint: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#E5E7EB',
    textAlign: 'center',
  },
  previewBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  retakeBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  retakeBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#383838',
  },
  confirmBtn: {
    flex: 1.4,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0F382C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#ffffff',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#fbf9f8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  permissionIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  permissionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#1b1c1c',
    textAlign: 'center',
  },
  permissionDesc: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionBtn: {
    height: 48,
    width: '100%',
    backgroundColor: '#0F382C',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  permissionBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#ffffff',
  },
  cancelLinkBtn: {
    paddingVertical: 8,
  },
  cancelLinkText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#6B7280',
  },
});
