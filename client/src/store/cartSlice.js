import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  isOpen: false,
  appliedCoupon: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCart: (state, action) => {
      const cart = action.payload;
      state.items = cart.items || [];
      state.appliedCoupon = cart.appliedCoupon || null;
    },
    toggleCart: (state) => {
      state.isOpen = !state.isOpen;
    },
    clearCart: (state) => {
      state.items = [];
      state.appliedCoupon = null;
      state.isOpen = false;
    },
  },
});

export const { setCart, toggleCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
