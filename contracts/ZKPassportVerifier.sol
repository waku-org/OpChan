// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

struct ProofVerificationParams {
  bytes32 vkeyHash;
  bytes proof;
  bytes32[] publicInputs;
  bytes committedInputs;
  uint256[] committedInputCounts;
  uint256 validityPeriodInSeconds;
  string domain;
  string scope;
  bool devMode;
}

interface IZKPassportVerifier {
    // Verify the proof
    function verifyProof(ProofVerificationParams calldata params) external returns (bool verified, bytes32 uniqueIdentifier);
    
    function verifyScopes(bytes32[] calldata publicInputs, string calldata domain, string calldata scope) external view returns (bool);
}

interface IZKVerifier {
    function verifyProof(ProofVerificationParams calldata params) external returns (bool verified, bytes32 uniqueIdentifier);
}

/**
 * @title ZKPassportVerifier
 * @notice Simplified contract to store verification outputs for adult status, country, and gender
 */
contract ZKPassportVerifier {
    // Structure to store user verification data
    struct Verification {
        bool adult;           // Whether user is 18+
        string country;       // User's country of nationality
        string gender;        // User's gender
    }

    // Mapping from user address to their verification data
    mapping(address => Verification) public verifications;
    
    // Mapping to track used unique identifiers
    mapping(bytes32 => bool) public usedUniqueIdentifiers;
    
    // Address of the ZKVerifier contract
    IZKVerifier public zkVerifier;
    
    /**
     * @notice Constructor that sets the ZKVerifier contract address
     * @param _zkVerifier Address of the ZKVerifier contract
     */
    constructor(address _zkVerifier) {
        require(_zkVerifier != address(0), "Invalid ZKVerifier address");
        zkVerifier = IZKVerifier(_zkVerifier);
    }

    // Event emitted when verification data is updated
    event VerificationUpdated(
        address indexed user,
        bool adult,
        string country,
        string gender
    );

    /**
     * @notice Update verification data for the sender
     * @param adult Whether the sender is 18+
     * @param country The sender's country of nationality
     * @param gender The sender's gender
     * @param params Proof verification parameters
     */
    function setVerification(
        bool adult,
        string calldata country,
        string calldata gender,
        ProofVerificationParams calldata params
    ) external {
        // Verify the proof first using the ZKVerifier contract
        (bool verified, bytes32 uniqueIdentifier) = zkVerifier.verifyProof(params);
        
        // Revert if proof is not valid
        require(verified, "Proof verification failed");
        
        // Check if this unique identifier has already been used
        require(!usedUniqueIdentifiers[uniqueIdentifier], "Unique identifier already used");
        
        // Mark this unique identifier as used
        usedUniqueIdentifiers[uniqueIdentifier] = true;
        
        // Store the verification data
        verifications[msg.sender] = Verification({
            adult: adult,
            country: country,
            gender: gender
        });

        emit VerificationUpdated(msg.sender, adult, country, gender);
    }

    /**
     * @notice Get verification data for a user
     * @param user The address of the user
     * @return adult Whether the user is 18+
     * @return country The user's country of nationality
     * @return gender The user's gender
     */
    function getVerification(address user) 
        external view 
        returns (bool, string memory, string memory) 
    {
        Verification storage verification = verifications[user];
        return (verification.adult, verification.country, verification.gender);
    }
}