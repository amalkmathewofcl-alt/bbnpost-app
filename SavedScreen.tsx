import React from 'react';
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useBookmarks } from './BookmarkContext';

export default function SavedScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { savedArticles } = useBookmarks();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Saved Articles</Text>
      </View>

      {savedArticles.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bookmark-outline" size={60} color={colors.subText} />
          <Text style={{ marginTop: 20, fontSize: 18, color: colors.subText, fontWeight: '600' }}>No saved articles yet.</Text>
        </View>
      ) : (
        <FlatList
          data={savedArticles}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('Article', { article: item })}
            >
              {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.image} />}
              <View style={styles.textContainer}>
                <Text style={[styles.category, { color: colors.primary }]}>{item.categories[0]}</Text>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  header: { padding: 20, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: '900' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { flexDirection: 'row', marginBottom: 16, borderRadius: 16, overflow: 'hidden', padding: 10 },
  image: { width: 80, height: 80, borderRadius: 8 },
  textContainer: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  category: { fontSize: 10, fontWeight: '900', marginBottom: 4 },
  title: { fontSize: 15, fontWeight: '700' }
});