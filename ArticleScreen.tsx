import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, useWindowDimensions, Share, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RenderHtml from 'react-native-render-html';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useBookmarks } from './BookmarkContext';

export default function ArticleScreen({ route, navigation }: any) {
  const { article } = route.params;
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  
  const [scrollY, setScrollY] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [screenHeight, setScreenHeight] = useState(0);
  
  // Font Size State
  const [fontSize, setFontSize] = useState(18);

  useEffect(() => {
    // Load saved font size when the screen opens
    const loadFontSize = async () => {
      try {
        const savedSize = await AsyncStorage.getItem('app_font_size');
        if (savedSize) {
          setFontSize(parseInt(savedSize));
        }
      } catch (error) {
        console.log("Error loading font size:", error);
      }
    };
    loadFontSize();
  }, []);

  const changeFontSize = async (increment: boolean) => {
    const newSize = increment ? fontSize + 2 : fontSize - 2;
    // Keep the font size within readable limits (14 to 30)
    if (newSize >= 14 && newSize <= 30) {
      setFontSize(newSize);
      try {
        await AsyncStorage.setItem('app_font_size', newSize.toString());
      } catch (error) {
        console.log("Error saving font size:", error);
      }
    }
  };

  const wordCount = (article.content || '').replace(/<[^>]+>/g, '').split(' ').length;
  const readTime = Math.ceil(wordCount / 200) || 1;

  // Calculate progress (0 to 1)
  const scrollPercent = contentHeight > 0 ? scrollY / (contentHeight - screenHeight + 300) : 0;

  const onShare = async () => {
    try {
      await Share.share({
        message: `📰 Read this exclusive article on The BBN Post App!\n\n"${article.title}"\n\nDownload the app here to read: https://github.com/amalkmathewofcl-alt/bbnpost-app/releases/latest/download/app-release.apk`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 🟢 READING PROGRESS BAR */}
      <View style={{ position: 'absolute', top: 40, left: 0, right: 0, height: 3, zIndex: 10, backgroundColor: 'transparent' }}>
        <Animated.View style={{ height: 3, backgroundColor: colors.primary, width: `${Math.min(Math.max(scrollPercent * 100, 0), 100)}%` }} />
      </View>

      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row' }}>
          {/* 🟢 SHARE BUTTON */}
          <TouchableOpacity onPress={onShare} style={styles.iconButton}>
            <Ionicons name="share-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => toggleBookmark(article)} style={styles.iconButton}>
            <Ionicons name={isBookmarked(article.id) ? "bookmark" : "bookmark-outline"} size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
        onContentSizeChange={(w, h) => setContentHeight(h)}
        onLayout={(event) => setScreenHeight(event.nativeEvent.layout.height)}
        scrollEventThrottle={16}
      >
        {article.imageUrl && <Image source={{ uri: article.imageUrl }} style={styles.heroImage} />}
        
        <View style={styles.contentContainer}>
          <Text style={[styles.category, { color: colors.primary }]}>
            {article.categories[0] || 'NEWS'}
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>{article.title}</Text>
          
          <View style={styles.metaRow}>
            <Text style={[styles.date, { color: colors.subText }]}>
              {new Date(article.published || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} • {readTime} min read
            </Text>
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* 🟢 FONT SIZE ADJUSTER */}
          <View style={styles.fontControlsRow}>
            <Text style={[styles.fontLabel, { color: colors.subText }]}>TEXT SIZE</Text>
            <View style={styles.fontButtonsContainer}>
              <TouchableOpacity 
                style={[styles.fontButton, { borderColor: colors.border }]} 
                onPress={() => changeFontSize(false)}
              >
                <Text style={[styles.fontButtonText, { color: colors.text }]}>A-</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.fontButton, { borderColor: colors.border }]} 
                onPress={() => changeFontSize(true)}
              >
                <Text style={[styles.fontButtonText, { color: colors.text }]}>A+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <RenderHtml
            contentWidth={width - 48}
            source={{ html: article.content || '<p>No content available</p>' }}
            baseStyle={{ 
              fontSize: fontSize, 
              color: colors.text, 
              lineHeight: fontSize * 1.6, // Dynamic line height based on font size
              fontWeight: '400' 
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  iconButton: { padding: 8, marginHorizontal: 4 },
  scrollContent: { paddingBottom: 60 },
  heroImage: { width: '100%', height: 320, resizeMode: 'cover' },
  contentContainer: { padding: 24 },
  category: { fontWeight: '900', fontSize: 13, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 16, lineHeight: 40, letterSpacing: -0.5 },
  metaRow: { marginBottom: 24 },
  date: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginBottom: 20 },
  
  // Styles for Font Size Adjuster
  fontControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  fontLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  fontButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  fontButton: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
    backgroundColor: 'rgba(150, 150, 150, 0.1)', 
  },
  fontButtonText: {
    fontWeight: '800',
    fontSize: 16,
  },
});