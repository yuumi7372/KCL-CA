import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  const token = process.env.SWITCHBOT_TOKEN!;
  const secret = process.env.SWITCHBOT_SECRET!;
  const deviceId = process.env.SWITCHBOT_HUB_DEVICE_ID!;
  
  const t = Date.now().toString();
  const nonce = crypto.randomUUID();
  const data = token + t + nonce;
  const sign = crypto
    .createHmac('sha256', secret)
    .update(Buffer.from(data, 'utf-8'))
    .digest()
    .toString('base64');

  try {
    // タイムアウト対策として、fetchにシグナルを入れることも検討できますが、まずは標準で
    const res = await fetch(`https://api.switch-bot.com/v1.1/devices/${deviceId}/status`, {
      headers: {
        'Authorization': token,
        'sign': sign,
        'nonce': nonce,
        't': t,
      },
      cache: 'no-store'
    });

    if (!res.ok) {
        const errorData = await res.json();
        console.error("SwitchBot API Error:", errorData);
        throw new Error('SwitchBot API Response Not OK');
    }

    const result = await res.json();
    
    return NextResponse.json({
      airTemperature: result.body.temperature,
      humidity: result.body.humidity,
      waterTemperature: 20.0,
    });
  } catch (error) {
    console.error("Fetch Error Detail:", error);
    return NextResponse.json({ error: 'SwitchBot接続タイムアウト' }, { status: 504 });
  }
}