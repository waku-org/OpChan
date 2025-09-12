import {Ordiscan, Inscription} from 'ordiscan'
const API_KEY = import.meta.env.VITE_ORDISCAN_API;

class Ordinals {
    private static instance: Ordinals | null = null;
    private ordiscan: Ordiscan;
    private readonly PARENT_INSCRIPTION_ID = "add60add0325f7c82e80d4852a8b8d5c46dbde4317e76fe4def2e718dd84b87ci0"

    private constructor(ordiscan: Ordiscan) {
        this.ordiscan = ordiscan;
    }

    static getInstance(): Ordinals {
        if (!Ordinals.instance) {
            Ordinals.instance = new Ordinals(new Ordiscan(API_KEY));
        }
        return Ordinals.instance;
    }

    /**
     * Get Ordinal details for a Bitcoin address
     */
    async getOrdinalDetails(address: string): Promise<Inscription[] | null> {
        const inscriptions =  await this.ordiscan.address.getInscriptions({address})
        if (inscriptions.length > 0) {
            if (inscriptions.some(inscription => inscription.parent_inscription_id === this.PARENT_INSCRIPTION_ID)) {
                return inscriptions.filter(inscription => inscription.parent_inscription_id === this.PARENT_INSCRIPTION_ID)
            } else {
                return null
            }
        }
        return null
    }
}

export const ordinals = Ordinals.getInstance();