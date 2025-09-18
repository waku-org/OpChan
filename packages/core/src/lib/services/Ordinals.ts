import { Ordiscan, Inscription } from 'ordiscan';
import { environment } from '../utils/environment';

class Ordinals {
  private static instance: Ordinals | null = null;
  private ordiscan: Ordiscan;
  private readonly PARENT_INSCRIPTION_ID =
    'add60add0325f7c82e80d4852a8b8d5c46dbde4317e76fe4def2e718dd84b87ci0';

  private constructor(ordiscan: Ordiscan) {
    this.ordiscan = ordiscan;
  }

  static getInstance(): Ordinals {
    if (!Ordinals.instance) {
      const apiKey = environment.ordiscanApiKey;
      if (!apiKey) {
        throw new Error('Ordiscan API key is not configured. Please set up the environment.');
      }
      Ordinals.instance = new Ordinals(new Ordiscan(apiKey));
    }
    return Ordinals.instance;
  }

  /**
   * Get Ordinal details for a Bitcoin address
   */
  async getOrdinalDetails(address: string): Promise<Inscription[] | null> {
    const inscriptions = await this.ordiscan.address.getInscriptions({
      address,
    });
    if (inscriptions.length > 0) {
      if (
        inscriptions.some(
          inscription =>
            inscription.parent_inscription_id === this.PARENT_INSCRIPTION_ID
        )
      ) {
        return inscriptions.filter(
          inscription =>
            inscription.parent_inscription_id === this.PARENT_INSCRIPTION_ID
        );
      } else {
        return null;
      }
    }
    return null;
  }
}

export const ordinals = {
  getInstance: () => Ordinals.getInstance(),
  getOrdinalDetails: async (address: string) => {
    return Ordinals.getInstance().getOrdinalDetails(address);
  }
};
