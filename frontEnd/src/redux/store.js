import { createSlice, configureStore } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  token: null,
  role: null,
  isLogin: false,

  // Tracks whether the saved login session is being restored.
  // checking | authenticated | anonymous | error
  sessionStatus: "checking",
};

export const authSlice = createSlice({
  name: "auth",
  initialState,

  reducers: {
    // Normal login
    login(state, action) {
      const user = action.payload?.user || null;

      state.user = user;
      state.token = null;
      state.role = action.payload?.role || user?.role || null;
      state.isLogin = Boolean(user);
      state.sessionStatus = user ? "authenticated" : "anonymous";
    },

    // Restore an existing session successfully
    sessionCheckSucceeded(state, action) {
      const user = action.payload?.user || null;

      state.user = user;
      state.token = null;
      state.role = user?.role || null;
      state.isLogin = Boolean(user);
      state.sessionStatus = user ? "authenticated" : "anonymous";
    },

    // No valid saved session exists
    sessionCheckFailed(state) {
      state.user = null;
      state.token = null;
      state.role = null;
      state.isLogin = false;
      state.sessionStatus = "anonymous";
    },

    // Session request failed for another reason, such as a network error
    sessionCheckError(state) {
      state.sessionStatus = "error";
    },

    // Begin checking the saved session
    sessionCheckStarted(state) {
      state.sessionStatus = "checking";
    },

    logout(state) {
      state.user = null;
      state.token = null;
      state.role = null;
      state.isLogin = false;
      state.sessionStatus = "anonymous";
    },

    setCart(state, action) {
      if (!state.user) return;

      state.user.cart = Array.isArray(action.payload)
        ? action.payload
        : [];
    },
  },
});

export const authAction = authSlice.actions;

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
  },
});