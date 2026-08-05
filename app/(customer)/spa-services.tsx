import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchSpaServiceCategories, SpaServiceCategory } from '@/services/api/spa-partners';

// Curated vector icon & color theme configurations for Spa categories matching reference Image 2
const CATEGORY_THEMES: Record<
  string,
  {
    iconName: string;
    family: 'MaterialIcons' | 'Ionicons' | 'FontAwesome5';
    iconColor: string;
    iconBg: string;
  }
> = {
  massage: {
    iconName: 'spa',
    family: 'MaterialIcons',
    iconColor: '#0F382C',
    iconBg: '#E6F0EB',
  },
  'cham-soc-da': {
    iconName: 'sparkles',
    family: 'Ionicons',
    iconColor: '#B45309',
    iconBg: '#FEF3C7',
  },
  'tri-lieu': {
    iconName: 'heartbeat',
    family: 'FontAwesome5',
    iconColor: '#80491E',
    iconBg: '#F5EBE1',
  },
  nail: {
    iconName: 'hand-sparkles',
    family: 'FontAwesome5',
    iconColor: '#BE185D',
    iconBg: '#FCE7F3',
  },
  toc: {
    iconName: 'content-cut',
    family: 'MaterialIcons',
    iconColor: '#4338CA',
    iconBg: '#E0E7FF',
  },
  wax: {
    iconName: 'leaf',
    family: 'Ionicons',
    iconColor: '#047857',
    iconBg: '#D1FAE5',
  },
  default: {
    iconName: 'storefront',
    family: 'MaterialIcons',
    iconColor: '#0F382C',
    iconBg: '#E6F0EB',
  },
};

function renderCategoryIcon(code: string) {
  const theme = CATEGORY_THEMES[code] || CATEGORY_THEMES['default'];
  if (theme.family === 'FontAwesome5') {
    return <FontAwesome5 name={theme.iconName as any} size={22} color={theme.iconColor} />;
  }
  if (theme.family === 'Ionicons') {
    return <Ionicons name={theme.iconName as any} size={24} color={theme.iconColor} />;
  }
  return <MaterialIcons name={theme.iconName as any} size={24} color={theme.iconColor} />;
}

export default function SpaServicesScreen() {
  const insets = useSafeAreaInsets();

  const {
    data: categories = [],
    isLoading,
    refetch,
  } = useQuery<SpaServiceCategory[]>({
    queryKey: ['spa-service-categories'],
    queryFn: fetchSpaServiceCategories,
    staleTime: 5 * 60 * 1000,
  });

  const handleCategoryPress = (category: SpaServiceCategory) => {
    router.push({
      pathname: '/(customer)/spa-list',
      params: {
        categoryId: category.id,
        categoryName: category.name,
      },
    } as any);
  };

  return (
    <View style={styles.screen}>
      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color="#0F382C" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Địa Điểm Spa</Text>
          <Text style={styles.headerSubtitle}>Trải nghiệm trực tiếp tại cửa hàng</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Top Banner with Embedded Image */}
        <View style={styles.bannerCard}>
          <Image
            source={require('@/assets/DIA DIEM SPA.webp')}
            style={styles.bannerBgImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={[
              'rgba(148, 88, 36, 0.96)',
              'rgba(148, 88, 36, 0.88)',
              'rgba(148, 88, 36, 0.60)',
              'rgba(148, 88, 36, 0.15)',
              'rgba(148, 88, 36, 0.0)',
            ]}
            locations={[0, 0.35, 0.6, 0.85, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.bannerContent}>
            <View style={styles.bannerTagPill}>
              <MaterialIcons name="verified" size={12} color="#FFFFFF" />
              <Text style={styles.bannerTagPillText}>ĐƯỢC XÁC THỰC BỞI FIXY</Text>
            </View>
            <Text style={styles.bannerTitle}>Địa điểm spa</Text>
            <Text style={styles.bannerSubtitle}>
              Trải nghiệm dịch vụ trực tiếp tại cửa hàng
            </Text>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Danh Mục Dịch Vụ</Text>
        </View>

        {/* Category List - Each Category is an Individual Card matching Image 2 */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0F382C" />
            <Text style={styles.loadingText}>Đang tải danh mục dịch vụ...</Text>
          </View>
        ) : categories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="storefront" size={44} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Chưa có danh mục dịch vụ</Text>
            <Pressable style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryBtnText}>Tải lại</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.categoryList}>
            {categories.map((cat) => {
              const theme = CATEGORY_THEMES[cat.code] || CATEGORY_THEMES['default'];

              return (
                <Pressable
                  key={cat.id}
                  style={({ pressed }) => [
                    styles.individualCategoryCard,
                    pressed && styles.individualCategoryCardPressed,
                  ]}
                  onPress={() => handleCategoryPress(cat)}>
                  {/* Left Icon Container */}
                  <View style={[styles.iconBadge, { backgroundColor: theme.iconBg }]}>
                    {cat.imageUrl ? (
                      <Image
                        source={{ uri: cat.imageUrl }}
                        style={styles.categoryImage}
                        resizeMode="cover"
                      />
                    ) : (
                      renderCategoryIcon(cat.code)
                    )}
                  </View>

                  {/* Middle Content */}
                  <View style={styles.categoryMainContent}>
                    <Text style={styles.categoryName}>{cat.name}</Text>
                    {cat.description && (
                      <Text style={styles.categoryDescription} numberOfLines={2}>
                        {cat.description}
                      </Text>
                    )}
                  </View>

                  {/* Right Circle Arrow Button matching Pastel Icon Theme */}
                  <View style={[styles.arrowCircle, { backgroundColor: theme.iconBg }]}>
                    <MaterialIcons name="arrow-forward" size={16} color="#0F382C" />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9F8F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE6',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F4F1EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
    color: '#0F382C',
  },
  headerSubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // Banner matching Home Page Banner Card
  bannerCard: {
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
    elevation: 3,
    shadowColor: '#80491E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  bannerBgImage: {
    width: '100%',
    height: '100%',
  },
  bannerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 18,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  bannerTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  bannerTagPillText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 16,
  },

  // Section Header
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
    color: '#0F382C',
  },

  // List of Individual Category Cards matching Image 2
  categoryList: {
    gap: 12,
  },
  individualCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
    elevation: 2,
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  individualCategoryCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  iconBadge: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryImage: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  categoryMainContent: {
    flex: 1,
    marginRight: 8,
  },
  categoryName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#0F382C',
    marginBottom: 3,
  },
  categoryDescription: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  arrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Loading & Empty
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: '#818A91',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#1C2526',
    marginTop: 12,
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: '#0F382C',
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 14,
  },
  retryBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
});
