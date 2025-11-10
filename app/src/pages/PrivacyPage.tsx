import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, FileText } from 'lucide-react';

const PrivacyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-cyber-dark">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto bg-black/40 border-cyber-muted/30">
          <CardHeader>
            {/* Toggle between Terms and Privacy */}
            <div className="flex items-center gap-2 mb-6">
              <Button
                variant="outline"
                className="flex-1 border-cyber-muted/30 text-cyber-neutral hover:bg-cyber-muted/30 hover:text-white font-mono"
                onClick={() => navigate('/terms')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Terms of Use
              </Button>
              <Button
                variant="default"
                className="flex-1 bg-cyber-accent hover:bg-cyber-accent/80 text-black font-mono"
                disabled
              >
                <Shield className="w-4 h-4 mr-2" />
                Privacy Policy
              </Button>
            </div>

            <div className="flex items-center space-x-3 mb-2">
              <Shield className="w-8 h-8 text-cyber-accent" />
              <CardTitle className="text-3xl font-mono text-white">Privacy Policy</CardTitle>
            </div>
            <CardDescription className="text-cyber-neutral">
              Last updated: 7 November 2025
            </CardDescription>
          </CardHeader>
          <CardContent className="prose prose-invert prose-sm max-w-none">
            <div className="space-y-6 text-cyber-neutral leading-relaxed">
              <p>
                This Privacy Policy is intended to inform users of our approach to privacy in respect of this website ("Website"). In this regard, if you are visiting our Website or interacting with the Website, this Privacy Policy applies to you.
              </p>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">Who we are</h2>
                <p>
                  For the purposes of this Privacy Policy and the collection and processing of personal data as a controller, the relevant entity is the Logos Collective Association, which has its registered office in Zug and its legal domicile address at:
                </p>
                <div className="pl-4 border-l-2 border-cyber-accent/30 my-4">
                  <p className="mb-1">Logos Collective Association</p>
                  <p className="mb-1">c/o PST Consulting GmbH</p>
                  <p className="mb-1">Baarerstrasse 10</p>
                  <p className="mb-1">6300 Zug</p>
                  <p>Switzerland</p>
                </div>
                <p>
                  Whenever we refer to "Logos", "we" or other similar references, we are referring to the Logos Collective Association.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">We limit the collection and processing of personal data from your use of the Website</h2>
                <p>
                  We aim to limit the collection and processing of personal data from users of the Website. We only collect and process certain personal data for specific purposes and where we have the legal basis to do so under applicable privacy legislation. We will not collect or process any personal data that we don't need and where we do store any personal data, we will only store it for the least amount of time needed for the indicated purpose.
                </p>
                <p>In this regard, the information requested and received by us will be used for, but not limited to:</p>
                <ul className="list-disc pl-6 space-y-2 my-4">
                  <li>Providing you with access to certain functionalities or features of the Website;</li>
                  <li>Any other action necessary to fulfil our obligations under the Terms of Use and Privacy Policy.</li>
                </ul>
                <p>Currently, we process the following personal data from your use of the Website:</p>
                <ul className="list-disc pl-6 space-y-2 my-4">
                  <li>The user's connected wallet address (e.g., Bitcoin or Ethereum wallet address);</li>
                  <li>Credential verification, depending on the network you use:
                    <ul className="list-disc pl-6 space-y-1 mt-2">
                      <li>If you connect a Bitcoin wallet, we process your Operator Ordinal status to verify eligibility;</li>
                      <li>If you connect an Ethereum wallet, we process your ENS ownership to verify eligibility;</li>
                    </ul>
                  </li>
                  <li>ENS name or similar identifier, if publicly associated with your wallet address;</li>
                  <li>Limited interaction data insofar as necessary to display features in the Website interface.</li>
                </ul>
                <p>
                  Your personal data will be processed by us in our database as long as it complies with applicable privacy legislation regarding each type of information. We can only use this personal data for any of the purposes described in this privacy policy.
                </p>
                <p>
                  Your use of the Website may store certain information locally on your device to enable functionality. This may include (i) posts and comments, (ii) user identities and profile preferences, (iii) bookmarks and votes, and (iv) UI state and settings. Such information is never transmitted to or collected by Logos.
                </p>
                <p>
                  You can permanently delete such local data at any time by using the "Clear Local Database" option in OpChan. This will remove all locally stored data from your browser or device. This cannot be undone.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">Personal data sharing with third party service providers</h2>
                <p>
                  We may share personal data with third party service providers to support the functionality of the Website. The personal data shared might include your wallet address. Such third party service providers act as data processors on our behalf and are only permitted to process personal data in accordance with our instructions and for the purposes specified above.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">Third party processing of personal data</h2>
                <p>
                  In addition to our limited collection of personal data, third parties may collect or process personal data as a result of the Website making use of certain features or to provide certain content. To the extent you interact with such third party content or features, their respective privacy policies will apply.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">Security measures we take in respect of the Website</h2>
                <p>
                  As a general approach, we take data security seriously and we have implemented a variety of security measures on the Website to maintain the safety of your personal data when you submit such information to us.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">Exporting data outside the European Union and Switzerland</h2>
                <p>
                  We are obliged to protect the privacy of personal data that you may have submitted in the unlikely event that we export your personal data to places outside the European Union or Switzerland. This means that personal data will only be processed in countries or by parties that provide an adequate level of protection as deemed by Switzerland or the European Commission. Otherwise, we will use other forms of protections, such as specific forms of contractual clauses to ensure such personal data is provided the same protection as required in Switzerland or Europe. In any event, the transmission of personal data outside the European Union and Switzerland will always occur in conformity with applicable privacy legislation.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">Your choices and rights</h2>
                <p>
                  As explained in this Privacy Policy, we limit our collection and processing of your personal data wherever possible. Nonetheless, you still have certain choices and rights in respect of the personal data which we do collect and process. As laid out in relevant privacy legislation, you have the right to:
                </p>
                <ul className="list-disc pl-6 space-y-2 my-4">
                  <li>Ask us to correct or update your personal data (where reasonably possible);</li>
                  <li>Ask us to remove your personal data from our systems;</li>
                  <li>Ask us for a copy of your personal data, which may also be transferred to another data controller at your request;</li>
                  <li>Withdraw your consent to process your personal data (only if consent was asked for a processing activity), which only affects processing activities that are based on your consent and doesn't affect the validity of such processing activities before you have withdrawn your consent;</li>
                  <li>Object to the processing of your personal data; and</li>
                  <li>File a complaint with the Federal Data Protection and Information Commissioner (FDPIC), if you believe that your personal data has been processed unlawfully.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">Third party links</h2>
                <p>
                  On this Website, you may come across links to third party websites. These third party sites have separate and independent privacy policies. We therefore have no responsibility or liability for the content and activities of these third party websites.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">This Privacy Policy might change</h2>
                <p>
                  We may modify or replace any part of this Privacy Policy at any time and without notice. Please check the Website periodically for any changes. The new Privacy Policy will be effective immediately upon its posting on our Website.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">Contact information</h2>
                <p>
                  To the extent that you have any questions about the Privacy Policy, please contact us at legal@free.technology.
                </p>
                <p className="text-cyber-neutral/60 text-xs mt-4">
                  This document is licensed under CC-BY-SA.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPage;


