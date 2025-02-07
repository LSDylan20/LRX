# LaneRunner AI Service Architecture

## Overview
This document outlines the implementation of LaneRunner's AI service using LangChain.js with Google Gemini, focusing on automated load posting, bidding, negotiation, and AI-assisted logistics planning with voice and call capabilities.

## Table of Contents
1. [Architecture](#1-architecture)
2. [RAG Implementation](#2-rag-implementation)
3. [Agent System](#3-agent-system)
4. [Voice & Call System](#4-voice-and-call-system)
5. [Core Features](#5-core-features)
6. [Scaling Strategy](#6-scaling-strategy)
7. [Integration Points](#7-integration-points)
8. [Monitoring and Logging](#8-monitoring-and-logging)
9. [Security](#9-security)
10. [Deployment](#10-deployment)
11. [Testing Strategy](#11-testing-strategy)
12. [Documentation](#12-documentation)

## 1. Architecture

### 1.1 High-Level Architecture
```typescript
// services/ai/src/index.ts
import { LangChainService } from './langchain';
import { VectorStoreService } from './vector-store';
import { AgentService } from './agents';
import { VoiceCallService } from './voice-call';
import { TwilioService } from './twilio';

export class AIService {
  private langchain: LangChainService;
  private vectorStore: VectorStoreService;
  private agentService: AgentService;
  private voiceCallService: VoiceCallService;
  private twilioService: TwilioService;

  constructor() {
    this.vectorStore = new VectorStoreService();
    this.langchain = new LangChainService(this.vectorStore);
    this.agentService = new AgentService(this.langchain);
    this.twilioService = new TwilioService();
    this.voiceCallService = new VoiceCallService(this.twilioService);
  }

  async initialize() {
    await this.vectorStore.initialize();
    await this.langchain.initialize();
    await this.agentService.initialize();
    await this.voiceCallService.initialize();
  }
}
```

### 1.2 Core Services
```typescript
// services/ai/src/langchain/service.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from 'langchain/prompts';
import { RunnableSequence } from 'langchain/schema/runnable';
import { StringOutputParser } from 'langchain/schema/output_parser';

export class LangChainService {
  private model: ChatGoogleGenerativeAI;
  private vectorStore: VectorStore;

  constructor(vectorStore: VectorStore) {
    this.model = new ChatGoogleGenerativeAI({
      modelName: 'gemini-pro',
      maxOutputTokens: 2048,
      temperature: 0.7,
      apiKey: process.env.GOOGLE_API_KEY,
    });
    this.vectorStore = vectorStore;
  }

  async createChain(template: string) {
    const prompt = PromptTemplate.fromTemplate(template);
    return RunnableSequence.from([
      prompt,
      this.model,
      new StringOutputParser(),
    ]);
  }
}
```

## 4. Voice & Call System

### 4.1 Voice Call Service
```typescript
// services/ai/src/voice-call/service.ts
import { TwilioService } from '../twilio';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GoogleCloudTextToSpeech } from './google-tts';
import { GoogleCloudSpeechToText } from './google-stt';

export class VoiceCallService {
  private twilioService: TwilioService;
  private model: ChatGoogleGenerativeAI;
  private tts: GoogleCloudTextToSpeech;
  private stt: GoogleCloudSpeechToText;

  constructor(twilioService: TwilioService) {
    this.twilioService = twilioService;
    this.model = new ChatGoogleGenerativeAI({
      modelName: 'gemini-pro',
      maxOutputTokens: 2048,
      temperature: 0.7,
    });
    this.tts = new GoogleCloudTextToSpeech();
    this.stt = new GoogleCloudSpeechToText();
  }

  async makeOutboundCall(
    phoneNumber: string,
    context: CallContext
  ): Promise<CallSession> {
    const call = await this.twilioService.createOutboundCall(phoneNumber);
    return this.handleCallSession(call, context);
  }

  async handleInboundCall(
    call: Call,
    context: CallContext
  ): Promise<CallSession> {
    return this.handleCallSession(call, context);
  }

  private async handleCallSession(
    call: Call,
    context: CallContext
  ): Promise<CallSession> {
    const session = new CallSession(call, this.model, this.tts, this.stt);
    await session.initialize(context);
    return session;
  }
}
```

### 4.2 Call Session Handler
```typescript
// services/ai/src/voice-call/session.ts
export class CallSession {
  private call: Call;
  private model: ChatGoogleGenerativeAI;
  private tts: GoogleCloudTextToSpeech;
  private stt: GoogleCloudSpeechToText;
  private context: CallContext;
  private conversation: ConversationTurn[] = [];

  constructor(
    call: Call,
    model: ChatGoogleGenerativeAI,
    tts: GoogleCloudTextToSpeech,
    stt: GoogleCloudSpeechToText
  ) {
    this.call = call;
    this.model = model;
    this.tts = tts;
    this.stt = stt;
  }

  async handleUserSpeech(audioStream: ReadableStream): Promise<void> {
    // Convert speech to text
    const text = await this.stt.transcribe(audioStream);
    
    // Process with AI
    const response = await this.processUserInput(text);
    
    // Convert response to speech
    const audioResponse = await this.tts.synthesize(response);
    
    // Play response to user
    await this.call.play(audioResponse);
  }

  async processUserInput(text: string): Promise<string> {
    // Add user input to conversation history
    this.conversation.push({ role: 'user', content: text });

    // Get AI response
    const response = await this.model.invoke({
      messages: this.conversation,
      context: this.context,
    });

    // Add AI response to conversation history
    this.conversation.push({ role: 'assistant', content: response });

    return response;
  }
}
```

## 8. Monitoring and Logging

### 8.1 Monitoring Configuration
```typescript
interface MonitoringConfig {
  metrics: {
    collection: {
      interval: number;
      aggregation: string[];
    };
    storage: {
      retention: number;
      resolution: string;
    };
    alerts: {
      thresholds: Map<string, number>;
      channels: string[];
    };
  };
  
  logging: {
    level: string;
    format: string;
    destination: string;
    retention: number;
  };
}
```

### 8.2 Health Checks
```typescript
interface HealthCheck {
  // Service health
  service: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: Date;
    metrics: HealthMetrics;
  };
  
  // Dependencies
  dependencies: {
    database: boolean;
    cache: boolean;
    queue: boolean;
    external: Map<string, boolean>;
  };
}
```

## 9. Security

### 9.1 Authentication
- JWT-based authentication
- API key management
- Role-based access control
- Token refresh strategy

### 9.2 Authorization
- Resource-level permissions
- Action-based authorization
- Scope validation
- Rate limiting

## 10. Deployment

### 10.1 Infrastructure
- Containerized services
- Kubernetes orchestration
- Service mesh integration
- CI/CD pipeline

### 10.2 Configuration
```typescript
interface ServiceConfig {
  // Environment
  env: {
    name: string;
    region: string;
    stage: string;
  };
  
  // Resources
  resources: {
    cpu: string;
    memory: string;
    storage: string;
  };
  
  // Networking
  network: {
    vpc: string;
    subnets: string[];
    security: string[];
  };
}
```

## 11. Testing Strategy

### 11.1 Test Types
- Unit tests
- Integration tests
- Load tests
- Security tests
- Chaos tests

### 11.2 Test Configuration
```typescript
interface TestConfig {
  // Test environment
  environment: {
    name: string;
    resources: ResourceConfig;
  };
  
  // Test data
  data: {
    generation: boolean;
    cleanup: boolean;
  };
  
  // Monitoring
  monitoring: {
    metrics: boolean;
    logging: boolean;
  };
}
```

## 12. Documentation
- API documentation
- Integration guides
- Deployment guides
- Troubleshooting guides
- Best practices
