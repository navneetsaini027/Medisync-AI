export function getSafeAnalysisErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || '');

  if (/Groq API request failed \(503\)/i.test(message) || /over capacity|currently unavailable/i.test(message)) {
    return 'Groq AI is temporarily at capacity. Your uploaded report is saved; please wait a moment and retry.';
  }

  if (/429|quota|too many requests|rate limit/i.test(message)) {
    const retryMessage = message.match(/try again in\s+(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|seconds?)/i);
    if (retryMessage) {
      const retryAmount = Number(retryMessage[1]);
      const retryMs = /^ms|millisecond/i.test(retryMessage[2])
        ? retryAmount
        : retryAmount * 1000;
      const retrySeconds = Math.ceil(retryMs / 1000);
      return `Groq's rate limit was reached. Your uploaded report is saved; retry in about ${retrySeconds} seconds. If the limit persists, check your Groq plan and usage limits.`;
    }

    return 'Groq rejected the request due to a rate or usage limit. Your uploaded report is saved; check your Groq plan and usage limits before retrying.';
  }

  if (/GROQ_API_KEY is not set/i.test(message)) {
    return 'Groq is not configured. Add your Groq API key to server/.env and restart the backend.';
  }

  if (/api key|permission|unauthorized|forbidden|billing/i.test(message)) {
    return 'AI analysis is temporarily unavailable. Please check the server configuration.';
  }

  if (/model.*(not found|not exist|unsupported|decommissioned|not available)|invalid model/i.test(message)) {
    return 'Groq rejected the configured model. Check GROQ_MODEL in server/.env against the active Groq model list.';
  }

  if (/unsupported report file type|too large for Groq vision|pages per PDF/i.test(message)) {
    return message;
  }

  if (/timeout|timed out|deadline|network|fetch|aborterror/i.test(message)) {
    return 'AI analysis exceeded the server time limit. Your uploaded report is saved; please retry. If this keeps happening, check Groq connectivity and the server timeout settings.';
  }

  return 'AI analysis failed. Please try again.';
}
