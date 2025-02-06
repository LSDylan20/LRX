# LaneRunner API Documentation

## Overview
This document details all API endpoints, request/response formats, and authentication requirements for the LaneRunner platform.

## Base URLs
- Production: `https://api.lanerunner.com`
- Staging: `https://staging-api.lanerunner.com`
- Development: `http://localhost:3000`

## Authentication
All API requests require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## API Endpoints

### Load Management API (Port 3001)

#### Create Load
```http
POST /api/loads
Content-Type: application/json
Authorization: Bearer <token>

{
  "origin": "string",
  "destination": "string",
  "equipment_type": "string",
  "weight": number,
  "dimensions": {
    "length": number,
    "width": number,
    "height": number
  },
  "pickup_date": "ISO8601",
  "delivery_date": "ISO8601",
  "special_instructions": "string"
}

Response 201:
{
  "id": "uuid",
  "status": "pending",
  "created_at": "ISO8601",
  ...
}
```

#### Get Load
```http
GET /api/loads/:id
Authorization: Bearer <token>

Response 200:
{
  "id": "uuid",
  "origin": "string",
  "destination": "string",
  ...
}
```

### Carrier Management API (Port 3002)

#### Create Carrier Profile
```http
POST /api/carriers/profile
Content-Type: application/json
Authorization: Bearer <token>

{
  "company_name": "string",
  "mc_number": "string",
  "dot_number": "string",
  "equipment_types": ["string"],
  "service_areas": ["string"],
  "insurance": {
    "liability": number,
    "cargo": number
  }
}

Response 201:
{
  "id": "uuid",
  "status": "active",
  ...
}
```

#### Get Carrier Matches
```http
GET /api/carriers/matches/:loadId
Authorization: Bearer <token>

Response 200:
{
  "matches": [
    {
      "carrier_id": "uuid",
      "match_score": number,
      "distance": number,
      "predicted_rate": number
    }
  ]
}
```

### AI/ML API (Port 3003)

#### Get Rate Prediction
```http
POST /api/ai/predict-rate
Content-Type: application/json
Authorization: Bearer <token>

{
  "origin": "string",
  "destination": "string",
  "equipment_type": "string",
  "weight": number,
  "pickup_date": "ISO8601"
}

Response 200:
{
  "predicted_rate": number,
  "confidence": number,
  "factors": [
    {
      "name": "string",
      "impact": number
    }
  ]
}
```

#### Get Route Optimization
```http
POST /api/ai/optimize-route
Content-Type: application/json
Authorization: Bearer <token>

{
  "waypoints": [
    {
      "location": "string",
      "type": "pickup|delivery",
      "time_window": {
        "start": "ISO8601",
        "end": "ISO8601"
      }
    }
  ]
}

Response 200:
{
  "optimized_route": [
    {
      "order": number,
      "location": "string",
      "estimated_arrival": "ISO8601",
      "distance": number,
      "duration": number
    }
  ],
  "total_distance": number,
  "total_duration": number
}
```

### Communication API (Port 3004)

#### Create Chat Room
```http
POST /api/communication/chat
Content-Type: application/json
Authorization: Bearer <token>

{
  "load_id": "uuid",
  "participants": ["uuid"]
}

Response 201:
{
  "room_id": "uuid",
  "token": "string"
}
```

#### Start Voice Call
```http
POST /api/communication/voice
Content-Type: application/json
Authorization: Bearer <token>

{
  "room_id": "uuid"
}

Response 201:
{
  "channel_id": "string",
  "token": "string"
}
```

## WebSocket Events

### Load Updates
```javascript
// Subscribe to load updates
socket.on('load:update', {
  load_id: 'uuid',
  status: 'string',
  location: {
    lat: number,
    lng: number
  },
  timestamp: 'ISO8601'
});
```

### Chat Messages
```javascript
// Subscribe to chat messages
socket.on('chat:message', {
  room_id: 'uuid',
  sender_id: 'uuid',
  content: 'string',
  timestamp: 'ISO8601'
});
```

## Error Responses
All endpoints use standard HTTP status codes and return errors in the following format:
```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

## Rate Limits
- Authentication endpoints: 5 requests per minute
- Load management endpoints: 60 requests per minute
- Carrier matching endpoints: 30 requests per minute
- AI/ML endpoints: 20 requests per minute
