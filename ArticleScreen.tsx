import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, useWindowDimensions, Share, Animated } from 'react-native';
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

  const wordCount = (article.content || '').replace(/<[^>]+>/g, '').split(' ').length;
  const readTime = Math.ceil(wordCount / 200) || 1;

  // Calculate progress (0 to 1)
  const scrollPercent = contentHeight > 0 ? scrollY / (contentHeight - screenHeight + 300) : 0;

  const onShare = async () => {
    try {
      await Share.share({
        message: `Read this article on The BBN Post: ${article.title}\n\n${article.link}`,
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
              {new Date(article.published).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} • {readTime} min read
            </Text>
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <RenderHtml
            contentWidth={width - 40}
            source={{ html: article.content || '<p>No content available</p>' }}
            baseStyle={{ fontSize: 18, color: colors.text, lineHeight: 32, fontWeight: '400' }}
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
  divider: { height: 1, marginBottom: 24 },
});