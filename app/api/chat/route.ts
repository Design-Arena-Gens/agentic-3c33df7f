import { NextResponse } from 'next/server';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface OrcaAlert {
  id: string;
  state: string;
  type_string: string;
  severity: string;
  asset_name?: string;
  description?: string;
}

interface OrcaAsset {
  asset_unique_id: string;
  asset_name: string;
  asset_type: string;
  cloud_provider?: string;
  state?: string;
}

async function fetchOrcaData(endpoint: string, apiKey: string, apiUrl: string) {
  if (!apiKey) {
    return { error: 'Orca API key not configured. Please set it in the settings.' };
  }

  try {
    const response = await fetch(`${apiUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { error: `Orca API error: ${response.status} ${response.statusText}` };
    }

    return await response.json();
  } catch (error) {
    return { error: `Failed to fetch from Orca: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

function analyzeQuery(query: string): { endpoint: string; description: string } {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('alert') || lowerQuery.includes('issue')) {
    return { endpoint: '/alerts', description: 'alerts' };
  }
  if (lowerQuery.includes('asset') || lowerQuery.includes('resource') || lowerQuery.includes('inventory')) {
    return { endpoint: '/assets', description: 'assets' };
  }
  if (lowerQuery.includes('vulnerability') || lowerQuery.includes('vuln') || lowerQuery.includes('cve')) {
    return { endpoint: '/alerts?type=vulnerability', description: 'vulnerabilities' };
  }
  if (lowerQuery.includes('compliance') || lowerQuery.includes('policy')) {
    return { endpoint: '/alerts?type=compliance', description: 'compliance issues' };
  }
  if (lowerQuery.includes('misconfiguration') || lowerQuery.includes('config')) {
    return { endpoint: '/alerts?type=misconfiguration', description: 'misconfigurations' };
  }

  return { endpoint: '/alerts', description: 'alerts' };
}

function formatOrcaResponse(data: any, description: string): string {
  if (data.error) {
    return data.error;
  }

  if (!data.data || data.data.length === 0) {
    return `No ${description} found in your Orca Security account.`;
  }

  let response = `Found ${data.data.length} ${description}:\n\n`;

  if (description.includes('asset')) {
    const assets = data.data.slice(0, 10) as OrcaAsset[];
    assets.forEach((asset: OrcaAsset, index: number) => {
      response += `${index + 1}. ${asset.asset_name || asset.asset_unique_id}\n`;
      response += `   Type: ${asset.asset_type}\n`;
      if (asset.cloud_provider) response += `   Provider: ${asset.cloud_provider}\n`;
      if (asset.state) response += `   State: ${asset.state}\n`;
      response += '\n';
    });
  } else {
    const alerts = data.data.slice(0, 10) as OrcaAlert[];
    alerts.forEach((alert: OrcaAlert, index: number) => {
      response += `${index + 1}. ${alert.type_string || 'Alert'}\n`;
      response += `   Severity: ${alert.severity}\n`;
      response += `   State: ${alert.state}\n`;
      if (alert.asset_name) response += `   Asset: ${alert.asset_name}\n`;
      if (alert.description) response += `   Description: ${alert.description}\n`;
      response += '\n';
    });
  }

  if (data.data.length > 10) {
    response += `\n... and ${data.data.length - 10} more ${description}.`;
  }

  return response;
}

export async function POST(req: Request) {
  try {
    const { messages, orcaApiKey, orcaApiUrl } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1] as Message;

    if (lastMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'Last message must be from user' },
        { status: 400 }
      );
    }

    const { endpoint, description } = analyzeQuery(lastMessage.content);

    const orcaData = await fetchOrcaData(
      endpoint,
      orcaApiKey || '',
      orcaApiUrl || 'https://api.orcasecurity.io/api'
    );

    const formattedResponse = formatOrcaResponse(orcaData, description);

    return NextResponse.json({ message: formattedResponse });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
