// Load Management Service
export const LOAD_ENDPOINTS = {
  BASE: import.meta.env.VITE_LOAD_SERVICE_URL,
  CREATE: '/loads',
  GET_ALL: '/loads',
  GET_BY_ID: (id: string) => `/loads/${id}`,
  UPDATE: (id: string) => `/loads/${id}`,
  DELETE: (id: string) => `/loads/${id}`,
  SEARCH: '/loads/search',
};

// Quote Management Service
export const QUOTE_ENDPOINTS = {
  BASE: import.meta.env.VITE_QUOTE_SERVICE_URL,
  CREATE: '/quotes',
  GET_ALL: '/quotes',
  GET_BY_ID: (id: string) => `/quotes/${id}`,
  UPDATE: (id: string) => `/quotes/${id}`,
  DELETE: (id: string) => `/quotes/${id}`,
  SEARCH: '/quotes/search',
};

// Shipment Management Service
export const SHIPMENT_ENDPOINTS = {
  BASE: import.meta.env.VITE_SHIPMENT_SERVICE_URL,
  CREATE: '/shipments',
  GET_ALL: '/shipments',
  GET_BY_ID: (id: string) => `/shipments/${id}`,
  UPDATE: (id: string) => `/shipments/${id}`,
  DELETE: (id: string) => `/shipments/${id}`,
  UPDATE_LOCATION: (id: string) => `/shipments/${id}/location`,
  UPDATE_STATUS: (id: string) => `/shipments/${id}/status`,
  SEARCH: '/shipments/search',
};

// Carrier Management Service
export const CARRIER_ENDPOINTS = {
  BASE: import.meta.env.VITE_CARRIER_SERVICE_URL,
  CREATE: '/carriers',
  GET_ALL: '/carriers',
  GET_BY_ID: (id: string) => `/carriers/${id}`,
  UPDATE: (id: string) => `/carriers/${id}`,
  DELETE: (id: string) => `/carriers/${id}`,
  SEARCH: '/carriers/search',
  // Vehicle endpoints
  GET_VEHICLES: (carrierId: string) => `/carriers/${carrierId}/vehicles`,
  ADD_VEHICLE: (carrierId: string) => `/carriers/${carrierId}/vehicles`,
  UPDATE_VEHICLE: (carrierId: string, vehicleId: string) => `/carriers/${carrierId}/vehicles/${vehicleId}`,
  DELETE_VEHICLE: (carrierId: string, vehicleId: string) => `/carriers/${carrierId}/vehicles/${vehicleId}`,
};

// Message Service
export const MESSAGE_ENDPOINTS = {
  BASE: import.meta.env.VITE_MESSAGE_SERVICE_URL,
  SEND: '/messages',
  GET_CONVERSATION: (id: string) => `/conversations/${id}`,
  GET_MESSAGES: (conversationId: string) => `/conversations/${conversationId}/messages`,
  UPDATE_STATUS: (id: string) => `/messages/${id}/status`,
  GET_CONVERSATIONS: '/conversations',
  SEARCH_MESSAGES: '/messages/search',
};
