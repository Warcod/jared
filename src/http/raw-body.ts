import type { IncomingMessage } from "node:http";

export const readRawBody = async (req: IncomingMessage): Promise<Buffer> => {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};
