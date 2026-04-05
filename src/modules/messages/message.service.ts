import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { Message, MessageRole } from './message.entity';
import { Chat } from '../chats/chat.entity';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessageService {
  private readonly geminiApiKey: string;
  private readonly geminiModel: string;
  private readonly geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
  ) {
    this.geminiApiKey = process.env.GEMINI_API_KEY!;
    this.geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-04-17';
  }

  // ─── Main Send Function ──────────────────────────────────────────
  async sendMessage(
    userId: string,
    dto: SendMessageDto,
    res: Response,
  ): Promise<void> {
    try {
      // 1. Validate chat
      const chat = await this.chatRepository.findOne({
        where: { id: dto.chatId },
      });

      if (!chat) throw new NotFoundException(`Chat ${dto.chatId} not found`);
      if (chat.userId !== userId)
        throw new ForbiddenException('You do not have access to this chat');

      // 2. Fetch recent history (last 6 messages)
      const history = await this.messageRepository.find({
        where: { chatId: dto.chatId },
        order: { sequenceNumber: 'DESC' },
        take: 6,
      });
      history.reverse();

      const nextSequence =
        history.length > 0
          ? history[history.length - 1].sequenceNumber + 1
          : 1;

      // 3. Save user message
      await this.messageRepository.save(
        this.messageRepository.create({
          chatId: dto.chatId,
          role: MessageRole.USER,
          content: dto.content,
          sequenceNumber: nextSequence,
        }),
      );

      // 4. Setup SSE headers
      this.setupSSE(res);

      // 5. Stream Gemini response
      let fullResponse = '';

      try {
        fullResponse = await this.streamGemini(history, dto.content, res);
      } catch (aiError) {
        this.logError('AI_STREAM_ERROR', aiError);
        res.write(
          `data: ${JSON.stringify({
            error: 'AI response failed. Please try again.',
            done: true,
          })}\n\n`,
        );
        return res.end() as any;
      }

      // 6. Save assistant response
      const assistantMessage = await this.messageRepository.save(
        this.messageRepository.create({
          chatId: dto.chatId,
          role: MessageRole.ASSISTANT,
          content: fullResponse,
          sequenceNumber: nextSequence + 1,
        }),
      );

      // 7. Send done event
      res.write(
        `data: ${JSON.stringify({
          done: true,
          messageId: assistantMessage.id,
        })}\n\n`,
      );

      res.end();
    } catch (error) {
      this.logError('SEND_MESSAGE_ERROR', error);
      this.handleStreamError(error, res);
    }
  }

  // ─── Gemini Streaming via Raw Fetch ──────────────────────────────
  private async streamGemini(
    history: Message[],
    newMessage: string,
    res: Response,
  ): Promise<string> {
    // Build contents array — Gemini requires alternating user/model roles
    // We inject system instruction as a user turn at the start
    const contents = [
      {
        role: 'user',
        parts: [{ text: 'You are a helpful AI assistant. Always respond in a clear, structured way using markdown formatting where appropriate.' }],
      },
      {
        role: 'model',
        parts: [{ text: 'Understood! I will respond clearly and use markdown formatting where it helps.' }],
      },
      ...history.map((msg) => ({
        role: msg.role === MessageRole.USER ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
      {
        role: 'user',
        parts: [{ text: newMessage }],
      },
    ];

    const url = `${this.geminiBaseUrl}/${this.geminiModel}:streamGenerateContent?alt=sse`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.geminiApiKey,   // API key in header (no SDK)
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      this.logError('GEMINI_HTTP_ERROR', { status: geminiRes.status, body: errBody });
      throw new Error(`Gemini API error ${geminiRes.status}: ${errBody}`);
    }

    // Read the SSE stream from Gemini and forward chunks to client
    const reader = geminiRes.body?.getReader();
    if (!reader) throw new Error('No response body from Gemini');

    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Gemini SSE lines look like: "data: {...json...}"
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // keep last incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const jsonStr = trimmed.slice(5).trim(); // strip "data: "
        if (!jsonStr || jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const text =
            parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

          if (text) {
            fullResponse += text;
            // Forward chunk to client in SSE format
            res.write(
              `data: ${JSON.stringify({ text, done: false })}\n\n`,
            );
          }
        } catch {
          // Malformed JSON chunk — skip silently
        }
      }
    }

    return fullResponse;
  }

  // ─── SSE Setup ───────────────────────────────────────────────────
  private setupSSE(res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
  }

  // ─── Error Logging ───────────────────────────────────────────────
  private logError(type: string, error: any) {
    console.error('================ ERROR ================');
    console.error('Type:', type);
    if (error?.status) console.error('Status:', error.status);
    if (error?.body) console.error('Body:', error.body);
    console.error('Message:', error?.message);
    console.error('Stack:', error?.stack);
    console.error('=======================================');
  }

  // ─── Centralized Error Handler ───────────────────────────────────
  private handleStreamError(error: unknown, res: Response): void {
    const isKnown =
      error instanceof NotFoundException ||
      error instanceof ForbiddenException;

    const message = isKnown
      ? (error as Error).message
      : 'Streaming failed unexpectedly';

    if (res.headersSent) {
      res.write(
        `data: ${JSON.stringify({ error: message, done: true })}\n\n`,
      );
      res.end();
    } else {
      if (isKnown) throw error;
      throw new InternalServerErrorException(message);
    }
  }

  // ─── Get Chat Messages ───────────────────────────────────────────
  async getChatMessages(chatId: string, userId: string): Promise<Message[]> {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });

    if (!chat) throw new NotFoundException(`Chat ${chatId} not found`);
    if (chat.userId !== userId)
      throw new ForbiddenException('You do not have access to this chat');

    return this.messageRepository.find({
      where: { chatId },
      order: { sequenceNumber: 'ASC' },
    });
  }
}