import { OrdinalApiResponse } from './types';
export declare class OrdinalAPI {
    /**
     * Fetches Ordinal operator details for a given Bitcoin address.
     * @param address - The Bitcoin address to query.
     * @returns A promise that resolves with the API response.
     */
    getOperatorDetails(address: string): Promise<OrdinalApiResponse>;
}
//# sourceMappingURL=index.d.ts.map