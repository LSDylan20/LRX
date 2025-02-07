# WebSocket Implementation Strategy

## 1. WebSocket Service Architecture

```typescript
// Core WebSocket structure for the entire application
interface WebSocketArchitecture {
  gateways: {
    load: LoadGateway;       // Load updates, matching, tracking
    chat: ChatGateway;       // Real-time chat and negotiations
    voice: VoiceGateway;     // Voice streaming and processing
    market: MarketGateway;   // Real-time market data and rates
    system: SystemGateway;   // System-wide notifications
  };
  rooms: {
    negotiation: string[];   // Active negotiation rooms
    load: string[];         // Load tracking rooms
    market: string[];       // Market data subscription rooms
    voice: string[];        // Active voice session rooms
  };
}
```

## 2. Implementation Structure

### 2.1 Base Gateway Implementation

```typescript
// apps/websocket-service/src/core/base.gateway.ts
@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
  namespace: 'lanerunner',
})
export class BaseGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BaseGateway.name);
  private readonly connectedClients = new Map<string, ConnectedClient>();

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      // 1. Authenticate client
      const user = await this.authService.validateToken(client.handshake.auth.token);
      
      // 2. Store client information
      this.connectedClients.set(client.id, {
        userId: user.id,
        roles: user.roles,
        subscriptions: new Set(),
      });

      // 3. Join relevant rooms based on user role
      await this.joinUserRooms(client, user);

      this.logger.log(`Client connected: ${client.id}`);
    } catch (error) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  protected async broadcastToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }

  protected async joinRoom(client: Socket, room: string) {
    await client.join(room);
    this.connectedClients.get(client.id).subscriptions.add(room);
  }
}
```

### 2.2 Load Gateway Implementation

```typescript
// apps/websocket-service/src/gateways/load.gateway.ts
@WebSocketGateway()
export class LoadGateway extends BaseGateway {
  constructor(
    private readonly loadService: LoadService,
    private readonly matchingService: MatchingService,
  ) {
    super();
  }

  @SubscribeMessage('subscribe_load')
  async handleLoadSubscription(
    @MessageBody() loadId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const room = `load_${loadId}`;
    await this.joinRoom(client, room);
    
    // Send initial load state
    const loadState = await this.loadService.getLoadState(loadId);
    client.emit('load_state', loadState);
  }

  @SubscribeMessage('start_matching')
  async handleStartMatching(
    @MessageBody() loadId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const room = `matching_${loadId}`;
    await this.joinRoom(client, room);

    // Start async matching process
    this.matchingService.startMatching(loadId, {
      onMatch: (match) => this.broadcastToRoom(room, 'new_match', match),
      onComplete: (results) => this.broadcastToRoom(room, 'matching_complete', results),
    });
  }
}
```

### 2.3 Negotiation Gateway Implementation

```typescript
// apps/websocket-service/src/gateways/negotiation.gateway.ts
@WebSocketGateway()
export class NegotiationGateway extends BaseGateway {
  @SubscribeMessage('join_negotiation')
  async handleJoinNegotiation(
    @MessageBody() data: JoinNegotiationDto,
    @ConnectedSocket() client: Socket,
  ) {
    const room = `negotiation_${data.negotiationId}`;
    await this.joinRoom(client, room);

    // Initialize AI agent for this negotiation
    const agent = await this.agentService.initializeNegotiationAgent(data);
    
    // Monitor agent events
    agent.on('suggestion', (suggestion) => {
      this.broadcastToRoom(room, 'ai_suggestion', suggestion);
    });

    agent.on('market_update', (update) => {
      this.broadcastToRoom(room, 'market_update', update);
    });
  }

  @SubscribeMessage('send_offer')
  async handleSendOffer(
    @MessageBody() data: SendOfferDto,
    @ConnectedSocket() client: Socket,
  ) {
    const room = `negotiation_${data.negotiationId}`;
    
    // Process offer with AI
    const aiAnalysis = await this.aiService.analyzeOffer(data);
    
    // Broadcast to all participants
    this.broadcastToRoom(room, 'new_offer', {
      offer: data,
      analysis: aiAnalysis,
    });
  }
}
```

