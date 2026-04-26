import { MessageSquare, Settings, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useVscodeApi } from '@/hooks/useVscodeApi';
import { useVscodeMessage } from '@/hooks/useVscodeMessage';

import './index.css';

interface PersistedState {
  state: string;
}

function App() {
  const api = useVscodeApi<PersistedState>();
  const [message, setMessage] = useState('');
  const [state, setState] = useState('');
  const [lastFromExtension, setLastFromExtension] = useState('(awaiting ready handshake)');

  useVscodeMessage('hello', (msg) => {
    setLastFromExtension(msg.data);
  });

  // Signal readiness AFTER the message listener is registered (the
  // useVscodeMessage useEffect above runs before this one in commit order),
  // so the extension's hello reply cannot race past us.
  useEffect(() => {
    api.postMessage({ type: 'webview/ready' });
  }, [api]);

  const onSetState = () => {
    api.setState({ state });
  };
  const onGetState = () => {
    setState(api.getState()?.state ?? '');
  };
  const onPostMessage = () => {
    api.postMessage({
      type: 'hello',
      data: message || 'Empty',
    });
  };

  return (
    <main className="flex min-h-screen flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Zap className="size-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">VSCode Extension Starter</h1>
          <p className="text-sm text-muted-foreground">React + shadcn/ui + Tailwind CSS</p>
        </div>
        <Badge className="ml-auto">v0.0.1</Badge>
      </div>

      <Separator />

      <p className="text-sm text-muted-foreground">
        Last from extension:
        {' '}
        <span data-testid="extension-payload" className="font-mono">{lastFromExtension}</span>
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-5" />
              Message
            </CardTitle>
            <CardDescription>Send a typed message to the VSCode extension</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message content</Label>
              <Input
                id="message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Enter message..."
              />
            </div>
            {message && (
              <p className="text-sm text-muted-foreground">
                Preview:
                {' '}
                {message}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={onPostMessage} className="w-full">
              <MessageSquare className="mr-2 size-4" />
              Send Message
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="size-5" />
              State Management
            </CardTitle>
            <CardDescription>Persist state across webview sessions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="state">State value</Label>
              <Input
                id="state"
                value={state}
                onChange={e => setState(e.target.value)}
                placeholder="Enter state..."
              />
            </div>
            {state && (
              <p className="text-sm text-muted-foreground">
                Current:
                {' '}
                {state}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button onClick={onSetState} className="flex-1">
              Save State
            </Button>
            <Button variant="secondary" onClick={onGetState} className="flex-1">
              Load State
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

export default App;
