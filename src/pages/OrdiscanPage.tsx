import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { OrdinalAPI } from '@/lib/services/OrdinalService';

const ordinalAPI = new OrdinalAPI();

export default function OrdiscanPage() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<unknown[] | Record<string, unknown> | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!address.trim()) {
      setError('Please enter a Bitcoin address');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await ordinalAPI.getOperatorDetails(address.trim());
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Ordiscan API error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Ordiscan Explorer
          </CardTitle>
          <CardDescription>
            Search for Bitcoin inscriptions and ordinal operator details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Bitcoin address (e.g., bc1p...)"
              value={address}
              onChange={e => setAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="min-w-[100px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading
                </>
              ) : (
                'Search'
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {data && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Inscriptions Data</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {!data && !loading && !error && (
            <div className="text-center text-muted-foreground py-8">
              Enter a Bitcoin address to search for inscriptions
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
