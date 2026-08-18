import { MaterialIcons, Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchSpaServiceCategories, SpaServiceCategory } from '@/services/api/spa-partners';

// Curated theme palette, icons & tags for Spa categories
const CATEGORY_THEMES: Record<
  string,
  {
    iconName: string;
    family: 'MaterialIcons' | 'Ionicons' | 'FontAwesome5' | 'Feather';
    iconColor: string;
    iconBg: string;
    badgeText: string;
  }
> = {
  massage: {
    iconName: 'spa',
    family: 'MaterialIcons',
    iconColor: '#0F382C',
    iconBg: '#E6F0EB',
    badgeText: 'Thư giãn & Phục hồi',
  },
  'cham-soc-da': {
    iconName: 'sparkles',
    family: 'Ionicons',
    iconColor: '#B45309',
    iconBg: '#FEF3C7',
    badgeText: 'Chăm sóc da chuyên sâu',
  },
  'tri-lieu': {
    iconName: 'heartbeat',
    family: 'FontAwesome5',
    iconColor: '#80491E',
    iconBg: '#F5EBE1',
    badgeText: 'Trị liệu Cổ Vai Gáy',
  },
  nail: {
    iconName: 'hand-sparkles',
    family: 'FontAwesome5',
    iconColor: '#BE185D',
    iconBg: '#FCE7F3',
    badgeText: 'Nail & Care',
  },
  toc: {
    iconName: 'content-cut',
    family: 'MaterialIcons',
    iconColor: '#4338CA',
    iconBg: '#E0E7FF',
    badgeText: 'Gội đầu Dưỡng sinh',
  },
  wax: {
    iconName: 'leaf',
    family: 'Ionicons',
    iconColor: '#047857',
    iconBg: '#D1FAE5',
    badgeText: 'Waxing & Mịn da',
  },
  default: {
    iconName: 'storefront',
    family: 'MaterialIcons',
    iconColor: '#0F382C',
    iconBg: '#E6F0EB',
    badgeText: 'Dịch vụ Spa Hot',
  },
};

const FILTER_TAGS = ['Tất cả', 'Thư giãn', 'Sức khỏe', 'Chăm sóc da', 'Làm đẹp'];

function renderCategoryIcon(code: string, size = 26) {
  const theme = CATEGORY_THEMES[code] || CATEGORY_THEMES['default'];
  if (theme.family === 'FontAwesome5') {
    return <FontAwesome5 name={theme.iconName as any} size={size} color={theme.iconColor} />;
  }
  if (theme.family === 'Ionicons') {
    return <Ionicons name={theme.iconName as any} size={size + 2} color={theme.iconColor} />;
  }
  if (theme.family === 'Feather') {
    return <Feather name={theme.iconName as any} size={size + 2} color={theme.iconColor} />;
  }
  return <MaterialIcons name={theme.iconName as any} size={size + 2} color={theme.iconColor} />;
}

