import { BrowserProvider, Contract } from 'ethers';
import { config } from '@/lib/wallet/config';
// Contract configuration - these should be moved to environment variables in production
const CONTRACT_ADDRESS = "0x971B0B5de23C63160602a3fbe68e96166Fc11D1A"; // Hardhat default deploy address
const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "bool",
        "name": "adult",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "country",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "gender",
        "type": "string"
      }
    ],
    "name": "setVerification",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getVerification",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];
import { EU_COUNTRIES, ZKPassport } from '@zkpassport/sdk';
import { Claim } from '@/types/identity';

export interface ZKPassportVerificationResult {
  verified: boolean;
  uniqueIdentifier: string;
  claims: Claim[];
}

/**
 * Verify that the user is an adult (18+ years old)
 */
export const verifyAdulthood = async (setProgress: (status:string) => void, setUrl: (url:string) => void): Promise<ZKPassportVerificationResult | null> => {
  const zkPassport = new ZKPassport();

  const queryBuilder = await zkPassport.request({
    name: "OpChan",
    logo: "https://zkpassport.id/logo.png",
    purpose: "Prove you are 18+ years old",
    scope: "adult",
  });

  const {
    url,
    onResult,
    onGeneratingProof,
    onError,
    onProofGenerated,
    onReject,
    onRequestReceived
  } = queryBuilder.gte("age", 18).done();

  setUrl(url);

  return new Promise((resolve, reject) => {
    try {
      console.log("Starting adulthood verification with zkPassport");
      onRequestReceived(() => {
        setProgress("Request received, preparing for age verification");
        console.log("Request received, preparing for age verification");
      });

      onGeneratingProof(() => {
        setProgress("Generating cryptographic proof of age");
        console.log("Generating cryptographic proof of age");
      });

      onProofGenerated(() => {
        setProgress("Age proof generated successfully");
        console.log("Age proof generated successfully");
      });

      onReject(() => {
        setProgress("Age verification request was rejected");
        console.log("Age verification request was rejected by the user");
        resolve(null);
      });

      onError((error) => {
        setProgress(`Age verification error: ${error}`);
        console.error("Age verification error", error);
        resolve(null);
      });

      onResult(({ verified, uniqueIdentifier, result }) => {
        try {
          console.log("Adulthood verification result", verified, result);
          if (verified) {
            const claims: Claim[] = [
              {
                key: "adult",
                value: result.age?.gte?.result,
                verified: true
              }
            ];
            
            resolve({
              verified: true,
              uniqueIdentifier: uniqueIdentifier || '',
              claims
            });
            console.log("User is verified as adult", claims);
          } else {
            setProgress("Age verification failed");
            resolve(null);
          }
        } catch (error) {
          console.error("Adulthood verification result processing error", error);
          setProgress(`Adulthood verification result processing error: ${error}`);
          resolve(null);
        } finally {
          setUrl('');
          setProgress('');
        }
      });
    } catch (error) {
      console.error("Adulthood verification exception", error);
      setProgress(`Adulthood verification exception: ${error}`);
      reject(error);
    }
  });
}

/**
 * Disclose the user's country of nationality
 */
export const discloseCountry = async (setProgress: (status:string) => void, setUrl: (url:string) => void): Promise<ZKPassportVerificationResult | null> => {
  const zkPassport = new ZKPassport();

  const queryBuilder = await zkPassport.request({
    name: "OpChan",
    logo: "https://zkpassport.id/logo.png",
    purpose: "Verify your country of nationality",
    scope: "country",
  });

  const {
    url,
    onResult,
    onGeneratingProof,
    onError,
    onProofGenerated,
    onReject,
    onRequestReceived
  } = queryBuilder.disclose("nationality").done();

  setUrl(url);

  return new Promise((resolve, reject) => {
    try {
      console.log("Starting country disclosure with zkPassport");
      onRequestReceived(() => {
        setProgress("Request received, preparing for country disclosure");
        console.log("Request received, preparing for country disclosure");
      });

      onGeneratingProof(() => {
        setProgress("Generating cryptographic proof of country");
        console.log("Generating cryptographic proof of country");
      });

      onProofGenerated(() => {
        setProgress("Country proof generated successfully");
        console.log("Country proof generated successfully");
      });

      onReject(() => {
        setProgress("Country disclosure request was rejected");
        console.log("Country disclosure request was rejected by the user");
        resolve(null);
      });

      onError((error) => {
        setProgress(`Country disclosure error: ${error}`);
        console.error("Country disclosure error", error);
        resolve(null);
      });

      onResult(({ verified, uniqueIdentifier, result }) => {
        try {
          console.log("Country disclosure result", verified, result);
          if (verified && result.nationality?.disclose?.result) {
            const claims: Claim[] = [
              {
                key: "country",
                value: result.nationality.disclose.result,
                verified: true
              }
            ];
            
            resolve({
              verified: true,
              uniqueIdentifier: uniqueIdentifier || '',
              claims
            });
            console.log("User country disclosed", claims);
          } else {
            setProgress("Country disclosure failed");
            resolve(null);
          }
        } catch (error) {
          console.error("Country disclosure result processing error", error);
          setProgress(`Country disclosure result processing error: ${error}`);
          resolve(null);
        } finally {
          setUrl('');
          setProgress('');
        }
      });
    } catch (error) {
      console.error("Country disclosure exception", error);
      setProgress(`Country disclosure exception: ${error}`);
      reject(error);
    }
  });
}

