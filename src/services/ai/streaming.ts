export function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });

  const send = (event: string, data: unknown) => {
    if (controller) {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(encoder.encode(message));
    }
  };

  const sendText = (text: string) => {
    send('text', { content: text });
  };

  const sendDone = () => {
    send('done', {});
  };

  const sendError = (error: string) => {
    send('error', { error });
  };

  const close = () => {
    if (controller) {
      controller.close();
    }
  };

  return {
    stream,
    send,
    sendText,
    sendDone,
    sendError,
    close,
  };
}

export function parseSSEEvent(event: MessageEvent): {
  type: 'text' | 'done' | 'error';
  content?: string;
  error?: string;
} | null {
  try {
    const data = JSON.parse(event.data);

    if (event.type === 'text') {
      return { type: 'text', content: data.content };
    } else if (event.type === 'done') {
      return { type: 'done' };
    } else if (event.type === 'error') {
      return { type: 'error', error: data.error };
    }

    return null;
  } catch {
    return null;
  }
}