export default function SpaServicesScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedTag, setSelectedTag] = React.useState('Tất cả');
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list');

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

  const handleAllSpasPress = () => {
    router.push({
      pathname: '/(customer)/spa-list',
    } as any);
  };

  // Filter logic based on search and tags
  const filteredCategories = React.useMemo(() => {
    return categories.filter((cat) => {
      const matchesSearch =
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedTag === 'Tất cả') return true;
      if (selectedTag === 'Thư giãn') return cat.code === 'massage' || cat.code === 'toc';
      if (selectedTag === 'Sức khỏe') return cat.code === 'tri-lieu' || cat.code === 'massage';
      if (selectedTag === 'Chăm sóc da') return cat.code === 'cham-soc-da';
      if (selectedTag === 'Làm đẹp') return cat.code === 'nail' || cat.code === 'wax';

      return true;
    });
  }, [categories, searchQuery, selectedTag]);

  return (
    <View style={styles.screen}>
      {/* Top Header Bar */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerTopRow}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed ? styles.btnPressed : null]}
            onPress={() => router.back()}>
            <MaterialIcons name="arrow-back-ios-new" size={18} color="#0F382C" />
          </Pressable>

          <View style={styles.headerTitleCenter}>
            <Text style={styles.headerTitleText}>Địa Điểm Spa</Text>
            <View style={styles.headerStatusRow}>
              <View style={styles.activeDot} />
              <Text style={styles.headerSubtitleText}>Trải nghiệm trực tiếp tại cửa hàng</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.allSpasHeaderBtn, pressed ? styles.btnPressed : null]}
            onPress={handleAllSpasPress}>
            <MaterialIcons name="storefront" size={20} color="#0F382C" />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarWrapper}>
          <MaterialIcons name="search" size={22} color="#818A91" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm dịch vụ spa, massage, trị liệu..."
            placeholderTextColor="#9EA5AC"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8} style={styles.clearSearchBtn}>
              <MaterialIcons name="cancel" size={20} color="#9EA5AC" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Luxury Hero Banner */}
        <View style={styles.bannerCard}>
          <Image
            source={require('@/assets/DIA DIEM SPA.webp')}
            style={styles.bannerBgImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={[
              'rgba(15, 56, 44, 0.95)',
              'rgba(15, 56, 44, 0.82)',
              'rgba(15, 56, 44, 0.45)',
              'rgba(15, 56, 44, 0.10)',
              'rgba(15, 56, 44, 0.0)',
            ]}
            locations={[0, 0.35, 0.65, 0.88, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.bannerContent}>
            <View style={styles.bannerBadgeRow}>
              <View style={styles.bannerTagPill}>
                <MaterialIcons name="verified" size={14} color="#F59E0B" />
                <Text style={styles.bannerTagPillText}>FIXY VERIFIED SPA</Text>
              </View>
              <View style={styles.promoRibbon}>
                <MaterialIcons name="bolt" size={13} color="#FFFFFF" />
                <Text style={styles.promoRibbonText}>GIỜ VÀNG -50%</Text>
              </View>
            </View>

            <Text style={styles.bannerTitle}>Không Gian Spa Đẳng Cấp</Text>
            <Text style={styles.bannerSubtitle}>
              Thư giãn tuyệt đối với đội ngũ kỹ thuật viên tay nghề cao & không gian tiêu chuẩn 5 sao
            </Text>

            {/* Quick Stats Bar */}
            <View style={styles.bannerStatsBar}>
              <View style={styles.statItem}>
                <MaterialIcons name="star" size={15} color="#F59E0B" />
                <Text style={styles.statText}>4.9/5 (2.4k+)</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialIcons name="place" size={15} color="#34D399" />
                <Text style={styles.statText}>100+ Cửa hàng</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialIcons name="speed" size={15} color="#60A5FA" />
                <Text style={styles.statText}>Đặt nhanh 30s</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Perks Row */}
        <View style={styles.perksRow}>
          <View style={styles.perkCard}>
            <View style={[styles.perkIconBg, { backgroundColor: '#E6F0EB' }]}>
              <MaterialIcons name="verified-user" size={20} color="#0F382C" />
            </View>
            <View style={styles.perkTextContainer}>
              <Text style={styles.perkTitle}>100% Xác thực</Text>
              <Text style={styles.perkDesc}>Không gian chuẩn 5★</Text>
            </View>
          </View>

          <View style={styles.perkCard}>
            <View style={[styles.perkIconBg, { backgroundColor: '#FEF3C7' }]}>
              <MaterialIcons name="local-offer" size={20} color="#B45309" />
            </View>
            <View style={styles.perkTextContainer}>
              <Text style={styles.perkTitle}>Giá niêm yết</Text>
              <Text style={styles.perkDesc}>Cam kết không ẩn phí</Text>
            </View>
          </View>
        </View>

        {/* Section Header Controls */}
        <View style={styles.sectionControlHeader}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionTitle}>Danh Mục Dịch Vụ</Text>
            <Text style={styles.sectionSubtitle}>
              {filteredCategories.length} nhóm dịch vụ sẵn có
            </Text>
          </View>

          {/* List vs Grid Layout Toggle */}
          <View style={styles.viewToggleContainer}>
            <Pressable
              style={[styles.toggleBtn, viewMode === 'list' ? styles.toggleBtnActive : null]}
              onPress={() => setViewMode('list')}>
              <MaterialIcons
                name="format-list-bulleted"
                size={20}
                color={viewMode === 'list' ? '#0F382C' : '#9EA5AC'}
              />
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, viewMode === 'grid' ? styles.toggleBtnActive : null]}
              onPress={() => setViewMode('grid')}>
              <MaterialIcons
                name="grid-view"
                size={20}
                color={viewMode === 'grid' ? '#0F382C' : '#9EA5AC'}
              />
            </Pressable>
          </View>
        </View>

        {/* Horizontal Category Tag Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTagsContainer}>
          {FILTER_TAGS.map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <Pressable
                key={tag}
                style={[styles.tagPill, isSelected ? styles.tagPillActive : null]}
                onPress={() => setSelectedTag(tag)}>
                <Text style={[styles.tagPillText, isSelected ? styles.tagPillTextActive : null]}>
                  {tag}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Category Content List / Grid */}
        {isLoading ? (
          <View style={styles.skeletonWrapper}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.skeletonCard}>
                <View style={styles.skeletonIcon} />
                <View style={styles.skeletonTextContent}>
                  <View style={styles.skeletonTitle} />
                  <View style={styles.skeletonDesc} />
                </View>
              </View>
            ))}
          </View>
        ) : filteredCategories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <MaterialIcons name="search-off" size={40} color="#0F382C" />
            </View>
            <Text style={styles.emptyTitle}>Không tìm thấy danh mục phù hợp</Text>
            <Text style={styles.emptySubtitle}>
              Thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc khác
            </Text>
            <Pressable
              style={styles.retryBtn}
              onPress={() => {
                setSearchQuery('');
                setSelectedTag('Tất cả');
                refetch();
              }}>
              <MaterialIcons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Đặt lại tìm kiếm</Text>
            </Pressable>
          </View>
        ) : viewMode === 'list' ? (
          /* LIST VIEW - Larger Typography & Spacious Layout */
          <View style={styles.categoryListContainer}>
            {filteredCategories.map((cat) => {
              const theme = CATEGORY_THEMES[cat.code] || CATEGORY_THEMES['default'];

              return (
                <View key={cat.id} style={styles.cardOuterBox}>
                  <Pressable
                    style={({ pressed }) => [pressed ? styles.cardPressedState : null]}
                    onPress={() => handleCategoryPress(cat)}>
                    <View style={styles.cardRowInner}>
                      {/* Left Icon Badge */}
                      <View style={[styles.cardLeftIconBox, { backgroundColor: theme.iconBg }]}>
                        {cat.imageUrl ? (
                          <Image
                            source={{ uri: cat.imageUrl }}
                            style={styles.categoryImage}
                            resizeMode="cover"
                          />
                        ) : (
                          renderCategoryIcon(cat.code, 26)
                        )}
                      </View>

                      {/* Middle Content Column */}
                      <View style={styles.cardCenterContent}>
                        <View style={styles.cardTitleRow}>
                          <Text style={styles.categoryNameText} numberOfLines={1}>
                            {cat.name}
                          </Text>
                          <View style={[styles.badgePill, { backgroundColor: theme.iconBg }]}>
                            <Text style={[styles.badgePillText, { color: theme.iconColor }]}>
                              {theme.badgeText}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.categoryDescText} numberOfLines={2}>
                          {cat.description || 'Dịch vụ chăm sóc spa chuyên nghiệp & trải nghiệm thư thái.'}
                        </Text>

                        <View style={styles.categoryMetaRow}>
                          <View style={styles.metaItem}>
                            <MaterialIcons name="place" size={14} color="#0F382C" />
                            <Text style={styles.metaText}>
                              {cat.spaCount > 0 ? `${cat.spaCount} Địa điểm` : 'Nhiều địa điểm'}
                            </Text>
                          </View>
                          <View style={styles.dotSeparator} />
                          <View style={styles.metaItem}>
                            <MaterialIcons name="thumb-up" size={13} color="#F59E0B" />
                            <Text style={styles.metaText}>Đánh giá cao</Text>
                          </View>
                        </View>
                      </View>

                      {/* Right Action Arrow Circle */}
                      <View style={[styles.cardRightArrowCircle, { backgroundColor: theme.iconBg }]}>
                        <MaterialIcons name="chevron-right" size={22} color={theme.iconColor} />
                      </View>
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : (
          /* GRID VIEW - Larger & More Spacious Cards */
          <View style={styles.categoryGridContainer}>
            {filteredCategories.map((cat) => {
              const theme = CATEGORY_THEMES[cat.code] || CATEGORY_THEMES['default'];

              return (
                <View key={cat.id} style={styles.gridOuterBox}>
                  <Pressable
                    style={({ pressed }) => [pressed ? styles.cardPressedState : null]}
                    onPress={() => handleCategoryPress(cat)}>
                    <View style={styles.gridInnerContent}>
                      <View style={[styles.gridIconHeader, { backgroundColor: theme.iconBg }]}>
                        {cat.imageUrl ? (
                          <Image
                            source={{ uri: cat.imageUrl }}
                            style={styles.gridCategoryImage}
                            resizeMode="cover"
                          />
                        ) : (
                          renderCategoryIcon(cat.code, 28)
                        )}
                      </View>

                      <Text style={styles.gridCategoryName} numberOfLines={1}>
                        {cat.name}
                      </Text>
                      <Text style={styles.gridBadgeText} numberOfLines={1}>
                        {theme.badgeText}
                      </Text>

                      <View style={styles.gridFooter}>
                        <Text style={styles.gridSpaCount}>
                          {cat.spaCount > 0 ? `${cat.spaCount} Spa` : 'Đặt ngay'}
                        </Text>
                        <View style={[styles.gridArrowBtn, { backgroundColor: theme.iconBg }]}>
                          <MaterialIcons name="chevron-right" size={18} color={theme.iconColor} />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* Direct Action Banner to See All Spas */}
        <View style={styles.exploreOuterBox}>
          <Pressable
            style={({ pressed }) => [pressed ? styles.btnPressed : null]}
            onPress={handleAllSpasPress}>
            <LinearGradient
              colors={['#0F382C', '#1B5E4B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.exploreGradient}>
              <View style={styles.exploreContent}>
                <View style={styles.exploreTextGroup}>
                  <Text style={styles.exploreTitle}>Xem Tất Cả Địa Điểm Spa</Text>
                  <Text style={styles.exploreSubtitle}>
                    Khám phá toàn bộ danh sách Spa & Salon quanh khu vực bạn
                  </Text>
                </View>
                <View style={styles.exploreBtnCircle}>
                  <MaterialIcons name="arrow-forward" size={20} color="#0F382C" />
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={{ height: 45 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9F8F5',
  },
  btnPressed: {
    opacity: 0.88,
  },

  // Dynamic Header
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F4F1EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleCenter: {
    alignItems: 'center',
  },
  headerTitleText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#0F382C',
    letterSpacing: -0.2,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 5,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  headerSubtitleText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#818A91',
  },
  allSpasHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F0EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search Input Bar
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F1EA',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#0F382C',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 2,
  },

  scrollContent: {
    padding: 16,
    paddingTop: 16,
  },

  // Luxury Banner
  bannerCard: {
    minHeight: 170,
    backgroundColor: '#0F382C',
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 18,
    position: 'relative',
    elevation: 4,
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  bannerBgImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  bannerContent: {
    padding: 20,
    justifyContent: 'space-between',
  },
  bannerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  bannerTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  bannerTagPillText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  promoRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EF4444',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  promoRibbonText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  bannerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: 5,
    letterSpacing: -0.3,
  },
  bannerSubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.92)',
    lineHeight: 18,
    marginBottom: 16,
  },

  // Stats bar inside banner
  bannerStatsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 12,
  },

  // Perks / Features Row
  perksRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  perkCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFECE6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  perkIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  perkTextContainer: {
    flex: 1,
  },
  perkTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#0F382C',
  },
  perkDesc: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
    marginTop: 1,
  },

  // Section Header Controls
  sectionControlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
    paddingVertical: 4,
  },
  sectionTitleBox: {
    flex: 1,
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 20,
    lineHeight: 26,
    color: '#0F382C',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12.5,
    lineHeight: 17,
    color: '#818A91',
    marginTop: 2,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#EFECE6',
    borderRadius: 12,
    padding: 4,
    gap: 3,
    marginLeft: 8,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },

  // Horizontal Filter Chips
  filterTagsContainer: {
    gap: 10,
    paddingBottom: 18,
  },
  tagPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  tagPillActive: {
    backgroundColor: '#0F382C',
    borderColor: '#0F382C',
  },
  tagPillText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#6B7280',
  },
  tagPillTextActive: {
    color: '#FFFFFF',
  },

  // Larger List View Layout
  categoryListContainer: {
    gap: 14,
    width: '100%',
  },
  cardOuterBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EFECE6',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    width: '100%',
  },
  cardPressedState: {
    backgroundColor: '#F4F1EA',
  },
  cardLeftIconBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  categoryImage: {
    width: 32,
    height: 32,
    borderRadius: 10,
  },
  cardCenterContent: {
    flex: 1,
    marginRight: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  categoryNameText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16.5,
    lineHeight: 22,
    color: '#0F382C',
    flexShrink: 1,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
  },
  badgePillText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 10.5,
  },
  categoryDescText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18.5,
    marginBottom: 6,
  },
  categoryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#6B7280',
  },
  dotSeparator: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  cardRightArrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Larger Grid View Layout
  categoryGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    width: '100%',
  },
  gridOuterBox: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EFECE6',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  gridInnerContent: {
    padding: 15,
    width: '100%',
  },
  gridIconHeader: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridCategoryImage: {
    width: 30,
    height: 30,
    borderRadius: 8,
  },
  gridCategoryName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16.5,
    lineHeight: 21,
    color: '#0F382C',
    marginBottom: 3,
  },
  gridBadgeText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11.5,
    color: '#818A91',
    marginBottom: 14,
  },
  gridFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridSpaCount: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12.5,
    color: '#0F382C',
  },
  gridArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Bottom Banner
  exploreOuterBox: {
    marginTop: 26,
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  explorePressable: {
    width: '100%',
  },
  exploreGradient: {
    padding: 18,
  },
  exploreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exploreTextGroup: {
    flex: 1,
    paddingRight: 12,
  },
  exploreTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16.5,
    color: '#FFFFFF',
    marginBottom: 3,
  },
  exploreSubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.88)',
  },
  exploreBtnCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Loading Skeleton
  skeletonWrapper: {
    gap: 14,
  },
  skeletonCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  skeletonIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#EFECE6',
    marginRight: 14,
  },
  skeletonTextContent: {
    flex: 1,
    gap: 10,
  },
  skeletonTitle: {
    width: '50%',
    height: 16,
    backgroundColor: '#EFECE6',
    borderRadius: 4,
  },
  skeletonDesc: {
    width: '80%',
    height: 12,
    backgroundColor: '#F4F1EA',
    borderRadius: 4,
  },

  // Empty Search State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 44,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EFECE6',
    marginVertical: 10,
  },
  emptyIconBg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E6F0EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#0F382C',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F382C',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 14,
  },
  retryBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
});
