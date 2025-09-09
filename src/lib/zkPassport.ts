import { EU_COUNTRIES, ZKPassport } from '@zkpassport/sdk';

export const verifyAge = async (setProgress: (status:string) => void, setUrl: (url:string) => void): Promise<boolean> => {
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
            console.log("Starting age verification with zkPassport");
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
                resolve(false);
            });

            onError((error) => {
                setProgress(`Age verification error: ${error}`);
                console.error("Age verification error", error);
                resolve(false);
            });

            onResult(({ verified, uniqueIdentifier, result }) => {
                console.log("Age verification callback", verified, uniqueIdentifier, result);
                try {
                    console.log("Age verification result", verified, result);
                    if (verified) {
                        const isOver18 = result.age?.gte?.result;
                        setProgress("Age verification completed successfully");
                        resolve(isOver18 || false);
                        console.log("User is 18+ years old", isOver18);
                    } else {
                        setProgress("Age verification failed");
                        resolve(false);
                    }
                } catch (error) {
                    console.error("Age verification result processing error", error);
                    setProgress(`Age verification result processing error: ${error}`);
                    resolve(false);
                } finally {
                    setUrl('');
                    setProgress('');
                }
            });
        } catch (error) {
            console.error("Age verification exception", error);
            setProgress(`Age verification exception: ${error}`);
            reject(error);
        }
    });
}