import { createSlice, configureStore } from '@reduxjs/toolkit';

const initialState = {
    user: null,
    token: null,
    role: null,
};

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        login(state, action) {
            state.user = action.payload?.user || null;
            state.token = null;
            state.role = action.payload?.role || null;
        },
        logout(state) {
            state.user = null;
            state.token = null;
            state.role = null;
        },
        setCart(state, action) {
            if (!state.user) return;
            state.user.cart = Array.isArray(action.payload) ? action.payload : [];
        }
    }
});

export const authAction = authSlice.actions;

export const store = configureStore({
    reducer: {
        auth: (state, action) => {
            const newState = authSlice.reducer(state, action);
            
            return { ...newState, isLogin: !!newState.user };
        }
    }
});
