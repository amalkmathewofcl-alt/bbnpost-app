import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  StyleSheet, Text, View, FlatList, Image, TouchableOpacity, 
  RefreshControl, StatusBar, ScrollView, Dimensions, Animated 
} from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fetchArticles, Article } from './services/feed';
import ArticleScreen from './ArticleScreen';
import SettingsScreen from './SettingsScreen';
import SavedScreen from './SavedScreen';
import { ThemeProvider, useTheme } from './ThemeContext';
import { BookmarkProvider } from './BookmarkContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const Skeleton = ({ width, height, borderRadius, colors }: any) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={{ width, height, borderRadius, backgroundColor: colors.border, opacity, marginBottom: 12 }} />;
};

function HomeScreen({ navigation }: any) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [categories, setCategories] = useState<string[]>(['All']);
  const [newArticleAlert, setNewArticleAlert] = useState<Article | null>(null);
  
  const { colors, isDark } = useTheme();
  const bannerTranslateY = useRef(new Animated.Value(-100)).current;

  const loadData = async () => {
    try {
      const data = await fetchArticles();
      
      // Check for Breaking News!
      if (articles.length > 0 && data.length > 0 && articles[0].id !== data[0].id) {
        setNewArticleAlert(data[0]);
        showBanner();
      }

      setArticles(data);
      const uniqueCats = new Set<string>();
      data.forEach(article => article.categories.forEach(cat => uniqueCats.add(cat)));
      setCategories(['All', ...Array.from(uniqueCats)]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const showBanner = () => {
    Animated.spring(bannerTranslateY, { toValue: 0, useNativeDriver: true }).start();
    // Auto hide after 5 seconds
    setTimeout(() => {
      Animated.timing(bannerTranslateY, { toValue: -100, duration: 300, useNativeDriver: true }).start(() => setNewArticleAlert(null));
    }, 5000);
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [articles]);

  const filteredArticles = activeCategory === 'All' ? articles : articles.filter(a => a.categories.includes(activeCategory));
  const featuredArticle = filteredArticles.length > 0 ? filteredArticles[0] : null;
  const carouselArticles = filteredArticles.slice(1, 6); 
  const gridArticles = filteredArticles.slice(6);

  const renderHeader = () => {
    if (!featuredArticle) return null;
    return (
      <View>
        <TouchableOpacity style={styles.featuredCard} activeOpacity={0.9} onPress={() => navigation.navigate('Article', { article: featuredArticle })}>
          <Image source={{ uri: featuredArticle.imageUrl || 'https://via.placeholder.com/600x400' }} style={styles.featuredImage} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.featuredOverlay}>
            <Text style={styles.featuredCategory}>{featuredArticle.categories[0] || 'BREAKING'}</Text>
            <Text style={styles.featuredTitle} numberOfLines={3}>{featuredArticle.title}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Stories</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={carouselArticles}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingRight: 16, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.carouselCard} onPress={() => navigation.navigate('Article', { article: item })}>
              <Image source={{ uri: item.imageUrl || 'https://via.placeholder.com/200' }} style={styles.carouselImage} />
              <Text style={[styles.carouselTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
            </TouchableOpacity>
          )}
        />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Latest News</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* 🟢 CUSTOM BREAKING NEWS BANNER */}
      {newArticleAlert && (
        <Animated.View style={[styles.banner, { transform: [{ translateY: bannerTranslateY }], backgroundColor: colors.primary }]}>
          <Ionicons name="notifications" size={20} color="#fff" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.bannerTitle}>Breaking News</Text>
            <Text style={styles.bannerText} numberOfLines={1}>{newArticleAlert.title}</Text>
          </View>
        </Animated.View>
      )}

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.masthead, { color: colors.text }]}>THE BBN POST</Text>
      </View>

      <View style={[styles.tickerContainer, { backgroundColor: colors.primary }]}>
        <Text style={styles.tickerLabel}>LATEST</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
          <Text style={styles.tickerText}>• {featuredArticle?.title || 'Loading latest headlines...'}</Text>
        </ScrollView>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map(cat => (
            <TouchableOpacity key={cat} onPress={() => setActiveCategory(cat)} style={[styles.categoryPill, { backgroundColor: colors.card }, activeCategory === cat && { backgroundColor: colors.primary }]}>
              <Text style={[styles.categoryText, activeCategory === cat ? { color: '#fff' } : { color: colors.text }]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {loading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Skeleton width="100%" height={280} borderRadius={20} colors={colors} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
            <Skeleton width={CARD_WIDTH} height={200} borderRadius={16} colors={colors} />
            <Skeleton width={CARD_WIDTH} height={200} borderRadius={16} colors={colors} />
          </View>
        </View>
      ) : (
        <FlatList
          data={gridArticles}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          ListHeaderComponent={renderHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.gridCard, { backgroundColor: colors.card }]} activeOpacity={0.8} onPress={() => navigation.navigate('Article', { article: item })}>
              {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.gridImage} /> : <View style={[styles.gridImage, { backgroundColor: colors.border }]} />}
              <View style={styles.gridTextContainer}>
                <Text style={[styles.gridCategory, { color: colors.primary }]} numberOfLines={1}>{item.categories[0] || 'NEWS'}</Text>
                <Text style={[styles.gridTitle, { color: colors.text }]} numberOfLines={3}>{item.title}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 65, paddingBottom: 10, paddingTop: 5 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subText,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Saved') iconName = focused ? 'bookmark' : 'bookmark-outline';
          else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Saved" component={SavedScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function MainApp() {
  const { isDark } = useTheme();
  return (
    <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={MainTabs} />
        <Stack.Screen name="Article" component={ArticleScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BookmarkProvider>
        <MainApp />
      </BookmarkProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  header: { paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, alignItems: 'center' },
  masthead: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  
  banner: { position: 'absolute', top: 40, left: 16, right: 16, padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', zIndex: 999, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  bannerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  bannerText: { color: '#fff', fontSize: 12 },

  tickerContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  tickerLabel: { color: '#fff', fontWeight: '900', fontSize: 11, marginRight: 10, letterSpacing: 1 },
  tickerText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  categoryScroll: { paddingHorizontal: 16, paddingVertical: 15 },
  categoryPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
  categoryText: { fontSize: 13, fontWeight: '700' },
  
  featuredCard: { width: '100%', height: 280, marginBottom: 20, borderRadius: 20, overflow: 'hidden' },
  featuredImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  featuredOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingTop: 80 },
  featuredCategory: { color: '#ff3b30', fontWeight: '900', fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  featuredTitle: { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 28 },

  sectionTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12, letterSpacing: -0.5 },
  
  carouselCard: { width: 160, marginRight: 16 },
  carouselImage: { width: '100%', height: 100, borderRadius: 12, marginBottom: 8 },
  carouselTitle: { fontSize: 14, fontWeight: '700', lineHeight: 18 },

  row: { justifyContent: 'space-between' },
  gridCard: { width: CARD_WIDTH, marginBottom: 16, borderRadius: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  gridImage: { width: '100%', height: 120, resizeMode: 'cover' },
  gridTextContainer: { padding: 12 },
  gridCategory: { fontSize: 10, fontWeight: '900', marginBottom: 6, textTransform: 'uppercase' },
  gridTitle: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
});