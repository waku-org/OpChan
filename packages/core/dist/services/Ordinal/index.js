const BASE_URL = 'https://dashboard.logos.co/api/operators/wallet';
export class OrdinalAPI {
    /**
     * Fetches Ordinal operator details for a given Bitcoin address.
     * @param address - The Bitcoin address to query.
     * @returns A promise that resolves with the API response.
     */
    async getOperatorDetails(address) {
        if (process.env.VITE_OPCHAN_MOCK_ORDINAL_CHECK === 'true') {
            console.log(`[DEV] Bypassing ordinal verification for address: ${address}`);
            return {
                has_operators: true,
                error_message: '',
                data: [],
            };
        }
        const url = `${BASE_URL}/${address}/detail/`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { Accept: 'application/json' },
            });
            if (!response.ok) {
                const errorBody = await response.text().catch(() => '');
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody || response.statusText}`);
            }
            const data = await response.json();
            if (data.error_message) {
                console.warn(`API returned an error message for address ${address}: ${data.error_message}`);
            }
            return data;
        }
        catch (error) {
            console.error(`Failed to fetch ordinal details for address ${address}:`, error);
            throw error;
        }
    }
}
//# sourceMappingURL=index.js.map