import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'recruitrain_theme';
const initialTheme = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) === 'dark' : false;

export const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    isDarkMode: initialTheme,
  },
  reducers: {
    toggleTheme: (state) => {
      state.isDarkMode = !state.isDarkMode;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, state.isDarkMode ? 'dark' : 'light');
      }
    },
    setTheme: (state, action) => {
      state.isDarkMode = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, state.isDarkMode ? 'dark' : 'light');
      }
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