/**
 * Disclose the user's gender
 */
export const discloseGender = async (setProgress: (status:string) => void, setUrl: (url:string) => void): Promise<ZKPassportVerificationResult | null> => {
  const zkPassport = new ZKPassport();

  const queryBuilder = await zkPassport.request({
    name: "OpChan",
    logo: "https://zkpassport.id/logo.png",
    purpose: "Verify your gender",
    scope: "gender",
  });

  const {
    url,
    onResult,
    onGeneratingProof,
    onError,
    onProofGenerated,
    onReject,
    onRequestReceived
  } = queryBuilder.disclose("gender").done();

  setUrl(url);

  return new Promise((resolve, reject) => {
    try {
      console.log("Starting gender disclosure with zkPassport");
      onRequestReceived(() => {
        setProgress("Request received, preparing for gender disclosure");
        console.log("Request received, preparing for gender disclosure");
      });

      onGeneratingProof(() => {
        setProgress("Generating cryptographic proof of gender");
        console.log("Generating cryptographic proof of gender");
      });

      onProofGenerated(() => {
        setProgress("Gender proof generated successfully");
        console.log("Gender proof generated successfully");
      });

      onReject(() => {
        setProgress("Gender disclosure request was rejected");
        console.log("Gender disclosure request was rejected by the user");
        resolve(null);
      });

      onError((error) => {
        setProgress(`Gender disclosure error: ${error}`);
        console.error("Gender disclosure error", error);
        resolve(null);
      });

      onResult(({ verified, uniqueIdentifier, result }) => {
        try {
          console.log("Gender disclosure result", verified, result);
          if (verified && result.gender?.disclose?.result) {
            const claims: Claim[] = [
              {
                key: "gender",
                value: result.gender.disclose.result,
                verified: true
              }
            ];
            
            resolve({
              verified: true,
              uniqueIdentifier: uniqueIdentifier || '',
              claims
            });
            console.log("User gender disclosed", claims);
          } else {
            setProgress("Gender disclosure failed");
            resolve(null);
          }
        } catch (error) {
          console.error("Gender disclosure result processing error", error);
          setProgress(`Gender disclosure result processing error: ${error}`);
          resolve(null);
        } finally {
          setUrl('');
          setProgress('');
        }
      });
    } catch (error) {
      console.error("Gender disclosure exception", error);
      setProgress(`Gender disclosure exception: ${error}`);
      reject(error);
    }
  });
}
/**
 * Get a signer from the current wallet connection
 * @returns Promise resolving to an ethers Signer or null if unavailable
 */
const getSigner = async (): Promise<any | null> => {
  try {
    // Get the provider from wagmi config
    const provider = new BrowserProvider(window.ethereum as any, {name: "sepolia", chainId: 11155111});
    
    // Request account access
    await provider.send('eth_requestAccounts', []);
    
    // Explicitly switch to Sepolia network
    try {
      await provider.send('wallet_switchEthereumChain', [
        { chainId: '0x' + (11155111).toString(16) }
      ]);
    } catch (switchError: any) {
      // If the network isn't added, add it
      if (switchError.code === 4902) {
        await provider.send('wallet_addEthereumChain', [
          {
            chainId: '0x' + (11155111).toString(16),
            chainName: 'Sepolia Test Network',
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: ['https://eth-sepolia.api.onfinality.io/public'],
            blockExplorerUrls: ['https://sepolia.etherscan.io']
          }
        ]);
      } else {
        throw switchError;
      }
    }
    
    return await provider.getSigner();
  } catch (error) {
    console.error('Failed to get signer:', error);
    return null;
  }
};

/**
 * Submit verification data to the blockchain contract
 * @param adult Whether the user is 18+
 * @param country The user's country of nationality
 * @param gender The user's gender
 * @param setProgress Function to update progress status
 * @returns Promise resolving to transaction hash on success, null on failure
 */
export const submitVerificationToContract = async (
  adult: boolean,
  country: string,
  gender: string,
  setProgress: (status: string) => void
): Promise<string | null> => {
  setProgress('Initializing blockchain connection...');
  
  try {
    const signer = await getSigner();
    if (!signer) {
      setProgress('Failed to connect to wallet');
      return null;
    }

    setProgress('Connecting to contract...');
    if (!signer) {
      setProgress('Failed to get signer');
      return null;
    }
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer) as unknown as {
      setVerification: (adult: boolean, country: string, gender: string) => Promise<any>;
    };

    setProgress('Submitting verification data to blockchain...');
    const tx = await contract.setVerification(adult, country, gender);
    
    setProgress('Waiting for blockchain confirmation...');
    const receipt = await tx.wait();
    
    if (receipt && receipt.hash) {
      setProgress('Verification successfully recorded on blockchain!');
      return receipt.hash;
    } else {
      setProgress('Transaction completed but no hash received');
      return null;
    }
  } catch (error: any) {
    console.error('Error submitting verification:', error);
    if (error.message) {
      setProgress(`Error: ${error.message}`);
    } else {
      setProgress('Failed to submit verification to contract');
    }
    return null;
  }
};