import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Shield } from 'lucide-react';

const TermsPage: React.FC = () => {
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
                variant="default"
                className="flex-1 bg-cyber-accent hover:bg-cyber-accent/80 text-black font-mono"
                disabled
              >
                <FileText className="w-4 h-4 mr-2" />
                Terms of Use
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-cyber-muted/30 text-cyber-neutral hover:bg-cyber-muted/30 hover:text-white font-mono"
                onClick={() => navigate('/privacy')}
              >
                <Shield className="w-4 h-4 mr-2" />
                Privacy Policy
              </Button>
            </div>

            <div className="flex items-center space-x-3 mb-2">
              <FileText className="w-8 h-8 text-cyber-accent" />
              <CardTitle className="text-3xl font-mono text-white">Terms of Use</CardTitle>
            </div>
            <CardDescription className="text-cyber-neutral">
              Last updated: 7 November 2025
            </CardDescription>
          </CardHeader>
          <CardContent className="prose prose-invert prose-sm max-w-none">
            <div className="space-y-6 text-cyber-neutral leading-relaxed">
              <p>
                These website terms of use ("Terms") are entered into by you and us, and they govern your access and use of this Website, including any content and functionality contained in the Website.
              </p>
              <p>
                It is your responsibility to read these Terms carefully before your use of the Website and your use of the Website means you have agreed to be bound and comply with these Terms.
              </p>
              <p>
                If you do not agree with these Terms, you must not access or use the Website.
              </p>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">Who we are</h2>
                <p>
                  For the purposes of these Terms, the relevant entity is the Logos Collective Association, which has its registered office in Zug and its legal domicile address at:
                </p>
                <div className="pl-4 border-l-2 border-cyber-accent/30 my-4">
                  <p className="mb-1">Logos Collective Association</p>
                  <p className="mb-1">c/o PST Consulting GmbH</p>
                  <p className="mb-1">Baarerstrasse 10</p>
                  <p className="mb-1">6300 Zug</p>
                  <p>Switzerland</p>
                </div>
                <p>
                  Whenever we refer to "Logos", "we", "us" or any other similar references, we are referring to the Logos Collective Association.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">The Website</h2>
                <p>
                  The Website provides an opportunity for users of the Website to access and interact with OpChan.
                </p>
                <p>
                  You shall only use the Website for lawful purposes, in compliance with applicable legal frameworks and in accordance with these Terms. In particular, you agree not to, whether in relation to the Website or any activities you engage in or through the Website:
                </p>
                <ul className="list-disc pl-6 space-y-2 my-4">
                  <li>engage in, promote, or contribute to any activities in violation of applicable law or violation of legal rights of any other individual or third party, including the rights of Logos and its affiliates;</li>
                  <li>copy, distribute, sell, licence, create derivative works from, or in any other way exploit copyrighted material, trademarks, or any intellectual property rights of others;</li>
                  <li>interfere with or disrupt the integrity, safety, security, availability or performance of the Website;</li>
                  <li>reverse engineer, decompile, or disassemble any software used, or introduce any harmful code (e.g., viruses, worms, or spyware) intended to infiltrate or damage the Website or any connected systems;</li>
                  <li>interfere, disrupt, negatively affect, or inhibit other users from their use of the Website;</li>
                  <li>use a wallet other than your own without permission; or</li>
                  <li>misrepresent your relationship with Logos or its affiliates.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">About OpChan</h2>
                <p>
                  OpChan is a decentralised forum application powered by the Waku protocol that allows users to create, manage, and participate in community forums known as "Cells".
                </p>
                <p>
                  Waku is a decentralised, peer-to-peer communications protocol that relies on a distributed network of independently operated nodes rather than any central server. This means that there is no central party or server from which messages can be intercepted, modified or blocked. Learn more about Waku and how it works on Waku's relevant website.
                </p>
                <p>You acknowledge and agree that:</p>
                <ul className="list-disc pl-6 space-y-2 my-4">
                  <li>OpChan runs on decentralised networks outside the control of Logos;</li>
                  <li>Once messages are distributed by the Waku network, they may persist outside the Website or Logos' control;</li>
                  <li>OpChan is experimental and may break, change, or be discontinued at any time.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">Wallet Interactions and Key Delegation</h2>
                <p>
                  To access certain features of the Website, you may need to connect your digital asset wallet or address (collectively referred to as your "Wallet"). By connecting your Wallet, you acknowledge that we will not have any control over it, nor will we have access to your seed phrase, private keys, or any associated digital tokens.
                </p>
                <p>
                  We are not responsible for the transfer, safeguarding, or maintenance of your private keys or any digital tokens associated with your Wallet. You are solely responsible for your private keys and seed phrase, and if they are lost, mishandled, or stolen, the associated digital asset tokens might not be recoverable, and we will not be held liable for such losses.
                </p>
                <p>
                  We do not operate, maintain, or have custody of your Wallet contents. Therefore, we are not responsible for any issues that may arise with your Wallet. Any concerns or issues related to your Wallet should be directed to your Wallet provider, should there be one.
                </p>
                <p>
                  You acknowledge that digital tokens stored in your Wallet are at risk of loss due to various factors, including but not limited to theft, hacking (or other cyber-attacks), malware, and technical or human error.
                </p>
                <p>
                  You have the option to disconnect your Wallet from the Website at any time, however, doing so might limit your ability to make use of some functionalities available through the Website.
                </p>
                <p>
                  To reduce repetitive wallet signature prompts, the Website may allow you to delegate limited signing authority to a browser-generated key for a set duration (e.g., one week or 30 days). You may revoke or regenerate deletion at any time. We never have access to your delegated keys.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">User Content and Moderation</h2>
                <p>
                  You are solely responsible for any content you create, post, distribute via OpChan and any harm or liability that may result from such content. You represent and warrant in respect of such content that:
                </p>
                <ul className="list-disc pl-6 space-y-2 my-4">
                  <li>your content does not infringe on any intellectual property or other proprietary rights of any third party; and</li>
                  <li>you own or have the necessary permissions to use and distribute such content.</li>
                </ul>
                <p>You agree not to post content that:</p>
                <ul className="list-disc pl-6 space-y-2 my-4">
                  <li>incites harm, violence, or illegal activity;</li>
                  <li>infringes upon the intellectual property, privacy, or other rights of third parties;</li>
                  <li>violates applicable laws or regulations; or</li>
                  <li>harasses, abuses, discriminates, or disseminates false or misleading information,</li>
                </ul>
                <p>
                  Cell administrators retain the authority to moderate their Cells, including hiding content from their Cell interface, or limiting participation, consistent with any rules that might be set by them, provided these do not conflict with these Terms or applicable laws. You agree to observe any content standards or guidelines imposed by specific Cell administrators when participating therein.
                </p>
                <p>
                  You may delete your own content from the Website interface. This will remove such content from view in that interface, but because OpChan operates on decentralised networks, the content may continue to exist outside Logos' control.
                </p>
                <p>
                  You may also permanently delete data that is stored locally on your device (including posts and comments, user identities and preferences, bookmarks and votes, and UI state and settings) by using the "Clear Local Database" option. This deletion is under your sole control and cannot be performed by Logos or by Cell administrators. Once deleted locally, this data cannot be restored.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">Disclaimers</h2>
                <p>
                  Logos does not endorse or assume responsibility for any content created, posted, distributed or submitted by users on the Website, including Cells. All views and opinions expressed in Cells belong to the users who post them and do not reflect Logos' position.
                </p>
                <p>
                  The Website and OpChan are provided on an 'as is' and 'as available' basis and your use of them is at your own sole discretion and risk.
                </p>
                <p>
                  We disclaim all warranties of any kind, express or implied, including without limitation the warranties of merchantability, fitness for a particular purpose, and non-infringement of intellectual property or other violation of rights. We do not warrant or make any representations concerning the completeness, accuracy, legality, utility, reliability, suitability or availability of the use of the Website, the content on this Website or otherwise relating to the Website, or such content on any sites linked to the Website. These disclaimers will apply to the maximum extent permitted by applicable law.
                </p>
                <p>
                  We make no claims that the Website or any of its content is accessible, legally compliant or appropriate in your jurisdiction. Your access or use of the Website is at your own sole discretion and you are solely responsible for complying with any applicable local laws.
                </p>
                <p>
                  The content herein or as accessible through this Website is intended to be made available for informational purposes only and should not be considered as creating any expectations or forming the basis of any contract, commitment or binding obligation with us. No information herein shall be considered to contain or be relied upon as a promise, representation, warranty or guarantee, whether express or implied and whether as to the past, present or the future in relation to the projects and matters described herein.
                </p>
                <p>
                  The information contained herein does not constitute financial, legal, tax, or other advice and should not be treated as such.
                </p>
                <p>
                  Nothing in this Website should be construed by you as an offer to buy or sell, or soliciting any offer to buy or sell any tokens or any security.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">Forward looking statements</h2>
                <p>
                  The Website may also contain forward-looking statements that are based on current expectations, estimates, forecasts, assumptions and projections about the technology, industry and markets in general.
                </p>
                <p>
                  The forward looking statements, which may include statements about the roadmap, project descriptions, technical details, functionalities, features, the development and use of tokens by projects, and any other statements related to such matters or as accessible through this website are subject to a high degree of risk and uncertainty. The forward looking statements are subject to change based on, among other things, market conditions, technical developments, and regulatory environment. The actual development and results, including the order and the timeline, might vary from what's presented. The information contained herein is a summary and does not purport to be accurate, reliable or complete and we bear no responsibility for the accuracy, reliability or completeness of information contained herein. Because of the high degree of risk and uncertainty described above, you should not place undue reliance on any matters described in this website or as accessible through this website.
                </p>
                <p>
                  While we aim to update our website regularly, all information, including the timeline and the specifics of each stage, is subject to change and may be amended or supplemented at any time, without notice and at our sole discretion.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">Intellectual property rights</h2>
                <p>
                  This Website and all contents on the Website, including, among others, text, graphics, logos, images, and software, is the property of Logos and protected by international copyright laws. You shall not use, reproduce, modify, distribute or republish any content on this Website without prior written permission from Logos.
                </p>
                <p>
                  Content you create, post, distribute or submit on the Website remains your property, however in doing so, you grant Logos a non-exclusive, royalty-free license to use, display and reproduce such content solely to operate, maintain and promote the Website. This licence ends when you remove your content, though copies may be retained as legally required.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">Third party website links</h2>
                <p>
                  To the extent the Website provides any links to a third party website, then their terms and conditions, including privacy policies, govern your use of those third party websites. By linking such third party websites, Logos does not represent or imply that it endorses or supports such third party websites or content therein, or that it believes such third party websites and content therein to be accurate, useful or non-harmful. We have no control over such third party websites and will not be liable for your use of or activities on any third party websites accessed through the Website. If you access such third party websites through the Website, it is at your own risk and you are solely responsible for your activities on such third party websites.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">Limitation of liability</h2>
                <p>
                  We will not be held liable to you under any contract, negligence, strict liability, or other legal or equitable theory for any lost profits, cost of procurement for substitute services, or any special, incidental, or consequential damages related to, arising from, or in any way connected with these Terms, the Website, the content on the Website, or your use of the Website, even if we have been advised of the possibility of such damages. In any event, our aggregate liability for such claims is limited to EUR 100 (one hundred Euros). This limitation of liability will apply to the maximum extent permitted by applicable law.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">Indemnity</h2>
                <p>
                  You shall indemnify us and hold us harmless from and against any and all claims, damages and expenses, including attorneys' fees, arising from or related to your use of the Website, the content on the Website, including without limitation your violation of these Terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">Modifications</h2>
                <p>
                  We may modify or replace any part of these Terms at any time and without notice. You are responsible for checking the Website periodically for any changes. The new Terms will be effective immediately upon its posting on the Website.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">Governing law</h2>
                <p>
                  Swiss law governs these Terms and any disputes between you and us, whether in court or arbitration, without regard to conflict of laws provisions.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">Disputes</h2>
                <p>
                  In these Terms, "dispute" has the broadest meaning enforceable by law and includes any claim you make against or controversy you may have in relation to these Terms, the Website, the content on the Website, or your use of the Website.
                </p>
                <p>
                  We prefer arbitration over litigation as we believe it meets our principle of resolving disputes in the most effective and cost effective manner. You are bound by the following arbitration clause, which waives your right to litigation and to be heard by a judge. Please note that court review of an arbitration award is limited. You also waive all your rights to a jury trial (if any) in any and all jurisdictions.
                </p>
                <p>
                  If a (potential) dispute arises, you must first use your reasonable efforts to resolve it amicably with us. If these efforts do not result in a resolution of such dispute, you shall then send us a written notice of dispute setting out (i) the nature of the dispute, and the claim you are making; and (ii) the remedy you are seeking.
                </p>
                <p>
                  If we and you are unable to further resolve this dispute within sixty (60) calendar days of us receiving this notice of dispute, then any such dispute will be referred to and finally resolved by you and us through an arbitration administered by the Swiss Chambers' Arbitration Institution in accordance with the Swiss Rules of International Arbitration for the time being in force, which rules are deemed to be incorporated herein by reference. The arbitral decision may be enforced in any court. The arbitration will be held in Zug, Switzerland, and may be conducted via video conference virtual/online methods if possible. The tribunal will consist of one arbitrator, and all proceedings as well as communications between the parties will be kept confidential. The language of the arbitration will be in English. Payment of all relevant fees in respect of the arbitration, including filing, administration and arbitrator fees will be in accordance with the Swiss Rules of International Arbitration.
                </p>
                <p>
                  Regardless of any applicable statute of limitations, you must bring any claims within one year after the claim arose or the time when you should have reasonably known about the claim. You also waive the right to participate in a class action lawsuit or a classwide arbitration against us.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-mono text-white mt-8 mb-4">About these Terms</h2>
                <p>
                  These Terms cover the entire agreement between you and us in connection with the Website and supersede all prior and contemporaneous understandings, agreements, representations and warranties, both written and oral, with respect to the Website.
                </p>
                <p>
                  The captions and headings identifying sections and subsections of these Terms are for reference only and do not define, modify, expand, limit, or affect the interpretation of any provisions of these Terms.
                </p>
                <p>
                  If any part of these Terms is held invalid or unenforceable, that part will be severable from these Terms, and the remaining portions will remain in full force and effect. If we fail to enforce any of these Terms, that does not mean that we have waived our right to enforce them.
                </p>
                <p>
                  If you have any specific questions about these Terms, please contact us at legal@free.technology.
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

export default TermsPage;


