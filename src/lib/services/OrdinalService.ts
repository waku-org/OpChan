import { Ordiscan } from 'ordiscan';

console.log(import.meta.env.VITE_ORDISCAN_API_KEY);
const ordiscan = new Ordiscan(import.meta.env.VITE_ORDISCAN_API_KEY);

export class OrdinalAPI {
  /**
   * Fetches Ordinal operator details for a given Bitcoin address.
   * @param address - The Bitcoin address to query.
   * @returns A promise that resolves with the API response.
   */
  async getOperatorDetails(address: string) {
    const response = await ordiscan.address.getInscriptions({address: address})
    console.log(response);
    return response;
  }
}
