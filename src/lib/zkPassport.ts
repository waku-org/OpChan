import { BrowserProvider, Contract } from 'ethers';
import { config } from '@/lib/wallet/config';
// Contract configuration - these should be moved to environment variables in production
export const CONTRACT_ADDRESS = "0xaA649E71A6d7347742e3642AAe209d580913f021"; // Hardhat default deploy address
const CONTRACT_ABI = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_zkVerifier",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "adult",
          "type": "bool"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "country",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "gender",
          "type": "string"
        }
      ],
      "name": "VerificationUpdated",
      "type": "event"
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
    },
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
        },
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "vkeyHash",
              "type": "bytes32"
            },
            {
              "internalType": "bytes",
              "name": "proof",
              "type": "bytes"
            },
            {
              "internalType": "bytes32[]",
              "name": "publicInputs",
              "type": "bytes32[]"
            },
            {
              "internalType": "bytes",
              "name": "committedInputs",
              "type": "bytes"
            },
            {
              "internalType": "uint256[]",
              "name": "committedInputCounts",
              "type": "uint256[]"
            },
            {
              "internalType": "uint256",
              "name": "validityPeriodInSeconds",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "domain",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "scope",
              "type": "string"
            },
            {
              "internalType": "bool",
              "name": "devMode",
              "type": "bool"
            }
          ],
          "internalType": "struct ProofVerificationParams",
          "name": "params",
          "type": "tuple"
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
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "usedUniqueIdentifiers",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "verifications",
      "outputs": [
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
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "zkVerifier",
      "outputs": [
        {
          "internalType": "contract IZKVerifier",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

const devMode = true;
const proofMode = "compressed-evm"; //"fast"
import { EU_COUNTRIES, ProofResult, SolidityVerifierParameters, ZKPassport } from '@zkpassport/sdk';
import { Claim } from '@/types/identity';
import { V } from 'vitest/dist/chunks/environment.d.cL3nLXbE.js';

export interface ZKPassportVerificationResult {
  verified: boolean;
  uniqueIdentifier: string;
  claims: Claim[];
}

/**
 * Options for ZKPassport verification
 */
export interface ZKPassportVerificationOptions {
  verifyAdulthood: boolean;
  verifyCountry: boolean;
  verifyGender: boolean;
}

/**
 * Perform ZKPassport verification with selective disclosure based on provided options
 */
export const verifyWithZKPassport = async (
  options: ZKPassportVerificationOptions,
  setProgress: (status: string) => void,
  setUrl: (url: string) => void,
  setProof: (proof: ProofResult) => void,
): Promise<ZKPassportVerificationResult | null> => {
  const zkPassport = new ZKPassport();

  // Build purpose message based on selected verifications
  const selectedVerifications = [];
  if (options.verifyAdulthood) selectedVerifications.push("being 18+");
  if (options.verifyCountry) selectedVerifications.push("your country of nationality");
  if (options.verifyGender) selectedVerifications.push("your gender");
  
  const purpose = selectedVerifications.length > 0
    ? `Verify ${selectedVerifications.join(", ")}`
    : "Verify your identity";

  const queryBuilder = await zkPassport.request({
    name: "OpChan",
    logo: "https://zkpassport.id/logo.png",
    purpose,
    scope: "identity",
    devMode: devMode,
    mode: proofMode,
  });

  // Conditionally add verification requirements based on options
  if (options.verifyAdulthood) {
    queryBuilder.gte("age", 18);
  }
  if (options.verifyCountry) {
    queryBuilder.disclose("nationality");
  }
  if (options.verifyGender) {
    queryBuilder.disclose("gender");
  }

  const {
    url,
    onResult,
    onGeneratingProof,
    onError,
    onProofGenerated,
    onReject,
    onRequestReceived
  } = queryBuilder.done();

  setUrl(url);

  return new Promise((resolve, reject) => {
    try {
      console.log("Starting ZKPassport verification with options:", options);
      onRequestReceived(() => {
        setProgress("Request received, preparing for verification");
        console.log("Request received, preparing for verification");
      });

      onGeneratingProof(() => {
        setProgress("Generating cryptographic proof");
        console.log("Generating cryptographic proof");
      });

      onProofGenerated((proof: ProofResult) => {
        setProgress("Proof generated successfully");
        console.log("Proof generated successfully");
        setProof(proof);
      });

      onReject(() => {
        setProgress("Verification request was rejected");
        console.log("Verification request was rejected by the user");
        resolve(null);
      });

      onError((error) => {
        setProgress(`Verification error: ${error}`);
        console.error("Verification error", error);
        resolve(null);
      });

      onResult(({ verified, uniqueIdentifier, result }) => {
        try {
          console.log("ZKPassport verification result", verified, result);
          if (verified) {
            const claims: Claim[] = [];

            if (options.verifyAdulthood && result.age?.gte?.result) {
              claims.push({
                key: "adult",
                value: result.age.gte.result,
                verified: true
              });
            }

            if (options.verifyCountry && result.nationality?.disclose?.result) {
              claims.push({
                key: "country",
                value: result.nationality.disclose.result,
                verified: true
              });
            }

            if (options.verifyGender && result.gender?.disclose?.result) {
              claims.push({
                key: "gender",
                value: result.gender.disclose.result,
                verified: true
              });
            }

            resolve({
              verified: true,
              uniqueIdentifier: uniqueIdentifier || '',
              claims
            });
            console.log("User verified with claims", claims);
          } else {
            setProgress("Verification failed");
            resolve(null);
          }
        } catch (error) {
          console.error("Verification result processing error", error);
          setProgress(`Verification result processing error: ${error}`);
          resolve(null);
        } finally {
          setUrl('');
          setProgress('');
        }
      });
    } catch (error) {
      console.error("ZKPassport verification exception", error);
      setProgress(`ZKPassport verification exception: ${error}`);
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
 * Record verified claims on the blockchain
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
  proof: ProofResult,
  setProgress: (status: string) => void
): Promise<string | null> => {
  setProgress('Initializing blockchain connection...');
  const zkPassport = new ZKPassport();


  // Get verification parameters
  const verifierParams = zkPassport.getSolidityVerifierParameters({
    proof: proof,
    // Use the same scope as the one you specified with the request function
    scope: "identity",
    // Enable dev mode if you want to use mock passports, otherwise keep it false
    devMode: true,
  });
        
  
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
      setVerification: (adult: boolean, country: string, gender: string, verifierParams: SolidityVerifierParameters) => Promise<any>;
    };

    setProgress('Submitting verification data to blockchain...');
    const tx = await contract.setVerification(adult, country, gender, verifierParams);
    
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
}

/**
 * Fetch verification data for a user from the ZKPassport verifier contract
 * @param address The wallet address of the user to fetch verification data for
 * @returns Promise resolving to an object containing adult status, country, and gender, or null if not found
 */
export const getVerification = async (address: string): Promise<{ adult: boolean; country: string; gender: string } | null> => {
  try {
    const provider = new BrowserProvider(window.ethereum as any);
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider) as unknown as {
      getVerification: (address: string) => Promise<[boolean, string, string]>;
    };
    
    const [adult, country, gender] = await contract.getVerification(address);
    return { adult, country, gender };
  } catch (error) {
    console.error('Error fetching verification data:', error);
    return null;
  }
};