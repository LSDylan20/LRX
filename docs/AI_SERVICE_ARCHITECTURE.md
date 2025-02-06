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

### 4.3 Negotiation Call Handler
```typescript
// services/ai/src/voice-call/negotiation-handler.ts
export class NegotiationCallHandler {
  private voiceCallService: VoiceCallService;
  private agentService: AgentService;

  constructor(
    voiceCallService: VoiceCallService,
    agentService: AgentService
  ) {
    this.voiceCallService = voiceCallService;
    this.agentService = agentService;
  }

  async initiateNegotiationCall(
    loadId: string,
    counterpartyPhone: string,
    userType: UserType
  ): Promise<NegotiationResult> {
    // Get load and negotiation context
    const context = await this.agentService.getNegotiationContext(loadId);

    // Create call session with negotiation parameters
    const session = await this.voiceCallService.makeOutboundCall(
      counterpartyPhone,
      {
        type: 'negotiation',
        loadId,
        userType,
        context,
      }
    );

    // Monitor and record negotiation
    return this.monitorNegotiation(session);
  }

  private async monitorNegotiation(
    session: CallSession
  ): Promise<NegotiationResult> {
    return new Promise((resolve) => {
      session.on('negotiationComplete', (result) => {
        resolve(result);
      });
    });
  }
}
```

### 4.4 Voice Authentication
```typescript
// services/ai/src/voice-call/auth.ts
export class VoiceAuthenticationService {
  private voiceprintStore: VoiceprintStore;

  async authenticateVoice(
    audioStream: ReadableStream,
    userId: string
  ): Promise<AuthenticationResult> {
    // Extract voiceprint features
    const voiceprint = await this.extractVoiceprint(audioStream);
    
    // Compare with stored voiceprint
    const storedVoiceprint = await this.voiceprintStore.get(userId);
    const score = await this.compareVoiceprints(voiceprint, storedVoiceprint);
    
    return {
      authenticated: score > 0.85,
      confidence: score,
    };
  }

  private async extractVoiceprint(
    audioStream: ReadableStream
  ): Promise<Voiceprint> {
    // Implement voice feature extraction
    // This could use specialized voice biometric libraries
  }
}
```

## 5. Core Features

### 5.1 Automated Call Negotiation
```typescript
// services/ai/src/features/call-negotiation.ts
export class AutomatedCallNegotiation {
  private negotiationAgent: NegotiationAgent;
  private voiceCallService: VoiceCallService;

  async initiateNegotiationCall(
    loadId: string,
    parameters: NegotiationParameters
  ): Promise<NegotiationResponse> {
    // Get negotiation context
    const context = await this.getNegotiationContext(loadId);

    // Initialize call session
    const session = await this.voiceCallService.makeOutboundCall(
      parameters.counterpartyPhone,
      {
        type: 'negotiation',
        context,
        parameters,
      }
    );

    // Monitor call and return result
    return this.handleNegotiationCall(session);
  }

  private async handleNegotiationCall(
    session: CallSession
  ): Promise<NegotiationResponse> {
    return new Promise((resolve) => {
      session.on('negotiationComplete', (result) => {
        resolve(this.formatNegotiationResult(result));
      });
    });
  }
}
```

### 5.2 Multi-Party Conference Calls
```typescript
// services/ai/src/features/conference-calls.ts
export class ConferenceCallService {
  private twilioService: TwilioService;
  private agentService: AgentService;

  async createConference(
    participants: Participant[],
    context: ConferenceContext
  ): Promise<Conference> {
    // Create conference room
    const conference = await this.twilioService.createConference();

    // Add AI agent to conference
    await this.addAIAgent(conference, context);

    // Add human participants
    for (const participant of participants) {
      await this.addParticipant(conference, participant);
    }

    return conference;
  }

  private async addAIAgent(
    conference: Conference,
    context: ConferenceContext
  ): Promise<void> {
    const agent = await this.agentService.createConferenceAgent(context);
    await conference.addParticipant(agent);
  }
}
```

## 6. Scaling Strategy

### 6.1 Call Distribution
```typescript
// services/ai/src/scaling/call-distributor.ts
export class CallDistributor {
  private instances: AIServiceInstance[] = [];
  private maxCallsPerInstance: number = 100;

  async routeCall(call: IncomingCall): Promise<AIServiceInstance> {
    const instance = await this.getLeastLoadedInstance();
    await instance.handleCall(call);
    return instance;
  }

  private async getLeastLoadedInstance(): Promise<AIServiceInstance> {
    return this.instances
      .filter(i => i.currentCalls < this.maxCallsPerInstance)
      .sort((a, b) => a.currentCalls - b.currentCalls)[0];
  }
}
```

## 7. Integration Points

### 7.1 Twilio Integration
```typescript
// services/ai/src/integration/twilio-handler.ts
export class TwilioHandler {
  private voiceCallService: VoiceCallService;

  async handleIncomingCall(request: TwilioRequest): Promise<TwiML> {
    const call = new Call(request);
    
    // Get call context
    const context = await this.getCallContext(request);
    
    // Handle call with AI service
    const session = await this.voiceCallService.handleInboundCall(
      call,
      context
    );
    
    return this.generateTwiMLResponse(session);
  }

  private async generateTwiMLResponse(
    session: CallSession
  ): Promise<TwiML> {
    const response = new VoiceResponse();
    
    // Add AI agent to call
    response.connect().ai({
      speechModel: 'google_gemini',
      language: 'en-US',
    });
    
    return response.toString();
  }
}
```

The updated architecture provides:
1. Google Gemini integration for AI processing
2. Comprehensive voice call handling
3. Outbound calling capabilities
4. Conference call support
5. Voice authentication
6. Twilio integration for telephony

Key features for different user types:
- **Shippers**: AI can make outbound calls to carriers to negotiate rates
- **Carriers**: AI can handle inbound load inquiries and negotiate terms
- **Brokers**: AI can facilitate multi-party negotiations and conference calls

Would you like me to:
1. Create the implementation files for any specific component?
2. Add more details about specific user type workflows?
3. Create example usage documentation?
