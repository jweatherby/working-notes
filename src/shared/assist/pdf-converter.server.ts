// Runs the local Claude Code CLI to convert a doc's PDF, one background job per
// doc. The web app's tRPC context is the only thing that holds this (see
// context.server.ts); jobs live in memory, since there is one local process.

import { spawn } from 'node:child_process';
import { accessSync, constants, statSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { buildClaudeArgs, findClaude, parseClaudeOutput } from './claude-cli';
import type { PdfConversionJob, PdfConversionStatus, PdfConverter } from '$shared/types/pdf-conversion';

const TIMEOUT_MS = 10 * 60 * 1000;

const isExecutable = (path: string): boolean => {
  try {
    accessSync(path, constants.X_OK);
    return statSync(path).isFile();
  } catch {
    return false;
  }
};

const runClaude = (claudePath: string, pdfPath: string): Promise<{ readonly code: number | null; readonly stdout: string; readonly stderr: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn(claudePath, [...buildClaudeArgs(basename(pdfPath))], {
      cwd: dirname(pdfPath),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), TIMEOUT_MS);
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
  });

const convert = async (job: PdfConversionJob): Promise<PdfConversionStatus> => {
  const { code, stdout, stderr } = await runClaude(job.claudePath, job.pdfPath);
  if (stdout.trim() === '') {
    const detail = stderr.trim().split('\n').at(-1) ?? '';
    return {
      state: 'failed',
      message: code === null
        ? 'Claude took longer than 10 minutes to convert the PDF, so the doc wasn\'t changed.'
        : `Claude exited without a reply${detail ? `: ${detail}` : ''}.`
    };
  }
  const markdown = parseClaudeOutput(stdout);
  if (!markdown.ok) return { state: 'failed', message: markdown.error.message };
  const saved = await job.onMarkdown(markdown.value);
  return saved.ok ? { state: 'idle' } : { state: 'failed', message: saved.error.message };
};

export const createPdfConverter = (): PdfConverter => {
  const jobs = new Map<string, PdfConversionStatus>();

  return {
    locate: () => findClaude({ PATH: process.env.PATH, HOME: process.env.HOME }, isExecutable),

    start: (job) => {
      if (jobs.get(job.key)?.state === 'running') return;
      jobs.set(job.key, { state: 'running' });
      convert(job)
        .catch((error: unknown): PdfConversionStatus => ({
          state: 'failed',
          message: `Couldn't run Claude: ${error instanceof Error ? error.message : String(error)}`
        }))
        .then((status) => {
          if (status.state === 'idle') jobs.delete(job.key);
          else jobs.set(job.key, status);
        });
    },

    status: (key) => {
      const status = jobs.get(key) ?? { state: 'idle' };
      if (status.state === 'failed') jobs.delete(key);
      return status;
    }
  };
};

let converter: PdfConverter | null = null;

export const getPdfConverter = (): PdfConverter => {
  converter ??= createPdfConverter();
  return converter;
};
