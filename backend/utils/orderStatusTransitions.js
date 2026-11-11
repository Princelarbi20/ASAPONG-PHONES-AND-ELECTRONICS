const transitions = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT FOR DELIVERY', 'RETURN REQUESTED'],
  'OUT FOR DELIVERY': ['DELIVERED', 'RETURN REQUESTED'],
  DELIVERED: ['RETURN REQUESTED'],
  'RETURN REQUESTED': ['RETURNED', 'DELIVERED'],
  RETURNED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export const canTransitionOrderStatus = (current, next) =>
  current === next || Boolean(transitions[current]?.includes(next));
