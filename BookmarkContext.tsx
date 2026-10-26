import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article } from './services/feed';

type BookmarkContextType = {
  savedArticles: Article[];
  toggleBookmark: (article: Article) => void;
  isBookmarked: (id: string) => boolean;
};

export const BookmarkContext = createContext<BookmarkContextType>({
  savedArticles: [],
  toggleBookmark: () => {},
  isBookmarked: () => false,
});

export const BookmarkProvider = ({ children }: { children: ReactNode }) => {
  const [savedArticles, setSavedArticles] = useState<Article[]>([]);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      const stored = await AsyncStorage.getItem('@bbn_bookmarks');
      if (stored) setSavedArticles(JSON.parse(stored));
    } catch (e) {
      console.error("Failed to load bookmarks", e);
    }
  };

  const toggleBookmark = async (article: Article) => {
    let newSaved;
    if (isBookmarked(article.id)) {
      newSaved = savedArticles.filter(a => a.id !== article.id);
    } else {
      newSaved = [...savedArticles, article];
    }
    setSavedArticles(newSaved);
    await AsyncStorage.setItem('@bbn_bookmarks', JSON.stringify(newSaved));
  };

  const isBookmarked = (id: string) => savedArticles.some(a => a.id === id);

  return (
    <BookmarkContext.Provider value={{ savedArticles, toggleBookmark, isBookmarked }}>
      {children}
    </BookmarkContext.Provider>
  );
};

export const useBookmarks = () => useContext(BookmarkContext);