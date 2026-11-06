export interface SpikeResult {
  ok: boolean;
  status: number;
  corsOrigin: string | null;
  body: unknown;
  error?: string;
}

const CLIENT_ID = '819bf9f8805f11f1b50eb49691aa2236';

export async function runCorsSpike(): Promise<SpikeResult> {
  try {
    const res = await fetch('https://api.ibroadcast.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ibroadcast-app': CLIENT_ID,
      },
      body: JSON.stringify({
        client: 'dig',
        version: '0.1.0',
        device_name: 'Dig spike',
        user_agent: navigator.userAgent,
        mode: 'status',
      }),
    });
    const body = await res.json();
    return {
      ok: res.ok,
      status: res.status,
      corsOrigin: res.headers.get('access-control-allow-origin'),
      body,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      corsOrigin: null,
      body: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