### 2.4 Market Data Gateway Implementation

```typescript
// apps/websocket-service/src/gateways/market.gateway.ts
@WebSocketGateway()
export class MarketGateway extends BaseGateway {
  @SubscribeMessage('subscribe_market_data')
  async handleMarketSubscription(
    @MessageBody() criteria: MarketSubscriptionDto,
    @ConnectedSocket() client: Socket,
  ) {
    const room = this.getMarketRoom(criteria);
    await this.joinRoom(client, room);

    // Start sending real-time market updates
    this.marketService.subscribeToUpdates(criteria, {
      onUpdate: (update) => this.broadcastToRoom(room, 'market_update', update),
      onAlert: (alert) => this.broadcastToRoom(room, 'market_alert', alert),
    });
  }

  private getMarketRoom(criteria: MarketSubscriptionDto): string {
    return `market_${criteria.lane}_${criteria.equipmentType}`;
  }
}
```

## 3. Client Implementation

### 3.1 WebSocket Client Service

```typescript
// apps/client/src/services/websocket.service.ts
export class WebSocketService {
  private socket: Socket;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    this.socket = io(process.env.WEBSOCKET_URL, {
      auth: {
        token: this.authService.getToken(),
      },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.eventBus.emit('ws:connected');
    });

    this.socket.on('disconnect', () => {
      this.eventBus.emit('ws:disconnected');
    });

    this.socket.on('error', (error) => {
      this.handleError(error);
    });
  }

  public subscribeToLoad(loadId: string): void {
    this.socket.emit('subscribe_load', loadId);
  }

  public startNegotiation(negotiationId: string): void {
    this.socket.emit('join_negotiation', { negotiationId });
  }

  public subscribeToMarketData(criteria: MarketSubscriptionDto): void {
    this.socket.emit('subscribe_market_data', criteria);
  }
}
```

## 4. Scaling Strategy

### 4.1 Redis Adapter Implementation

```typescript
// apps/websocket-service/src/adapters/redis.adapter.ts
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
```

### 4.2 Load Balancing Configuration

```yaml
# kubernetes/websocket-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: websocket-service
spec:
  selector:
    app: websocket-service
  ports:
    - port: 80
      targetPort: 3000
  type: LoadBalancer
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: websocket-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: websocket-service
  template:
    metadata:
      labels:
        app: websocket-service
    spec:
      containers:
        - name: websocket-service
          image: lanerunner/websocket-service:latest
          ports:
            - containerPort: 3000
          env:
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: redis-secrets
                  key: url
```

## 5. Monitoring & Error Handling

### 5.1 WebSocket Monitoring Service

```typescript
// apps/websocket-service/src/services/monitoring.service.ts
@Injectable()
export class WebSocketMonitoringService {
  private readonly metrics = {
    connectedClients: new Gauge({
      name: 'websocket_connected_clients',
      help: 'Number of connected WebSocket clients',
    }),
    messageRate: new Counter({
      name: 'websocket_message_rate',
      help: 'Number of WebSocket messages processed',
    }),
    errors: new Counter({
      name: 'websocket_errors',
      help: 'Number of WebSocket errors',
      labelNames: ['type'],
    }),
  };

  trackConnection(clientId: string) {
    this.metrics.connectedClients.inc();
  }

  trackDisconnection(clientId: string) {
    this.metrics.connectedClients.dec();
  }

  trackMessage(type: string) {
    this.metrics.messageRate.inc({ type });
  }

  trackError(type: string) {
    this.metrics.errors.inc({ type });
  }
}
```

## 6. Security Implementation

### 6.1 Authentication Middleware

```typescript
// apps/websocket-service/src/middleware/auth.middleware.ts
@Injectable()
export class WebSocketAuthMiddleware implements NestMiddleware {
  async use(socket: Socket, next: (err?: Error) => void) {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const user = await this.authService.validateToken(token);
      socket.data.user = user;
      
      next();
    } catch (error) {
      next(new UnauthorizedException('Invalid token'));
    }
  }
}
```

## 7. Implementation Timeline

