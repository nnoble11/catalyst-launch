import { describe, it, expect } from 'vitest';
import { createSSEStream, parseSSEEvent } from '@/services/ai/streaming';

describe('createSSEStream', () => {
  it('should create a readable stream', () => {
    const { stream } = createSSEStream();

    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it('should return all required methods', () => {
    const result = createSSEStream();

    expect(result.stream).toBeDefined();
    expect(result.send).toBeDefined();
    expect(result.sendText).toBeDefined();
    expect(result.sendDone).toBeDefined();
    expect(result.sendError).toBeDefined();
    expect(result.close).toBeDefined();
  });

  it('should format text events correctly', async () => {
    const { stream, sendText, close } = createSSEStream();
    const reader = stream.getReader();

    sendText('Hello');
    close();

    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    expect(text).toContain('event: text');
    expect(text).toContain('"content":"Hello"');
  });

  it('should format done events correctly', async () => {
    const { stream, sendDone, close } = createSSEStream();
    const reader = stream.getReader();

    sendDone();
    close();

    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    expect(text).toContain('event: done');
    expect(text).toContain('data: {}');
  });

  it('should format error events correctly', async () => {
    const { stream, sendError, close } = createSSEStream();
    const reader = stream.getReader();

    sendError('Something went wrong');
    close();

    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    expect(text).toContain('event: error');
    expect(text).toContain('Something went wrong');
  });

  it('should send multiple text chunks', async () => {
    const { stream, sendText, sendDone, close } = createSSEStream();
    const reader = stream.getReader();
    const chunks: string[] = [];

    sendText('Hello');
    sendText(' ');
    sendText('World');
    sendDone();
    close();

    // Read all chunks
    let done = false;
    while (!done) {
      const result = await reader.read();
      if (result.value) {
        chunks.push(new TextDecoder().decode(result.value));
      }
      done = result.done;
    }

    const fullText = chunks.join('');
    expect(fullText).toContain('Hello');
    expect(fullText).toContain('World');
    expect(fullText).toContain('event: done');
  });

  it('should use generic send method', async () => {
    const { stream, send, close } = createSSEStream();
    const reader = stream.getReader();

    send('custom', { key: 'value' });
    close();

    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    expect(text).toContain('event: custom');
    expect(text).toContain('"key":"value"');
  });
});

describe('parseSSEEvent', () => {
  it('should parse text event', () => {
    const event = { type: 'text', data: JSON.stringify({ content: 'Hello World' }) };
    const result = parseSSEEvent(event as MessageEvent);

    expect(result).toEqual({ type: 'text', content: 'Hello World' });
  });

  it('should parse done event', () => {
    const event = { type: 'done', data: '{}' };
    const result = parseSSEEvent(event as MessageEvent);

    expect(result).toEqual({ type: 'done' });
  });

  it('should parse error event', () => {
    const event = { type: 'error', data: JSON.stringify({ error: 'Something failed' }) };
    const result = parseSSEEvent(event as MessageEvent);

    expect(result).toEqual({ type: 'error', error: 'Something failed' });
  });

  it('should return null for malformed JSON', () => {
    const event = { type: 'text', data: 'not valid json{' };
    const result = parseSSEEvent(event as MessageEvent);

    expect(result).toBeNull();
  });

  it('should return null for empty data', () => {
    const event = { type: 'text', data: '' };
    const result = parseSSEEvent(event as MessageEvent);

    expect(result).toBeNull();
  });

  it('should handle event with only content', () => {
    const event = { type: 'text', data: JSON.stringify({ content: 'Just content' }) };
    const result = parseSSEEvent(event as MessageEvent);

    expect(result?.content).toBe('Just content');
    expect(result?.type).toBe('text');
  });

  it('should return null for unrecognized event types', () => {
    const event = { type: 'unknown', data: '{}' };
    const result = parseSSEEvent(event as MessageEvent);

    expect(result).toBeNull();
  });
});