### Phase 1: Core Setup (Week 1)
- Set up WebSocket service
- Implement base gateway
- Configure Redis adapter
- Set up authentication

### Phase 2: Feature Gateways (Week 2)
- Implement load gateway
- Create negotiation gateway
- Set up market data gateway
- Add voice gateway

### Phase 3: Client Integration (Week 3)
- Create client WebSocket service
- Implement reconnection logic
- Add event handlers
- Set up state management

### Phase 4: Scaling & Monitoring (Week 4)
- Configure Kubernetes deployment
- Set up monitoring
- Implement error handling
- Performance optimization

## 8. Connection Management

### 8.1 Connection Manager
```typescript
class ConnectionManager {
  private connections: Map<string, WebSocket>;
  private heartbeats: Map<string, NodeJS.Timeout>;
  
  constructor(private readonly config: ConnectionConfig) {
    this.setupHeartbeat();
    this.setupReconnection();
  }
  
  private setupHeartbeat(): void {
    // Send ping every 30 seconds
    setInterval(() => {
      this.connections.forEach((ws, id) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      });
    }, 30000);
  }
  
  private setupReconnection(): void {
    this.connections.forEach((ws, id) => {
      ws.on('close', () => {
        this.reconnect(id);
      });
    });
  }
}
```

## 9. Event System

### 9.1 Event Types
```typescript
enum WebSocketEventType {
  // Load events
  LOAD_CREATED = 'load.created',
  LOAD_UPDATED = 'load.updated',
  LOAD_DELETED = 'load.deleted',
  
  // Chat events
  MESSAGE_SENT = 'message.sent',
  MESSAGE_RECEIVED = 'message.received',
  MESSAGE_READ = 'message.read',
  
  // Voice events
  CALL_INITIATED = 'call.initiated',
  CALL_CONNECTED = 'call.connected',
  CALL_ENDED = 'call.ended',
  
  // Market events
  RATE_UPDATED = 'rate.updated',
  MARKET_ALERT = 'market.alert',
  
  // System events
  SYSTEM_NOTIFICATION = 'system.notification',
  ERROR = 'error'
}
```

### 9.2 Event Handlers
```typescript
class EventHandler {
  private handlers: Map<string, Function[]> = new Map();
  
  on(event: WebSocketEventType, handler: Function): void {
    const handlers = this.handlers.get(event) || [];
    handlers.push(handler);
    this.handlers.set(event, handlers);
  }
  
  emit(event: WebSocketEventType, data: any): void {
    const handlers = this.handlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }
}
```

## 10. Rate Limiting

### 10.1 Rate Limiter
```typescript
class WebSocketRateLimiter {
  private limits: Map<string, number> = new Map();
  private readonly maxRequestsPerMinute = 100;
  
  checkLimit(clientId: string): boolean {
    const current = this.limits.get(clientId) || 0;
    if (current >= this.maxRequestsPerMinute) {
      return false;
    }
    
    this.limits.set(clientId, current + 1);
    return true;
  }
  
  resetLimits(): void {
    this.limits.clear();
  }
}
```

### 10.2 Implementation
```typescript
class RateLimitedWebSocket {
  private rateLimiter: WebSocketRateLimiter;
  
  constructor() {
    this.rateLimiter = new WebSocketRateLimiter();
    
    // Reset limits every minute
    setInterval(() => {
      this.rateLimiter.resetLimits();
    }, 60000);
  }
  
  handleMessage(clientId: string, message: any): void {
    if (!this.rateLimiter.checkLimit(clientId)) {
      this.sendError(clientId, 'Rate limit exceeded');
      return;
    }
    
    // Process message
  }
}
```

## 11. Load Balancing

### 11.1 Load Balancer Configuration
```typescript
interface LoadBalancerConfig {
  strategy: 'round-robin' | 'least-connections' | 'ip-hash';
  servers: {
    url: string;
    weight: number;
    maxConnections: number;
  }[];
  healthCheck: {
    interval: number;
    timeout: number;
    unhealthyThreshold: number;
  };
}
```

### 11.2 Implementation
```typescript
class WebSocketLoadBalancer {
  private servers: WebSocketServer[];
  private currentIndex = 0;
  
  constructor(private readonly config: LoadBalancerConfig) {
    this.initializeServers();
    this.startHealthChecks();
  }
  
  private initializeServers(): void {
    this.servers = this.config.servers.map(server => 
      new WebSocketServer(server)
    );
  }
  
  getNextServer(): WebSocketServer {
    // Round-robin selection
    const server = this.servers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.servers.length;
    return server;
  }
}
```

## 12. Security

### 12.1 Authentication
```typescript
class WebSocketAuthenticator {
  async authenticate(token: string): Promise<User> {
    try {
      const decoded = await jwt.verify(token, process.env.JWT_SECRET);
      return await this.userService.findById(decoded.userId);
    } catch (error) {
      throw new UnauthorizedError('Invalid token');
    }
  }
}
```

### 12.2 Message Encryption
```typescript
class WebSocketEncryption {
  private readonly algorithm = 'aes-256-gcm';
  
  encrypt(message: any): Buffer {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.key,
      iv
    );
    
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(message)),
      cipher.final()
    ]);
    
    return Buffer.concat([iv, encrypted, cipher.getAuthTag()]);
  }
  
  decrypt(data: Buffer): any {
    const iv = data.slice(0, 12);
    const tag = data.slice(-16);
    const encrypted = data.slice(12, -16);
    
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      iv
    );
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return JSON.parse(decrypted.toString());
  }
}
```

## 13. Error Handling

### 13.1 Error Types
```typescript
enum WebSocketErrorType {
  AUTHENTICATION_FAILED = 'authentication_failed',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  CONNECTION_ERROR = 'connection_error',
  MESSAGE_ERROR = 'message_error',
  INTERNAL_ERROR = 'internal_error'
}

interface WebSocketError {
  type: WebSocketErrorType;
  message: string;
  timestamp: string;
  details?: any;
}
```

### 13.2 Error Handler
```typescript
class WebSocketErrorHandler {
  handleError(error: Error, client: WebSocket): void {
    const wsError: WebSocketError = {
      type: this.getErrorType(error),
      message: error.message,
      timestamp: new Date().toISOString()
    };
    
    this.logError(wsError);
    this.notifyClient(client, wsError);
  }
  
  private logError(error: WebSocketError): void {
    logger.error('WebSocket Error:', {
      ...error,
      stack: new Error().stack
    });
  }
}
```

## 14. Monitoring

### 14.1 Metrics Collection
```typescript
class WebSocketMetrics {
  private metrics = {
    connections: new Counter('ws_connections_total'),
    messages: new Counter('ws_messages_total'),
    errors: new Counter('ws_errors_total'),
    latency: new Histogram('ws_message_latency_seconds')
  };
  
  recordMessage(type: string): void {
    this.metrics.messages.inc({ type });
  }
  
  recordError(type: string): void {
    this.metrics.errors.inc({ type });
  }
}
```

### 14.2 Health Checks
```typescript
class WebSocketHealthCheck {
  async check(): Promise<HealthStatus> {
    const status: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: {
        connections: await this.getConnectionCount(),
        messageRate: await this.getMessageRate(),
        errorRate: await this.getErrorRate()
      }
    };
    
    return status;
  }
}
```

## 15. Testing

### 15.1 Unit Tests
```typescript
describe('WebSocket Server', () => {
  let server: WebSocketServer;
  let client: WebSocket;
  
  beforeEach(() => {
    server = new WebSocketServer();
    client = new WebSocket('ws://localhost:8080');
  });
  
  it('should handle client connection', (done) => {
    client.on('open', () => {
      expect(server.getConnections()).toBe(1);
      done();
    });
  });
});
```

### 15.2 Integration Tests
```typescript
describe('WebSocket Integration', () => {
  it('should handle message round-trip', async () => {
    const client = new WebSocket('ws://localhost:8080');
    const message = { type: 'test', data: 'hello' };
    
    await client.send(JSON.stringify(message));
    
    const response = await new Promise(resolve => {
      client.once('message', resolve);
    });
    
    expect(JSON.parse(response)).toMatchObject({
      type: 'test',
      status: 'received'
    });
  });
});
